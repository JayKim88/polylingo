import AsyncStorage from '@react-native-async-storage/async-storage';
import { FavoriteItem, HistoryItem } from '../types/dictionary';

const FAVORITES_KEY = 'dictionary_favorites';
const HISTORY_KEY = 'dictionary_history';
const SELECTED_LANGUAGES_KEY = 'selected_languages';
const LANGUAGE_ORDER_KEY = 'language_order';
const MAX_HISTORY_ITEMS = 100;

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

  static async addFavorite(item: Omit<FavoriteItem, 'id' | 'createdAt'>): Promise<void> {
    try {
      const favorites = await this.getFavorites();
      const newFavorite: FavoriteItem = {
        ...item,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };
      
      // Check if already exists
      const exists = favorites.some(
        fav => fav.sourceText === item.sourceText && 
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
      const filteredFavorites = favorites.filter(fav => fav.id !== id);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filteredFavorites));
    } catch (error) {
      console.error('Error removing favorite:', error);
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

  static async addToHistory(item: Omit<HistoryItem, 'id' | 'searchedAt'>): Promise<void> {
    try {
      const history = await this.getHistory();
      const newHistoryItem: HistoryItem = {
        ...item,
        id: Date.now().toString(),
        searchedAt: Date.now(),
      };
      
      // Remove duplicates
      const filteredHistory = history.filter(
        hist => !(hist.sourceText === item.sourceText && 
                 hist.sourceLanguage === item.sourceLanguage)
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
      await AsyncStorage.setItem(SELECTED_LANGUAGES_KEY, JSON.stringify(languages));
    } catch (error) {
      console.error('Error saving selected languages:', error);
    }
  }

  static async saveLanguageOrder(languageOrder: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(LANGUAGE_ORDER_KEY, JSON.stringify(languageOrder));
    } catch (error) {
      console.error('Error saving language order:', error);
    }
  }

  static async getLanguageOrder(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(LANGUAGE_ORDER_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading language order:', error);
      return [];
    }
  }
}