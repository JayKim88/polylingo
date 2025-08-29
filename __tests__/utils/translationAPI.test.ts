/**
 * TranslationAPI Test Suite
 * 
 * Tests the multi-provider translation pipeline including:
 * - 24-hour caching system
 * - Multi-API fallover (Claude → LibreTranslate → MyMemory)
 * - Network-aware cache operations
 * - Error handling and retry logic
 * - Cache management and cleanup
 */

import { TranslationAPI } from '../../utils/translationAPI';
import NetInfo from '@react-native-community/netinfo';
import { captureNetworkError } from '../../utils/sentryUtils';

// Mock external dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('../../utils/sentryUtils', () => ({
  captureNetworkError: jest.fn()
}));
jest.mock('../../utils/pronunciationService');

// Mock fetch globally
global.fetch = jest.fn();

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockCaptureNetworkError = captureNetworkError as jest.MockedFunction<typeof captureNetworkError>;

describe('TranslationAPI', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    // Save original environment
    originalEnv = { ...process.env };
    // Clear cache before each test
    TranslationAPI.clearCache();
    // Mock network as connected by default
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Cache Management', () => {
    test('should generate consistent cache keys', () => {
      // Access private method through type assertion
      const getCacheKey = (TranslationAPI as any).getCacheKey;
      
      const key1 = getCacheKey('Hello', 'en', 'ko');
      const key2 = getCacheKey('HELLO', 'en', 'ko');
      const key3 = getCacheKey('hello', 'en', 'ko');
      
      // All should be lowercase and consistent
      expect(key1).toBe('hello_en_ko');
      expect(key2).toBe('hello_en_ko');
      expect(key3).toBe('hello_en_ko');
    });

    test('should validate cache entries based on 24-hour expiry', () => {
      // Test cache expiry indirectly through cache stats
      TranslationAPI.clearCache();
      
      const translationCache = (TranslationAPI as any).translationCache;
      const CACHE_DURATION = 24 * 60 * 60 * 1000;
      
      // Add fresh entry
      translationCache.set('fresh_key', {
        translation: 'fresh',
        timestamp: Date.now() - 1000 // 1 second ago
      });
      
      // Add expired entry  
      translationCache.set('expired_key', {
        translation: 'expired',
        timestamp: Date.now() - (CACHE_DURATION + 1000) // Expired
      });
      
      const stats = TranslationAPI.getCacheStats();
      expect(stats.size).toBe(2);
      
      // Check that entries are marked correctly
      const freshEntry = stats.entries.find(e => e.key === 'fresh_key');
      const expiredEntry = stats.entries.find(e => e.key === 'expired_key');
      
      expect(freshEntry?.isExpired).toBe(false);
      expect(expiredEntry?.isExpired).toBe(true);
    });

    test('should return cached translation when valid', async () => {
      // Mock environment variables for consistent behavior
      process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL = 'http://localhost:5000/translate';
      
      // First translation to populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          translatedText: '안녕하세요'  // LibreTranslate format
        })
      } as Response);

      const firstResult = await TranslationAPI.translate('hello', 'en', 'ko');
      expect(firstResult.translation).toBe('안녕하세요');

      // Second call should use cache (no fetch call)
      const secondResult = await TranslationAPI.translate('hello', 'en', 'ko');
      expect(secondResult.translation).toBe('안녕하세요');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once
    });

    test('should clean up expired cache entries', () => {
      // Clear any existing cache and reinitialize
      TranslationAPI.clearCache();
      
      const translationCache = (TranslationAPI as any).translationCache;
      const CACHE_DURATION = 24 * 60 * 60 * 1000;
      
      // Add expired entry manually
      translationCache.set('test_key', {
        translation: 'test',
        timestamp: Date.now() - (CACHE_DURATION + 1000)
      });
      
      // Add fresh entry
      translationCache.set('fresh_key', {
        translation: 'fresh',
        timestamp: Date.now()
      });
      
      expect(translationCache.size).toBe(2);
      
      // Trigger cleanup
      const cleanupCache = (TranslationAPI as any).cleanupCache;
      if (cleanupCache) cleanupCache();
      
      expect(translationCache.size).toBe(1);
      expect(translationCache.has('fresh_key')).toBe(true);
      expect(translationCache.has('test_key')).toBe(false);
    });

    test('should not save to cache when offline', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({ isConnected: false } as any);
      
      const saveToCache = (TranslationAPI as any).saveToCache;
      await saveToCache('hello', 'en', 'ko', '안녕', [], 'annyeong');
      
      expect(TranslationAPI.getCacheSize()).toBe(0);
    });
  });

  describe('Claude API Integration', () => {
    test('should successfully translate using Claude API', async () => {
      // Set up environment variables for the test
      process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:3000';
      process.env.EXPO_PUBLIC_TRANSLATE_API_KEY = 'test-api-key';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          translation: '안녕하세요',
          pronunciation: 'annyeonghaseyo'
        })
      } as Response);

      const result = await TranslationAPI.translateWithClaude('hello', 'en', 'ko');
      
      expect(result.translation).toBe('안녕하세요');
      expect(result.pronunciation).toBe('annyeonghaseyo');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/translate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key'
          })
        })
      );
    });

    test('should handle Claude API errors and log to Sentry', async () => {
      const error = new Error('API timeout');
      mockFetch.mockRejectedValueOnce(error);

      const result = await TranslationAPI.translateWithClaude('hello', 'en', 'ko');
      
      expect(result.translation).toBe('');
      expect(mockCaptureNetworkError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          api_provider: 'Claude',
          method: 'POST'
        })
      );
    });

    test('should handle server error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const result = await TranslationAPI.translateWithClaude('hello', 'en', 'ko');
      expect(result.translation).toBe('');
    });
  });

  describe('LibreTranslate Integration', () => {
    beforeEach(() => {
      // Mock environment variable
      process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL = 'http://localhost:5000';
    });

    test('should successfully translate using LibreTranslate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          translatedText: '안녕하세요'
        })
      } as Response);

      const result = await TranslationAPI.translateWithLibreTranslate('hello', 'en', 'ko');
      
      expect(result).toBe('안녕하세요');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/translate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            q: 'hello',
            source: 'en',
            target: 'ko',
            format: 'text'
          })
        })
      );
    });

    test('should handle LibreTranslate API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await TranslationAPI.translateWithLibreTranslate('hello', 'en', 'ko');
      expect(result).toBeNull();
    });
  });

  describe('MyMemory Integration', () => {
    test('should successfully translate using MyMemory API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: {
            translatedText: '안녕하세요'
          }
        })
      } as Response);

      const result = await TranslationAPI.translateWithMyMemory('hello', 'en', 'ko');
      
      expect(result).toBe('안녕하세요');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('mymemory.translated.net/api/get?q=hello&langpair=en|ko')
      );
    });

    test('should decode URL-encoded responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          responseStatus: 200,
          responseData: {
            translatedText: '%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94' // URL-encoded Korean
          }
        })
      } as Response);

      const result = await TranslationAPI.translateWithMyMemory('hello', 'en', 'ko');
      expect(result).toBe('안녕하세요'); // Should be decoded
    });

    test('should handle MyMemory API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await TranslationAPI.translateWithMyMemory('hello', 'en', 'ko');
      expect(result).toBeNull();
    });
  });

  describe('Word Definitions (Wiktionary)', () => {
    test('should fetch word definitions successfully', async () => {
      const mockDefinitions = {
        en: [{
          partOfSpeech: 'noun',
          definitions: [{
            definition: 'A greeting or expression of goodwill'
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDefinitions)
      } as Response);

      const meanings = await TranslationAPI.fetchWordDefinitions('hello', 'en');
      
      expect(meanings).toHaveLength(1);
      expect(meanings[0].translation).toBe('A greeting or expression of goodwill');
      expect(meanings[0].type).toBe('noun');
    });

    test('should limit definitions to maximum 5', async () => {
      const mockDefinitions = {
        en: [{
          partOfSpeech: 'noun',
          definitions: Array(10).fill({}).map((_, i) => ({
            definition: `Definition ${i + 1}`
          }))
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDefinitions)
      } as Response);

      const meanings = await TranslationAPI.fetchWordDefinitions('test', 'en');
      expect(meanings).toHaveLength(5); // Should be limited to 5
    });

    test('should handle Wiktionary API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const meanings = await TranslationAPI.fetchWordDefinitions('hello', 'en');
      expect(meanings).toEqual([]);
    });
  });

  describe('Text Cleaning', () => {
    test('should remove HTML tags and entities', () => {
      const dirtyText = '<p>Hello <strong>world</strong> &amp; friends!</p>';
      const cleanText = TranslationAPI.cleanText(dirtyText);
      
      expect(cleanText).toBe('Hello world friends!');
    });

    test('should normalize whitespace', () => {
      const messyText = '  Hello    world  \n\n  ';
      const cleanText = TranslationAPI.cleanText(messyText);
      
      expect(cleanText).toBe('Hello world');
    });

    test('should handle empty or null text', () => {
      expect(TranslationAPI.cleanText('')).toBe('');
      expect(TranslationAPI.cleanText(null as any)).toBe('');
      expect(TranslationAPI.cleanText(undefined as any)).toBe('');
    });
  });

  describe('Multiple Language Translation', () => {
    test('should translate to multiple languages concurrently', async () => {
      // Set up LibreTranslate environment for consistent behavior
      process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL = 'http://localhost:5000/translate';
      
      // Mock successful translations using LibreTranslate format
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ translatedText: '안녕하세요' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ translatedText: 'こんにちは' })
        } as Response);

      const results = await TranslationAPI.translateToMultipleLanguages(
        'hello',
        'en',
        ['ko', 'ja']
      );

      expect(results).toHaveLength(2);
      expect(results[0].translatedText).toBe('안녕하세요');
      expect(results[1].translatedText).toBe('こんにちは');
      expect(results[0].confidence).toBe(0.9);
      expect(results[1].confidence).toBe(0.9);
    });

    test('should filter out same-language translations', async () => {
      const results = await TranslationAPI.translateToMultipleLanguages(
        'hello',
        'en',
        ['en', 'ko']
      );

      // Should filter out English-to-English translation
      const englishResult = results.find(r => r.targetLanguage === 'en');
      expect(englishResult).toBeUndefined();
    });

    test('should handle translation failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Translation failed'));

      const results = await TranslationAPI.translateToMultipleLanguages(
        'hello',
        'en',
        ['ko']
      );

      expect(results).toHaveLength(0); // Failed translations filtered out
    });
  });

  describe('Main Translation Function', () => {
    test('should return original text for same language', async () => {
      const result = await TranslationAPI.translate('hello', 'en', 'en');
      expect(result.translation).toBe('hello');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should return empty for empty input', async () => {
      const result = await TranslationAPI.translate('', 'en', 'ko');
      expect(result.translation).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should fix URL-encoded cached translations', async () => {
      // Manually add URL-encoded entry to cache
      const translationCache = (TranslationAPI as any).translationCache;
      translationCache.set('hello_en_ko', {
        translation: '%EC%95%88%EB%85%95',
        timestamp: Date.now()
      });

      const result = await TranslationAPI.translate('hello', 'en', 'ko');
      expect(result.translation).toBe('안녕'); // Should be decoded
    });

    test('should fallback to LibreTranslate when Claude fails', async () => {
      // Set LibreTranslate URL
      process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL = 'http://localhost:5000';
      
      // Mock LibreTranslate success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          translatedText: '안녕하세요'
        })
      } as Response);

      const result = await TranslationAPI.translate('hello', 'en', 'ko');
      expect(result.translation).toBe('안녕하세요');
    });
  });

  describe('Cache Statistics and Management', () => {
    test('should provide accurate cache statistics', () => {
      const translationCache = (TranslationAPI as any).translationCache;
      const CACHE_DURATION = 24 * 60 * 60 * 1000;
      
      // Add some test entries
      translationCache.set('fresh_key', {
        translation: 'fresh',
        timestamp: Date.now()
      });
      
      translationCache.set('expired_key', {
        translation: 'expired',
        timestamp: Date.now() - (CACHE_DURATION + 1000)
      });

      const stats = TranslationAPI.getCacheStats();
      
      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
      
      const freshEntry = stats.entries.find(e => e.key === 'fresh_key');
      const expiredEntry = stats.entries.find(e => e.key === 'expired_key');
      
      expect(freshEntry?.isExpired).toBe(false);
      expect(expiredEntry?.isExpired).toBe(true);
    });

    test('should clear cache completely', () => {
      const translationCache = (TranslationAPI as any).translationCache;
      translationCache.set('test', { translation: 'test', timestamp: Date.now() });
      
      expect(TranslationAPI.getCacheSize()).toBe(1);
      
      TranslationAPI.clearCache();
      expect(TranslationAPI.getCacheSize()).toBe(0);
    });

    test('should delete specific cache entries', () => {
      const translationCache = (TranslationAPI as any).translationCache;
      translationCache.set('hello_en_ko', { translation: 'test', timestamp: Date.now() });
      
      expect(TranslationAPI.getCacheSize()).toBe(1);
      
      TranslationAPI.deleteCacheFor('hello', 'en', 'ko');
      expect(TranslationAPI.getCacheSize()).toBe(0);
    });
  });

  describe('Network Awareness', () => {
    test('should trigger random cache cleanup', async () => {
      // Mock Math.random to always trigger cleanup
      jest.spyOn(Math, 'random').mockReturnValue(0.05); // < 0.1
      
      const cleanupSpy = jest.spyOn(TranslationAPI as any, 'cleanupCache');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translation: '안녕' })
      } as Response);

      await TranslationAPI.translate('hello', 'en', 'ko', { provider: 'claude' });
      
      expect(cleanupSpy).toHaveBeenCalled();
      
      (Math.random as jest.Mock).mockRestore();
    });
  });
});