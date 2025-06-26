export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export type SearchType = 'word' | 'sentence';

export interface TranslationMeaning {
  translation: string;
  context: string;
  example: string;
}

export interface TranslationResult {
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  meanings?: TranslationMeaning[];
  confidence: number;
  timestamp: number;
  searchType: SearchType;
}

export interface FavoriteItem {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  meanings?: TranslationMeaning[];
  searchType: SearchType;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  searchType: SearchType;
  searchedAt: number;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
];
