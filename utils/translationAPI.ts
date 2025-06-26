import { TranslationResult, TranslationMeaning, SUPPORTED_LANGUAGES, SearchType } from '../types/dictionary';

const MYMEMORY_BASE_URL = 'https://mymemory.translated.net/api/get';

export class TranslationAPI {
  // MyMemory API를 사용한 번역
  static async translateWithMyMemory(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string | null> {
    try {
      const langPair = `${sourceLanguage}|${targetLanguage}`;
      const url = `${MYMEMORY_BASE_URL}?q=${encodeURIComponent(text)}&langpair=${langPair}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData) {
        const translatedText = data.responseData.translatedText;
        
        // 번역이 제대로 되지 않은 경우 null 반환
        if (translatedText.toLowerCase() === text.toLowerCase()) {
          return null;
        }
        
        return translatedText;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // 단어의 중의적 의미 생성 (시뮬레이션)
  static generateWordMeanings(word: string, targetLanguage: string): TranslationMeaning[] {
    const meanings: { [key: string]: { [key: string]: TranslationMeaning[] } } = {
      '사과': {
        'en': [
          {
            translation: 'apple',
            context: '먹는 과일',
            example: 'I eat an apple every day.'
          },
          {
            translation: 'apology',
            context: '사죄, 용서를 구함',
            example: 'I owe you an apology.'
          }
        ],
        'ja': [
          {
            translation: 'りんご',
            context: '食べる果物',
            example: '毎日りんごを食べます。'
          },
          {
            translation: '謝罪',
            context: '謝ること',
            example: 'あなたに謝罪します。'
          }
        ]
      },
      '배': {
        'en': [
          {
            translation: 'pear',
            context: '과일',
            example: 'This pear is very sweet.'
          },
          {
            translation: 'ship',
            context: '물 위를 다니는 교통수단',
            example: 'The ship sailed across the ocean.'
          },
          {
            translation: 'stomach',
            context: '몸의 부위',
            example: 'My stomach hurts.'
          }
        ]
      },
      'bank': {
        'ko': [
          {
            translation: '은행',
            context: '금융기관',
            example: '은행에서 돈을 인출했다.'
          },
          {
            translation: '강둑',
            context: '강가의 언덕',
            example: '강둑에서 낚시를 했다.'
          }
        ]
      }
    };

    return meanings[word]?.[targetLanguage] || [];
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

    const translation = await this.translateWithMyMemory(text, sourceLanguage, targetLanguage);
    
    if (translation === null) {
      return { translation: '번역을 찾을 수 없습니다' };
    }
    
    // 단어 검색이고 중의적 의미가 있는 경우
    if (searchType === 'word') {
      const meanings = this.generateWordMeanings(text.toLowerCase(), targetLanguage);
      if (meanings.length > 0) {
        return { translation, meanings };
      }
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
        const result = await this.translate(text, sourceLanguage, targetLang, searchType);
        
        // 번역 품질 평가
        let confidence = 0.9;
        if (result.translation === '번역을 찾을 수 없습니다') {
          confidence = 0;
        } else if (result.translation.toLowerCase() === text.toLowerCase()) {
          confidence = 0.3;
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
    return results.filter(result => result.confidence > 0);
  }
}