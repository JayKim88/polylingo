import {
  TranslationResult,
  TranslationMeaning,
  SUPPORTED_LANGUAGES,
} from '../types/dictionary';
import { PronunciationService } from './pronunciationService';
import NetInfo from '@react-native-community/netinfo';
import { captureNetworkError } from './sentryUtils';

const MYMEMORY_BASE_URL = 'https://mymemory.translated.net/api/get';
const LIBRETRANSLATE_BASE_URL =
  process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL ?? '';
const GOOGLE_TRANSLATE_URL =
  'https://translate.googleapis.com/translate_a/single';

// Google uses different codes for some languages
const GOOGLE_LANG_MAP: Record<string, string> = {
  zh: 'zh-TW', // Traditional Chinese
};

// Cache interface
interface CacheEntry {
  translation: string;
  meanings?: TranslationMeaning[];
  pronunciation?: string;
  timestamp: number;
}

type getFromCacheProps = {
  translation: string;
  meanings?: TranslationMeaning[];
  pronunciation?: string;
};

export class TranslationAPI {
  // In-memory cache for translations
  private static translationCache = new Map<string, CacheEntry>();
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

  private static getCacheKey(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): string {
    return `${text.toLowerCase()}_${sourceLanguage}_${targetLanguage}`;
  }

  private static isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION;
  }

  private static getFromCache(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): getFromCacheProps | null {
    const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
    const entry = this.translationCache.get(key);

    if (entry && this.isCacheValid(entry)) {
      return {
        translation: entry.translation,
        meanings: entry.meanings,
        pronunciation: entry.pronunciation,
      };
    }

    if (entry) {
      this.translationCache.delete(key);
    }

    return null;
  }

  // Save to cache (only when online)
  private static async saveToCache(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    translation: string,
    meanings?: TranslationMeaning[],
    pronunciation?: string
  ): Promise<void> {
    // Check network connectivity before caching
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('🚫 Skipping cache save - offline mode');
      return;
    }

    const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
    this.translationCache.set(key, {
      translation,
      meanings,
      pronunciation,
      timestamp: Date.now(),
    });
  }

  private static cleanupCache(): void {
    if (!this.translationCache) {
      return;
    }
    const now = Date.now();
    for (const [key, entry] of this.translationCache.entries()) {
      if (now - entry.timestamp >= this.CACHE_DURATION) {
        this.translationCache.delete(key);
      }
    }
  }

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

  static async translateWithGoogle(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<{ translation: string; pronunciation?: string } | null> {
    try {
      const sl = GOOGLE_LANG_MAP[sourceLanguage] ?? sourceLanguage;
      const tl = GOOGLE_LANG_MAP[targetLanguage] ?? targetLanguage;

      const params = new URLSearchParams([
        ['client', 'gtx'],
        ['q', text],
        ['sl', sl],
        ['tl', tl],
        ['dj', '1'],
        ['hl', tl],
        ['dt', 't'],
        ['dt', 'rm'], // 발음 로마자 표기
      ]);

      const response = await fetch(`${GOOGLE_TRANSLATE_URL}?${params}`);
      if (!response.ok) return null;

      const data = await response.json();
      const sentences: { trans?: string; translit?: string }[] = data?.sentences ?? [];

      const translation = sentences
        .filter((s) => 'trans' in s)
        .map((s) => s.trans)
        .join('')
        .replace(/\n /g, '\n')
        .trim();

      if (!translation) return null;

      const pronunciation = sentences
        .map((s) => s.translit ?? '')
        .join('')
        .trim() || undefined;

      console.log(`✅ Google Translate: ${sourceLanguage}→${targetLanguage} "${text.slice(0, 20)}" → "${translation.slice(0, 20)}"${pronunciation ? ` [${pronunciation.slice(0, 20)}]` : ''}`);

      return { translation, pronunciation };
    } catch (error) {
      console.log('💥 Google Translate error:', error);
      return null;
    }
  }

  static async translateWithServer(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<{ translation: string; pronunciation?: string }> {
    try {
      const sourceLangName =
        SUPPORTED_LANGUAGES.find((v) => v.code === sourceLanguage)?.name ||
        sourceLanguage;
      const targetLangName =
        SUPPORTED_LANGUAGES.find((v) => v.code === targetLanguage)?.name ||
        targetLanguage;

      // Use server-side API endpoint
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      const apiUrl = baseUrl ? `${baseUrl}/api/translate` : '/api/translate';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_TRANSLATE_API_KEY || '',
        },
        body: JSON.stringify({
          text,
          sourceLanguage: sourceLangName,
          targetLanguage: targetLangName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        translation: result.translation || '',
        pronunciation: result.pronunciation,
      };
    } catch (error) {
      console.log('💥 Server (OpenAI) translation error:', error);

      captureNetworkError(error as Error, {
        url: `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/translate`,
        method: 'POST',
        requestBody: {
          textLength: text.length,
          sourceLanguage,
          targetLanguage,
        },
        api_provider: 'OpenAI',
      });

      return { translation: '' };
    }
  }

  // 메인 번역 함수
  static async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    _options?: Record<string, unknown>
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
          await this.saveToCache(
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

    // 1차: Google Translate (무료, 발음 포함)
    const googleResult = await this.translateWithGoogle(text, sourceLanguage, targetLanguage);
    if (googleResult) {
      translation = googleResult.translation;
      pronunciation = googleResult.pronunciation || null;
    }

    // 2차: MyMemory — Google 실패 시
    if (!translation) {
      console.log('🔄 Google failed, falling back to MyMemory...');
      translation = await this.translateWithMyMemory(text, sourceLanguage, targetLanguage);
    }

    if (!translation) {
      return { translation: '번역을 찾을 수 없습니다' };
    }

    const result: {
      translation: string;
      pronunciation?: string;
    } = { translation };

    if (pronunciation) {
      result.pronunciation = pronunciation;
    }

    await this.saveToCache(
      text,
      sourceLanguage,
      targetLanguage,
      translation,
      undefined,
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

  static deleteCacheFor(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ) {
    const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
    this.translationCache.delete(key);
  }
}
