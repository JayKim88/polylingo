import {
  TranslationResult,
  TranslationMeaning,
  SearchType,
} from '../types/dictionary';

const MYMEMORY_BASE_URL = 'https://mymemory.translated.net/api/get';
const LIBRETRANSLATE_BASE_URL =
  process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL ?? '';
const LIBRETRANSLATE_BASE_URL_OUTER = 'https://libretranslate.de/translate';

export class TranslationAPI {
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
        const translatedText = data.responseData.translatedText;

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

  // 메인 번역 함수
  static async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    searchType: SearchType
  ): Promise<{ translation: string; meanings?: TranslationMeaning[] }> {
    if (!text.trim()) return { translation: '' };

    // 같은 언어인 경우 원문 반환
    if (sourceLanguage === targetLanguage) {
      return { translation: text };
    }

    let translation: string | null = null;

    // 한국어는 MyMemory 사용, 다른 언어는 LibreTranslate 사용
    if (targetLanguage === 'ko') {
      console.log('🇰🇷 Using MyMemory for Korean translation...');
      translation = await this.translateWithMyMemory(
        text,
        sourceLanguage,
        targetLanguage
      );

      console.log('translation????', translation);
    } else {
      console.log('🌍 Using LibreTranslate for other languages...');
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

    if (meanings.length > 0) {
      return { translation, meanings };
    }

    return { translation };
  }

  static async translateToMultipleLanguages(
    text: string,
    sourceLanguage: string,
    targetLanguages: string[],
    searchType: SearchType
  ): Promise<TranslationResult[]> {
    if (!text.trim()) return [];

    const translationPromises = targetLanguages.map(async (targetLang) => {
      try {
        const result = await this.translate(
          text,
          sourceLanguage,
          targetLang,
          searchType
        );

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
          searchType,
        };
      } catch (error) {
        return {
          sourceLanguage,
          targetLanguage: targetLang,
          sourceText: text,
          translatedText: '번역 서비스를 사용할 수 없습니다',
          confidence: 0,
          timestamp: Date.now(),
          searchType,
        };
      }
    });

    const results = await Promise.all(translationPromises);

    // 성공한 번역만 반환 (confidence > 0)
    const filteredResults = results.filter((result) => result.confidence > 0);

    return filteredResults;
  }
}
