import { TranslationResult, TranslationMeaning } from '../types/dictionary';
import { PronunciationService } from './pronunciationService';
import { translateWithClaude } from './claudeAPI';

const MYMEMORY_BASE_URL = 'https://mymemory.translated.net/api/get';
const LIBRETRANSLATE_BASE_URL =
  process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL ?? '';

// Cache interface
interface CacheEntry {
  translation: string;
  meanings?: TranslationMeaning[];
  pronunciation?: string;
  timestamp: number;
}

export class TranslationAPI {
  // In-memory cache for translations
  private static translationCache = new Map<string, CacheEntry>();
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

  // Generate cache key
  private static getCacheKey(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): string {
    return `${text.toLowerCase()}_${sourceLanguage}_${targetLanguage}`;
  }

  // Check if cache entry is valid
  private static isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  // Get from cache
  private static getFromCache(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): {
    translation: string;
    meanings?: TranslationMeaning[];
    pronunciation?: string;
  } | null {
    const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
    const entry = this.translationCache.get(key);

    if (entry && this.isCacheValid(entry)) {
      console.log('💾 Using cached translation');
      return {
        translation: entry.translation,
        meanings: entry.meanings,
        pronunciation: entry.pronunciation,
      };
    }

    // Remove expired entry
    if (entry) {
      this.translationCache.delete(key);
    }

    return null;
  }

  // Save to cache
  private static saveToCache(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    translation: string,
    meanings?: TranslationMeaning[],
    pronunciation?: string
  ): void {
    const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
    this.translationCache.set(key, {
      translation,
      meanings,
      pronunciation,
      timestamp: Date.now(),
    });
  }

