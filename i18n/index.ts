import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from './locales/en.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

// Debug: Check if translations are loaded
if (__DEV__) {
  console.log('🌍 i18n: Loading translations');
  console.log('📚 English keys:', Object.keys(en).length);
  console.log('📚 Korean keys:', Object.keys(ko).length);
  console.log('📚 Chinese keys:', Object.keys(zh).length);
}

const LANGUAGE_STORAGE_KEY = 'app_language';

// Safe device locale detection
const getDeviceLanguage = () => {
  try {
    // Try to import react-native-localize dynamically
    const RNLocalize = require('react-native-localize');
    const deviceLanguages = RNLocalize.getLocales();
    const deviceLanguage = deviceLanguages[0]?.languageCode;

    // Map device language to supported languages
    const supportedLanguages = ['ko', 'en', 'zh'];
    return supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';
  } catch (error) {
    console.log('react-native-localize not available, using default language');
    return 'en'; // Default to English
  }
};

// Language detector
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // First, check if user has manually set a language
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }

      // If no saved language, detect from device
      const detectedLanguage = getDeviceLanguage();
      callback(detectedLanguage);
    } catch (error) {
      console.log('Language detection error:', error);
      callback('en'); // Fallback to English
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      ko: {
        translation: ko,
      },
      zh: {
        translation: zh,
      },
    },
    fallbackLng: 'en',
    debug: __DEV__,
    supportedLngs: ['en', 'ko', 'zh'],

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
