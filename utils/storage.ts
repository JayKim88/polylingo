import AsyncStorage from '@react-native-async-storage/async-storage';
import { FavoriteItem, HistoryItem } from '../types/dictionary';

const FAVORITES_KEY = 'dictionary_favorites';
const HISTORY_KEY = 'dictionary_history';
const SELECTED_LANGUAGES_KEY = 'selected_languages';
const LANGUAGE_ORDER_KEY = 'language_order';
const VOICE_SETTINGS_KEY = 'voice_settings';
const APP_LANGUAGE_KEY = 'app_language';
const THEME_KEY = 'app_theme';
const MAX_HISTORY_ITEMS = 100;

export interface VoiceSettings {
  volume: number; // 0.0 - 1.0
  rate: number; // 0.1 - 2.0
  pitch: number; // 0.0 - 2.0
}

export class StorageService {
  static async getFavorites(): Promise<FavoriteItem[]> {
    try {
      const data = await AsyncStorage.getItem(FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }

  static async addFavorite(
    item: Omit<FavoriteItem, 'id' | 'createdAt'>
  ): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const newFavorite: FavoriteItem = {
        ...item,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };

      // Check if already exists
      const exists = favorites.some(
        (fav) =>
          fav.sourceText === item.sourceText &&
          fav.sourceLanguage === item.sourceLanguage &&
          fav.targetLanguage === item.targetLanguage
      );

      if (!exists) {
        favorites.unshift(newFavorite);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  }

  static async removeFavorite(id: string): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filteredFavorites = favorites.filter((fav) => fav.id !== id);
      await AsyncStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(filteredFavorites)
      );
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }

  static async removeFavoriteByContent(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const filteredFavorites = favorites.filter(
        (fav) =>
          !(
            fav.sourceText === sourceText &&
            fav.sourceLanguage === sourceLanguage &&
            fav.targetLanguage === targetLanguage
          )
      );
      await AsyncStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(filteredFavorites)
      );
    } catch (error) {
      console.error('Error removing favorite by content:', error);
    }
  }

  static async getHistory(): Promise<HistoryItem[]> {
    try {
      const data = await AsyncStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  }

  static async addToHistory(
    item: Omit<HistoryItem, 'id' | 'searchedAt'>
  ): Promise<void> {
    try {
      const history = await this.getHistory();
      const newHistoryItem: HistoryItem = {
        ...item,
        id: Date.now().toString(),
        searchedAt: Date.now(),
      };

      // Remove duplicates
      const filteredHistory = history.filter(
        (hist) =>
          !(
            hist.sourceText === item.sourceText &&
            hist.sourceLanguage === item.sourceLanguage
          )
      );

      filteredHistory.unshift(newHistoryItem);

      // Keep only recent items
      const trimmedHistory = filteredHistory.slice(0, MAX_HISTORY_ITEMS);

      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  }

  static async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }

  static async removeHistoryItem(id: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter((item) => item.id !== id);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('Error removing history item:', error);
    }
  }

  static async getSelectedLanguages(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(SELECTED_LANGUAGES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading selected languages:', error);
      return [];
    }
  }

  static async saveSelectedLanguages(languages: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        SELECTED_LANGUAGES_KEY,
        JSON.stringify(languages)
      );
    } catch (error) {
      console.error('Error saving selected languages:', error);
    }
  }

  static async getVoiceSettings(): Promise<VoiceSettings> {
    try {
      const data = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
      return data
        ? JSON.parse(data)
        : {
            volume: 1.0,
            rate: 0.8,
            pitch: 1.0,
          };
    } catch (error) {
      console.error('Error loading voice settings:', error);
      return {
        volume: 1.0,
        rate: 0.8,
        pitch: 1.0,
      };
    }
  }

  static async saveVoiceSettings(settings: VoiceSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  }

  static async getAppLanguage(): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
      return data;
    } catch (error) {
      console.error('Error loading app language:', error);
      return null;
    }
  }

  static async setAppLanguage(language: string): Promise<void> {
    try {
      await AsyncStorage.setItem(APP_LANGUAGE_KEY, language);
    } catch (error) {
      console.error('Error saving app language:', error);
    }
  }

  static async getTheme(): Promise<'light' | 'dark'> {
    try {
      const theme = await AsyncStorage.getItem(THEME_KEY);
      return (theme as 'light' | 'dark') || 'light';
    } catch (error) {
      console.error('Error loading theme:', error);
      return 'light';
    }
  }

  static async saveTheme(theme: 'light' | 'dark'): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }
}