  // Clear expired cache entries
  private static cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.translationCache.entries()) {
      if (now - entry.timestamp >= this.CACHE_DURATION) {
        this.translationCache.delete(key);
      }
    }
  }
  // LibreTranslate API를 사용한 번역 (가장 정확함)
  static async translateWithLibreTranslate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string | null> {
    try {
      const url = LIBRETRANSLATE_BASE_URL.includes('localhost')
        ? `${LIBRETRANSLATE_BASE_URL}/translate`
        : LIBRETRANSLATE_BASE_URL;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text',
        }),
      });

      const data = await response.json();

      if (data.translatedText) {
        return data.translatedText;
      }

      return null;
    } catch (error) {
      console.log(
        `💥 LibreTranslate error for ${sourceLanguage}->${targetLanguage}:`,
        error
      );
      return null;
    }
  }

  // MyMemory API를 사용한 번역
  static async translateWithMyMemory(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string | null> {
    try {
      const langPair = `${sourceLanguage}|${targetLanguage}`;
      const url = `${MYMEMORY_BASE_URL}?q=${encodeURIComponent(
        text
      )}&langpair=${langPair}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.responseStatus === 200 && data.responseData) {
        let translatedText = data.responseData.translatedText;

        // Decode any URL encoding that might have been applied
        try {
          translatedText = decodeURIComponent(translatedText);
        } catch (e) {
          // If decoding fails, use original text
        }

        return translatedText;
      }

      return null;
    } catch (error) {
      console.log(
        `💥 Translation error for ${sourceLanguage}->${targetLanguage}:`,
        error
      );
      return null;
    }
  }

  // HTML 태그 제거 및 텍스트 정리
  static cleanText(text: string): string {
    if (!text) return '';

    return text
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&[^;]+;/g, '') // HTML 엔티티 제거
      .replace(/\s+/g, ' ') // 연속된 공백을 하나로
      .trim(); // 앞뒤 공백 제거
  }

  // Wiktionary API로 실제 단어 의미 조회
  static async fetchWordDefinitions(
    word: string,
    language: string = 'en'
  ): Promise<TranslationMeaning[]> {
    try {
      // Wiktionary API 사용
      const wikiLang = language === 'ko' ? 'ko' : 'en';
      const response = await fetch(
        `https://${wikiLang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(
          word
        )}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      const meanings: TranslationMeaning[] = [];

      // Wiktionary 응답에서 의미 추출 (최대 5개)
      let meaningCount = 0;
      if (data[wikiLang] && Array.isArray(data[wikiLang])) {
        for (const entry of data[wikiLang]) {
          if (meaningCount >= 5) break;

          if (entry.definitions && Array.isArray(entry.definitions)) {
            for (const definition of entry.definitions) {
              if (meaningCount >= 5) break;

              const cleanDefinition = this.cleanText(
                definition.definition || definition
              );

              // 빈 정의는 건너뛰기
              if (!cleanDefinition || cleanDefinition.length < 3) continue;

              meanings.push({
                translation: cleanDefinition,
                type: entry.partOfSpeech || 'general',
              });
              meaningCount++;
            }
          }
        }
      }

      return meanings;
    } catch (error) {
      console.log(`Wiktionary API error for ${word}:`, error);
      return [];
    }
  }

  // 번역된 단어의 다중 의미 조회 (동적 생성)
  static async generateWordMeanings(
    translatedWord: string,
    targetLanguage: string
  ): Promise<TranslationMeaning[] | []> {
    const apiMeanings = await this.fetchWordDefinitions(
      translatedWord,
      targetLanguage
    );
    if (apiMeanings.length > 0) {
      return apiMeanings;
    }

    return [];
  }

  static async translateWithClaude(
    text: string,
    targetLanguage: string
  ): Promise<{ translation: string; pronunciation?: string }> {
    try {
      const result = await translateWithClaude(text, targetLanguage);
      return result;
    } catch (error) {
      console.log('💥 Claude API error:', error);
      return { translation: '' };
    }
  }

  // 메인 번역 함수
  static async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    options?: { provider?: 'claude' | 'default' }
  ): Promise<{
    translation: string;
    meanings?: TranslationMeaning[];
    pronunciation?: string;
  }> {
    if (!text.trim()) return { translation: '' };

    // 같은 언어인 경우 원문 반환
    if (sourceLanguage === targetLanguage) {
      return { translation: text };
    }

    // 캐시에서 확인
    const cached = this.getFromCache(text, sourceLanguage, targetLanguage);
    if (cached) {
      // Check if cached translation is URL-encoded and fix it
      let translation = cached.translation;
      if (translation.includes('%')) {
        try {
          const decoded = decodeURIComponent(translation);

          // Update cache with fixed version
          this.saveToCache(
            text,
            sourceLanguage,
            targetLanguage,
            decoded,
            cached.meanings,
            cached.pronunciation
          );

          return {
            translation: decoded,
            meanings: cached.meanings,
            pronunciation: cached.pronunciation,
          };
        } catch (e) {
          console.log(
            '❌ Failed to decode cached translation, clearing cache entry'
          );
          const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
          this.translationCache.delete(key);
          // Continue to fetch fresh translation
        }
      } else {
        return cached;
      }
    }

    // 캐시 정리 (10%의 확률로 실행)
    if (Math.random() < 0.1) {
      this.cleanupCache();
    }

    let translation: string | null = null;
    let pronunciation: string | null = null;
    if (options?.provider === 'claude') {
      const result = await this.translateWithClaude(text, targetLanguage);
      translation = result.translation;
      pronunciation = result.pronunciation || null;
    } else if (LIBRETRANSLATE_BASE_URL) {
      console.log('🔄 Falling back to LibreTranslate...');
      translation = await this.translateWithLibreTranslate(
        text,
        sourceLanguage,
        targetLanguage
      );
    }

    if (translation === null) {
      return { translation: '번역을 찾을 수 없습니다' };
    }

    // 번역된 단어의 다중 의미 조회 (항상 실행)
    const meanings = await this.generateWordMeanings(
      translation.toLowerCase(),
      targetLanguage
    );

    pronunciation =
      pronunciation ||
      (await PronunciationService.getPronunciation(
        translation,
        targetLanguage
      ));

    const result: {
      translation: string;
      meanings?: TranslationMeaning[];
      pronunciation?: string;
    } = { translation };

    if (meanings.length > 0) {
      result.meanings = meanings;
    }

    if (pronunciation) {
      result.pronunciation = pronunciation;
    }

    // 성공한 번역을 캐시에 저장
    this.saveToCache(
      text,
      sourceLanguage,
      targetLanguage,
      translation,
      meanings,
      pronunciation || undefined
    );

    return result;
  }

  static async translateToMultipleLanguages(
    text: string,
    sourceLanguage: string,
    targetLanguages: string[]
  ): Promise<TranslationResult[]> {
    if (!text.trim()) return [];

    const translationPromises = targetLanguages.map(async (targetLang) => {
      try {
        const result = await this.translate(text, sourceLanguage, targetLang);

        // 번역 품질 평가
        let confidence = 0.9;
        if (result.translation === '번역을 찾을 수 없습니다') {
          confidence = 0;
        } else if (
          sourceLanguage === targetLang &&
          result.translation === text
        ) {
          // 같은 언어로의 번역은 필터링
          confidence = 0;
        }

        return {
          sourceLanguage,
          targetLanguage: targetLang,
          sourceText: text,
          translatedText: result.translation,
          meanings: result.meanings,
          confidence,
          timestamp: Date.now(),
          pronunciation: result.pronunciation,
        };
      } catch (error) {
        return {
          sourceLanguage,
          targetLanguage: targetLang,
          sourceText: text,
          translatedText: '번역 서비스를 사용할 수 없습니다',
          confidence: 0,
          timestamp: Date.now(),
        };
      }
    });

    const results = await Promise.all(translationPromises);

    // 성공한 번역만 반환 (confidence > 0)
    const filteredResults = results.filter((result) => result.confidence > 0);

    return filteredResults;
  }

  // Cache management methods
  static getCacheSize(): number {
    return this.translationCache.size;
  }

  static clearCache(): void {
    console.log('🗑️ Clearing translation cache');
    this.translationCache.clear();
  }

  static clearCacheAndLog(): void {
    const size = this.translationCache.size;
    this.translationCache.clear();
    console.log(`🗑️ Cleared ${size} cached translations`);
  }

  static getCacheStats(): {
    size: number;
    entries: Array<{ key: string; timestamp: number; isExpired: boolean }>;
  } {
    const entries = Array.from(this.translationCache.entries()).map(
      ([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        isExpired: !this.isCacheValid(entry),
      })
    );

    return {
      size: this.translationCache.size,
      entries,
    };
  }

  static deleteCacheFor(text: string, sourceLanguage: string, targetLanguage: string) {
    const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
    this.translationCache.delete(key);
  }
}
