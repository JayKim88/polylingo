/**
 * StorageService Test Suite
 * 
 * Tests local data persistence and management including:
 * - Favorites CRUD operations with duplicate prevention
 * - History management with 100-item limit
 * - Voice settings persistence
 * - Language and theme preferences
 * - Error handling for AsyncStorage failures
 * - Data migration and cleanup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService, VoiceSettings } from '../../utils/storage';
import { FavoriteItem, HistoryItem } from '../../types/dictionary';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Favorites Management', () => {
    const mockFavorite: Omit<FavoriteItem, 'id' | 'createdAt'> = {
      sourceText: 'hello',
      translatedText: '안녕',
      sourceLanguage: 'en',
      targetLanguage: 'ko'
    };

    test('should get empty favorites when none exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const favorites = await StorageService.getFavorites();
      
      expect(favorites).toEqual([]);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('dictionary_favorites');
    });

    test('should get existing favorites', async () => {
      const existingFavorites: FavoriteItem[] = [{
        id: '1',
        sourceText: 'hello',
        translatedText: '안녕',
        sourceLanguage: 'en',
        targetLanguage: 'ko',
        createdAt: Date.now()
      }];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingFavorites));
      
      const favorites = await StorageService.getFavorites();
      
      expect(favorites).toEqual(existingFavorites);
    });

    test('should handle getFavorites errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const favorites = await StorageService.getFavorites();
      
      expect(favorites).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading favorites:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    test('should add new favorite successfully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockResolvedValue();
      
      // Mock Date.now() for consistent testing
      const mockDate = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);
      
      await StorageService.addFavorite(mockFavorite);
      
      const expectedFavorite: FavoriteItem = {
        ...mockFavorite,
        id: mockDate.toString(),
        createdAt: mockDate
      };
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'dictionary_favorites',
        JSON.stringify([expectedFavorite])
      );
      
      (Date.now as jest.Mock).mockRestore();
    });

    test('should prevent duplicate favorites', async () => {
      const existingFavorites: FavoriteItem[] = [{
        id: '1',
        sourceText: 'hello',
        translatedText: '안녕',
        sourceLanguage: 'en',
        targetLanguage: 'ko',
        createdAt: Date.now() - 1000
      }];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingFavorites));
      
      await StorageService.addFavorite(mockFavorite);
      
      // Should not call setItem because duplicate exists
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    test('should add new favorite to beginning of list', async () => {
      const existingFavorites: FavoriteItem[] = [{
        id: '1',
        sourceText: 'world',
        translatedText: '세계',
        sourceLanguage: 'en',
        targetLanguage: 'ko',
        createdAt: Date.now() - 1000
      }];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingFavorites));
      mockAsyncStorage.setItem.mockResolvedValue();
      
      const mockDate = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);
      
      await StorageService.addFavorite(mockFavorite);
      
      const expectedNewFavorite: FavoriteItem = {
        ...mockFavorite,
        id: mockDate.toString(),
        createdAt: mockDate
      };
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'dictionary_favorites',
        JSON.stringify([expectedNewFavorite, ...existingFavorites])
      );
      
      (Date.now as jest.Mock).mockRestore();
    });

    test('should remove favorite by id', async () => {
      const favorites: FavoriteItem[] = [
        { id: '1', sourceText: 'hello', translatedText: '안녕', sourceLanguage: 'en', targetLanguage: 'ko', createdAt: Date.now() },
        { id: '2', sourceText: 'world', translatedText: '세계', sourceLanguage: 'en', targetLanguage: 'ko', createdAt: Date.now() }
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(favorites));
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await StorageService.removeFavorite('1');
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'dictionary_favorites',
        JSON.stringify([favorites[1]])
      );
    });

    test('should remove favorite by content', async () => {
      const favorites: FavoriteItem[] = [
        { id: '1', sourceText: 'hello', translatedText: '안녕', sourceLanguage: 'en', targetLanguage: 'ko', createdAt: Date.now() },
        { id: '2', sourceText: 'world', translatedText: '세계', sourceLanguage: 'en', targetLanguage: 'ko', createdAt: Date.now() }
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(favorites));
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await StorageService.removeFavoriteByContent('hello', 'en', 'ko');
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'dictionary_favorites',
        JSON.stringify([favorites[1]])
      );
    });

    test('should handle addFavorite errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      await StorageService.addFavorite(mockFavorite);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding favorite:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('History Management', () => {
    const mockHistoryItem: Omit<HistoryItem, 'id' | 'searchedAt'> = {
      sourceText: 'hello',
      sourceLanguage: 'en'
    };

    test('should get empty history when none exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const history = await StorageService.getHistory();
      
      expect(history).toEqual([]);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('dictionary_history');
    });

    test('should get existing history', async () => {
      const existingHistory: HistoryItem[] = [{
        id: '1',
        sourceText: 'hello',
        sourceLanguage: 'en',
        searchedAt: Date.now()
      }];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingHistory));
      
      const history = await StorageService.getHistory();
      
      expect(history).toEqual(existingHistory);
    });

    test('should add new history item to beginning', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockResolvedValue();
      
      const mockDate = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);
      
      await StorageService.addToHistory(mockHistoryItem);
      
      const expectedHistoryItem: HistoryItem = {
        ...mockHistoryItem,
        id: mockDate.toString(),
        searchedAt: mockDate
      };
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'dictionary_history',
        JSON.stringify([expectedHistoryItem])
      );
      
      (Date.now as jest.Mock).mockRestore();
    });

    test('should remove duplicate entries when adding to history', async () => {
      const existingHistory: HistoryItem[] = [
        { id: '1', sourceText: 'hello', sourceLanguage: 'en', searchedAt: Date.now() - 1000 },
        { id: '2', sourceText: 'world', sourceLanguage: 'en', searchedAt: Date.now() - 2000 }
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingHistory));
      mockAsyncStorage.setItem.mockResolvedValue();
      
      const mockDate = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);
      
      await StorageService.addToHistory({ sourceText: 'hello', sourceLanguage: 'en' });
      
      // Should remove old 'hello' entry and add new one at beginning
      const expectedHistory = [
        { id: mockDate.toString(), sourceText: 'hello', sourceLanguage: 'en', searchedAt: mockDate },
        existingHistory[1] // 'world' should remain
      ];
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'dictionary_history',
        JSON.stringify(expectedHistory)
      );
      
      (Date.now as jest.Mock).mockRestore();
    });

    test('should limit history to 100 items', async () => {
      // Create 100 existing items
      const existingHistory: HistoryItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        sourceText: `word${i}`,
        sourceLanguage: 'en',
        searchedAt: Date.now() - i * 1000
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingHistory));
      mockAsyncStorage.setItem.mockResolvedValue();
      
      const mockDate = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockDate);
      
      await StorageService.addToHistory({ sourceText: 'new word', sourceLanguage: 'en' });
      
      // Should keep only 100 items total
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'dictionary_history',
        expect.stringContaining('"new word"')
      );
      
      const savedHistory = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedHistory).toHaveLength(100);
      expect(savedHistory[0].sourceText).toBe('new word');
      
      (Date.now as jest.Mock).mockRestore();
    });

    test('should clear all history', async () => {
      await StorageService.clearHistory();
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('dictionary_history');
    });

    test('should remove specific history item', async () => {
      const history: HistoryItem[] = [
        { id: '1', sourceText: 'hello', sourceLanguage: 'en', searchedAt: Date.now() },
        { id: '2', sourceText: 'world', sourceLanguage: 'en', searchedAt: Date.now() }
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(history));
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await StorageService.removeHistoryItem('1');
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'dictionary_history',
        JSON.stringify([history[1]])
      );
    });

    test('should handle history errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const history = await StorageService.getHistory();
      
      expect(history).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading history:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Language Settings', () => {
    test('should get empty selected languages when none exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const languages = await StorageService.getSelectedLanguages();
      
      expect(languages).toEqual([]);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('selected_languages');
    });

    test('should get existing selected languages', async () => {
      const selectedLanguages = ['en', 'ko', 'ja'];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(selectedLanguages));
      
      const languages = await StorageService.getSelectedLanguages();
      
      expect(languages).toEqual(selectedLanguages);
    });

    test('should save selected languages', async () => {
      const languages = ['en', 'ko', 'fr'];
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await StorageService.saveSelectedLanguages(languages);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'selected_languages',
        JSON.stringify(languages)
      );
    });

    test('should handle language settings errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const languages = await StorageService.getSelectedLanguages();
      
      expect(languages).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading selected languages:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Voice Settings', () => {
    const defaultVoiceSettings: VoiceSettings = {
      volume: 1.0,
      rate: 0.8,
      pitch: 1.0
    };

    test('should get default voice settings when none exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const settings = await StorageService.getVoiceSettings();
      
      expect(settings).toEqual(defaultVoiceSettings);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('voice_settings');
    });

    test('should get existing voice settings', async () => {
      const customSettings: VoiceSettings = {
        volume: 0.8,
        rate: 1.2,
        pitch: 0.9
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(customSettings));
      
      const settings = await StorageService.getVoiceSettings();
      
      expect(settings).toEqual(customSettings);
    });

    test('should save voice settings', async () => {
      const customSettings: VoiceSettings = {
        volume: 0.7,
        rate: 1.5,
        pitch: 1.1
      };
      
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await StorageService.saveVoiceSettings(customSettings);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'voice_settings',
        JSON.stringify(customSettings)
      );
    });

    test('should return defaults on voice settings error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const settings = await StorageService.getVoiceSettings();
      
      expect(settings).toEqual(defaultVoiceSettings);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading voice settings:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle save voice settings error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      const customSettings: VoiceSettings = {
        volume: 0.5,
        rate: 1.0,
        pitch: 1.0
      };
      
      await StorageService.saveVoiceSettings(customSettings);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving voice settings:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('App Language Settings', () => {
    test('should get null app language when none exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const language = await StorageService.getAppLanguage();
      
      expect(language).toBeNull();
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('app_language');
    });

    test('should get existing app language', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('ko');
      
      const language = await StorageService.getAppLanguage();
      
      expect(language).toBe('ko');
    });

    test('should set app language', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await StorageService.setAppLanguage('ja');
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('app_language', 'ja');
    });

    test('should handle app language errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const language = await StorageService.getAppLanguage();
      
      expect(language).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading app language:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Theme Settings', () => {
    test('should get default light theme when none exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const theme = await StorageService.getTheme();
      
      expect(theme).toBe('light');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('app_theme');
    });

    test('should get existing theme', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('dark');
      
      const theme = await StorageService.getTheme();
      
      expect(theme).toBe('dark');
    });

    test('should save theme', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await StorageService.saveTheme('dark');
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('app_theme', 'dark');
    });

    test('should return light theme on error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const theme = await StorageService.getTheme();
      
      expect(theme).toBe('light');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading theme:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Data Management', () => {
    test('should clear all user data except preferences', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockAsyncStorage.multiRemove.mockResolvedValue();
      
      await StorageService.clearAllData();
      
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'dictionary_history',
        'dictionary_favorites',
        'selected_languages',
        'voice_settings'
      ]);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('All user data cleared successfully');
      
      consoleLogSpy.mockRestore();
    });

    test('should handle clear all data errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Clear failed');
      mockAsyncStorage.multiRemove.mockRejectedValue(error);
      
      await expect(StorageService.clearAllData()).rejects.toThrow('Clear failed');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing all data:', error);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('JSON Parsing Edge Cases', () => {
    test('should handle malformed JSON gracefully for favorites', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');
      
      const favorites = await StorageService.getFavorites();
      
      expect(favorites).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading favorites:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle malformed JSON gracefully for voice settings', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');
      
      const settings = await StorageService.getVoiceSettings();
      
      expect(settings).toEqual({
        volume: 1.0,
        rate: 0.8,
        pitch: 1.0
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading voice settings:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle empty string data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('');
      
      const favorites = await StorageService.getFavorites();
      
      expect(favorites).toEqual([]);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent favorite additions', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockResolvedValue();
      
      const favorite1 = { sourceText: 'hello', translatedText: '안녕', sourceLanguage: 'en', targetLanguage: 'ko' };
      const favorite2 = { sourceText: 'world', translatedText: '세계', sourceLanguage: 'en', targetLanguage: 'ko' };
      
      // Simulate concurrent additions
      await Promise.all([
        StorageService.addFavorite(favorite1),
        StorageService.addFavorite(favorite2)
      ]);
      
      // Both operations should complete without errors
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });

    test('should handle concurrent history additions', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockResolvedValue();
      
      const history1 = { sourceText: 'hello', sourceLanguage: 'en' };
      const history2 = { sourceText: 'world', sourceLanguage: 'en' };
      
      // Simulate concurrent additions
      await Promise.all([
        StorageService.addToHistory(history1),
        StorageService.addToHistory(history2)
      ]);
      
      // Both operations should complete without errors
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });
});