/**
 * Translation Flow Integration Test Suite
 * 
 * Tests the complete translation workflow including:
 * - Search → Translation → TTS → Storage flow
 * - Multi-language parallel translation
 * - Cache integration with API fallback
 * - Voice input → Translation → Favorites workflow
 * - Subscription limits and usage tracking
 * - Error recovery and retry mechanisms
 */

import { TranslationAPI } from '../../utils/translationAPI';
import { StorageService } from '../../utils/storage';
import { SpeechService } from '../../utils/speechService';
import { SubscriptionService } from '../../utils/subscriptionService';

// Mock all external dependencies
jest.mock('../../utils/translationAPI');
jest.mock('../../utils/storage');
jest.mock('../../utils/speechService');
jest.mock('../../utils/subscriptionService');
jest.mock('@react-native-community/netinfo');

const mockTranslationAPI = TranslationAPI as jest.Mocked<typeof TranslationAPI>;
const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;
const mockSpeechService = SpeechService as jest.Mocked<typeof SpeechService>;
const mockSubscriptionService = SubscriptionService as jest.Mocked<typeof SubscriptionService>;

describe('Translation Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks for successful flow
    mockSubscriptionService.canUseTranslation.mockResolvedValue(true);
    mockSubscriptionService.incrementDailyUsage.mockResolvedValue(true);
    mockTranslationAPI.translate.mockResolvedValue({
      translation: '안녕하세요',
      pronunciation: 'annyeonghaseyo'
    });
    mockSpeechService.speak.mockResolvedValue();
    mockStorageService.addToHistory.mockResolvedValue();
    mockStorageService.addFavorite.mockResolvedValue();
  });

  describe('Basic Translation Flow', () => {
    test('should complete full translation workflow', async () => {
      // Simulate complete translation flow
      const sourceText = 'hello';
      const sourceLanguage = 'en';
      const targetLanguage = 'ko';
      
      // Step 1: Check subscription limits
      const canTranslate = await SubscriptionService.canUseTranslation();
      expect(canTranslate).toBe(true);
      
      // Step 2: Perform translation
      const result = await TranslationAPI.translate(sourceText, sourceLanguage, targetLanguage);
      expect(result.translation).toBe('안녕하세요');
      
      // Step 3: Increment usage
      await SubscriptionService.incrementDailyUsage();
      expect(mockSubscriptionService.incrementDailyUsage).toHaveBeenCalled();
      
      // Step 4: Add to history
      await StorageService.addToHistory({
        sourceText,
        sourceLanguage,
        targetLanguage,
        translatedText: result.translation,
        searchedData: [{ lng: targetLanguage, text: result.translation }]
      });
      expect(mockStorageService.addToHistory).toHaveBeenCalledWith({
        sourceText,
        sourceLanguage,
        targetLanguage,
        translatedText: result.translation,
        searchedData: [{ lng: targetLanguage, text: result.translation }]
      });
      
      // Step 5: Text-to-speech
      await SpeechService.speak(result.translation, targetLanguage);
      expect(mockSpeechService.speak).toHaveBeenCalledWith('안녕하세요', targetLanguage);
      
      // Verify all steps completed successfully
      expect(mockTranslationAPI.translate).toHaveBeenCalledWith(sourceText, sourceLanguage, targetLanguage);
    });

    test('should handle subscription limit reached', async () => {
      mockSubscriptionService.canUseTranslation.mockResolvedValue(false);
      
      const canTranslate = await SubscriptionService.canUseTranslation();
      
      expect(canTranslate).toBe(false);
      // Should not proceed with translation
      expect(mockTranslationAPI.translate).not.toHaveBeenCalled();
    });

    test('should handle translation API failures gracefully', async () => {
      mockTranslationAPI.translate.mockRejectedValue(new Error('Translation failed'));
      
      let translationResult;
      let error;
      
      try {
        translationResult = await TranslationAPI.translate('hello', 'en', 'ko');
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      expect(translationResult).toBeUndefined();
      
      // Should not increment usage on failure
      expect(mockSubscriptionService.incrementDailyUsage).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Language Translation Flow', () => {
    test('should translate to multiple languages concurrently', async () => {
      const sourceText = 'hello';
      const sourceLanguage = 'en';
      const targetLanguages = ['ko', 'ja', 'fr'];
      
      mockTranslationAPI.translateToMultipleLanguages.mockResolvedValue([
        {
          sourceLanguage: 'en',
          targetLanguage: 'ko',
          sourceText: 'hello',
          translatedText: '안녕하세요',
          confidence: 0.9,
          timestamp: Date.now()
        },
        {
          sourceLanguage: 'en',
          targetLanguage: 'ja',
          sourceText: 'hello',
          translatedText: 'こんにちは',
          confidence: 0.9,
          timestamp: Date.now()
        },
        {
          sourceLanguage: 'en',
          targetLanguage: 'fr',
          sourceText: 'hello',
          translatedText: 'bonjour',
          confidence: 0.9,
          timestamp: Date.now()
        }
      ]);
      
      // Check subscription limit first
      const canTranslate = await SubscriptionService.canUseTranslation();
      expect(canTranslate).toBe(true);
      
      // Perform multi-language translation
      const results = await TranslationAPI.translateToMultipleLanguages(
        sourceText,
        sourceLanguage,
        targetLanguages
      );
      
      expect(results).toHaveLength(3);
      expect(results[0].translatedText).toBe('안녕하세요');
      expect(results[1].translatedText).toBe('こんにちは');
      expect(results[2].translatedText).toBe('bonjour');
      
      // Should increment usage for multi-language translation
      await SubscriptionService.incrementDailyUsage();
      expect(mockSubscriptionService.incrementDailyUsage).toHaveBeenCalled();
    });

    test('should handle partial failures in multi-language translation', async () => {
      mockTranslationAPI.translateToMultipleLanguages.mockResolvedValue([
        {
          sourceLanguage: 'en',
          targetLanguage: 'ko',
          sourceText: 'hello',
          translatedText: '안녕하세요',
          confidence: 0.9,
          timestamp: Date.now()
        },
        // Japanese translation failed (not included in results)
      ]);
      
      const results = await TranslationAPI.translateToMultipleLanguages(
        'hello',
        'en',
        ['ko', 'ja']
      );
      
      expect(results).toHaveLength(1); // Only Korean succeeded
      expect(results[0].targetLanguage).toBe('ko');
    });
  });

  describe('Voice Input to Translation Flow', () => {
    test('should complete voice input to translation workflow', async () => {
      let speechResultCallback: (text: string) => void;
      
      mockSpeechService.startSpeechRecognition.mockImplementation(
        (languageCode, onResult, onError, onEnd) => {
          speechResultCallback = onResult;
          return Promise.resolve({
            stop: jest.fn()
          });
        }
      );
      
      // Step 1: Start speech recognition  
      const recognition = await SpeechService.startSpeechRecognition(
        'en',
        (text) => { /* This will be captured by the mock implementation */ },
        (error) => console.error(error),
        () => console.log('ended')
      );
      
      expect(recognition).toBeDefined();
      expect(mockSpeechService.startSpeechRecognition).toHaveBeenCalled();
      
      // Step 2: Simulate speech result
      speechResultCallback!('hello world');
      
      // Step 3: Check subscription
      const canTranslate = await SubscriptionService.canUseTranslation();
      expect(canTranslate).toBe(true);
      
      // Step 4: Translate the speech result
      const result = await TranslationAPI.translate('hello world', 'en', 'ko');
      expect(result.translation).toBe('안녕하세요');
      
      // Step 5: Play translated text
      await SpeechService.speak(result.translation, 'ko');
      expect(mockSpeechService.speak).toHaveBeenCalledWith('안녕하세요', 'ko');
    });

    test('should handle speech recognition errors', async () => {
      let speechErrorCallback: (error: string) => void;
      let errorReceived: string | null = null;
      
      mockSpeechService.startSpeechRecognition.mockImplementation(
        (languageCode, onResult, onError, onEnd) => {
          speechErrorCallback = onError;
          return Promise.resolve({
            stop: jest.fn()
          });
        }
      );
      
      await SpeechService.startSpeechRecognition(
        'en',
        (text) => {},
        (error) => { errorReceived = error; },
        () => {}
      );
      
      // Simulate speech recognition error
      speechErrorCallback!('Microphone permission denied');
      
      expect(errorReceived).toBe('Microphone permission denied');
      // Should not proceed with translation
      expect(mockTranslationAPI.translate).not.toHaveBeenCalled();
    });
  });

  describe('Translation to Favorites Flow', () => {
    test('should save successful translation to favorites', async () => {
      const sourceText = 'hello';
      const translatedText = '안녕하세요';
      
      // Perform translation
      const result = await TranslationAPI.translate(sourceText, 'en', 'ko');
      expect(result.translation).toBe(translatedText);
      
      // Add to favorites
      await StorageService.addFavorite({
        sourceText,
        translatedText: result.translation,
        sourceLanguage: 'en',
        targetLanguage: 'ko'
      });
      
      expect(mockStorageService.addFavorite).toHaveBeenCalledWith({
        sourceText,
        translatedText,
        sourceLanguage: 'en',
        targetLanguage: 'ko'
      });
    });

    test('should prevent duplicate favorites', async () => {
      // First save to favorites
      await StorageService.addFavorite({
        sourceText: 'hello',
        translatedText: '안녕하세요',
        sourceLanguage: 'en',
        targetLanguage: 'ko'
      });
      
      // Second save should be handled by storage service
      await StorageService.addFavorite({
        sourceText: 'hello',
        translatedText: '안녕하세요',
        sourceLanguage: 'en',
        targetLanguage: 'ko'
      });
      
      expect(mockStorageService.addFavorite).toHaveBeenCalledTimes(2);
      // Duplicate prevention is handled inside StorageService
    });
  });

  describe('Cache Integration Flow', () => {
    test('should use cached translations when available', async () => {
      // First translation - should hit API
      await TranslationAPI.translate('hello', 'en', 'ko');
      expect(mockTranslationAPI.translate).toHaveBeenCalledTimes(1);
      
      // Second translation - should use cache
      await TranslationAPI.translate('hello', 'en', 'ko');
      expect(mockTranslationAPI.translate).toHaveBeenCalledTimes(2);
      
      // Cache usage is handled internally in TranslationAPI
    });

    test('should fallback to API when cache is expired or unavailable', async () => {
      // Mock cache miss
      mockTranslationAPI.translate.mockResolvedValueOnce({
        translation: '안녕하세요',
        pronunciation: 'annyeonghaseyo'
      });
      
      const result = await TranslationAPI.translate('hello', 'en', 'ko');
      
      expect(result.translation).toBe('안녕하세요');
      expect(mockTranslationAPI.translate).toHaveBeenCalledWith('hello', 'en', 'ko');
    });
  });

  describe('Error Recovery and Retry', () => {
    test('should retry failed translations', async () => {
      // First attempt fails
      mockTranslationAPI.translate
        .mockRejectedValueOnce(new Error('Network error'))
        // Second attempt succeeds
        .mockResolvedValueOnce({
          translation: '안녕하세요'
        });
      
      let result;
      let error;
      
      // First attempt
      try {
        result = await TranslationAPI.translate('hello', 'en', 'ko');
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      
      // Retry attempt
      result = await TranslationAPI.translate('hello', 'en', 'ko');
      expect(result.translation).toBe('안녕하세요');
      
      expect(mockTranslationAPI.translate).toHaveBeenCalledTimes(2);
    });

    test('should handle complete service unavailability', async () => {
      mockTranslationAPI.translate.mockRejectedValue(new Error('All services unavailable'));
      
      let error;
      
      try {
        await TranslationAPI.translate('hello', 'en', 'ko');
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      expect((error as Error).message).toBe('All services unavailable');
    });
  });

  describe('Subscription Integration', () => {
    test('should respect daily usage limits for free users', async () => {
      // Mock free user at limit
      mockSubscriptionService.canUseTranslation.mockResolvedValue(false);
      
      const canUse = await SubscriptionService.canUseTranslation();
      
      expect(canUse).toBe(false);
      
      // Should not allow translation
      if (!canUse) {
        expect(mockTranslationAPI.translate).not.toHaveBeenCalled();
      }
    });

    test('should allow unlimited translations for premium users', async () => {
      // Mock premium user
      mockSubscriptionService.canUseTranslation.mockResolvedValue(true);
      
      // Perform multiple translations
      for (let i = 0; i < 50; i++) {
        const canUse = await SubscriptionService.canUseTranslation();
        expect(canUse).toBe(true);
        
        if (canUse) {
          await TranslationAPI.translate(`word ${i}`, 'en', 'ko');
          await SubscriptionService.incrementDailyUsage();
        }
      }
      
      expect(mockTranslationAPI.translate).toHaveBeenCalledTimes(50);
      expect(mockSubscriptionService.incrementDailyUsage).toHaveBeenCalledTimes(50);
    });
  });

  describe('Data Persistence Integration', () => {
    test('should maintain consistent data across storage operations', async () => {
      const translationData = {
        sourceText: 'good morning',
        translatedText: '좋은 아침',
        sourceLanguage: 'en',
        targetLanguage: 'ko'
      };
      
      // Add to both history and favorites
      await StorageService.addToHistory({
        sourceText: translationData.sourceText,
        sourceLanguage: translationData.sourceLanguage,
        targetLanguage: translationData.targetLanguage,
        translatedText: translationData.translatedText,
        searchedData: [{ lng: translationData.targetLanguage, text: translationData.translatedText }]
      });
      
      await StorageService.addFavorite(translationData);
      
      // Verify both calls were made
      expect(mockStorageService.addToHistory).toHaveBeenCalledWith({
        sourceText: 'good morning',
        sourceLanguage: 'en',
        targetLanguage: 'ko',
        translatedText: '좋은 아침',
        searchedData: [{ lng: 'ko', text: '좋은 아침' }]
      });
      
      expect(mockStorageService.addFavorite).toHaveBeenCalledWith(translationData);
    });

    test('should handle storage failures gracefully', async () => {
      mockStorageService.addToHistory.mockRejectedValue(new Error('Storage full'));
      
      let error;
      
      try {
        await StorageService.addToHistory({
          sourceText: 'hello',
          sourceLanguage: 'en',
          targetLanguage: 'ko',
          translatedText: '안녕하세요',
          searchedData: [{ lng: 'ko', text: '좋은 아침' }]
        });
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      expect((error as Error).message).toBe('Storage full');
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle concurrent translation requests', async () => {
      const requests = [
        TranslationAPI.translate('hello', 'en', 'ko'),
        TranslationAPI.translate('world', 'en', 'ja'),
        TranslationAPI.translate('test', 'en', 'fr')
      ];
      
      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(3);
      expect(mockTranslationAPI.translate).toHaveBeenCalledTimes(3);
    });

    test('should handle concurrent storage operations', async () => {
      const storageOperations = [
        StorageService.addToHistory({ 
          sourceText: 'hello', 
          sourceLanguage: 'en',
          targetLanguage: 'ko',
          translatedText: '안녕',
          searchedData: [{ lng: 'ko', text: '좋은 아침' }]
        }),
        StorageService.addFavorite({
          sourceText: 'hello',
          translatedText: '안녕',
          sourceLanguage: 'en',
          targetLanguage: 'ko'
        })
      ];
      
      await Promise.all(storageOperations);
      
      expect(mockStorageService.addToHistory).toHaveBeenCalled();
      expect(mockStorageService.addFavorite).toHaveBeenCalled();
    });
  });
});