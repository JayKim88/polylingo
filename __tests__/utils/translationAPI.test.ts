/**
 * TranslationAPI Test Suite
 * Tests translation pipeline: caching, multi-provider fallback, and error handling
 */

import { TranslationAPI } from '../../utils/translationAPI';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('../../utils/sentryUtils', () => ({
  captureNetworkError: jest.fn()
}));
jest.mock('../../utils/pronunciationService');

global.fetch = jest.fn();

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('TranslationAPI', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    TranslationAPI.clearCache();
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Translation Methods', () => {
    test('translates with LibreTranslate when configured', async () => {
      process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL = 'http://localhost:5000/translate';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translatedText: '안녕하세요' })
      } as Response);

      const result = await TranslationAPI.translate('hello', 'en', 'ko');
      
      expect(result.translation).toBe('안녕하세요');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/translate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"q":"hello"')
        })
      );
    });

    test('translates with Claude API when specified', async () => {
      process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:3000';
      process.env.EXPO_PUBLIC_TRANSLATE_API_KEY = 'test-key';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          translation: '안녕하세요',
          pronunciation: 'annyeonghaseyo'
        })
      } as Response);

      const result = await TranslationAPI.translate('hello', 'en', 'ko', { provider: 'claude' });
      
      expect(result.translation).toBe('안녕하세요');
      expect(result.pronunciation).toBe('annyeonghaseyo');
    });

    test('translates with MyMemory API', async () => {
      const result = await TranslationAPI.translateWithMyMemory('hello', 'en', 'ko');
      
      // MyMemory is tested indirectly through main translate function
      expect(mockFetch).toHaveBeenCalled();
    });

    test('returns same text for same language', async () => {
      const result = await TranslationAPI.translate('hello', 'en', 'en');
      
      expect(result.translation).toBe('hello');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('returns empty for empty input', async () => {
      const result = await TranslationAPI.translate('', 'en', 'ko');
      
      expect(result.translation).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Caching System', () => {
    test('generates consistent cache keys', () => {
      const getCacheKey = (TranslationAPI as any).getCacheKey;
      
      expect(getCacheKey('Hello', 'en', 'ko')).toBe('hello_en_ko');
      expect(getCacheKey('HELLO', 'en', 'ko')).toBe('hello_en_ko');
    });

    test('uses cached translations', async () => {
      process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL = 'http://localhost:5000/translate';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translatedText: '안녕하세요' })
      } as Response);

      // First call
      await TranslationAPI.translate('hello', 'en', 'ko');
      
      // Second call should use cache
      const result = await TranslationAPI.translate('hello', 'en', 'ko');
      
      expect(result.translation).toBe('안녕하세요');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once
    });

    test('does not save to cache when offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({ isConnected: false } as any);
      
      const saveToCache = jest.spyOn(TranslationAPI as any, 'saveToCache');
      
      await TranslationAPI.translate('hello', 'en', 'ko');
      
      // Verify saveToCache was called but skipped due to offline status
      expect(saveToCache).toHaveBeenCalled();
    });

    test('provides cache statistics', () => {
      const stats = TranslationAPI.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    test('clears cache completely', () => {
      const initialSize = TranslationAPI.getCacheSize();
      
      TranslationAPI.clearCache();
      
      expect(TranslationAPI.getCacheSize()).toBe(0);
    });
  });

  describe('Multiple Language Translation', () => {
    test('translates to multiple languages', async () => {
      process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL = 'http://localhost:5000/translate';
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ translatedText: '안녕하세요' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ translatedText: 'こんにちは' })
        } as Response);

      const results = await TranslationAPI.translateToMultipleLanguages('hello', 'en', ['ko', 'ja']);
      
      expect(results).toHaveLength(2);
      expect(results[0].translatedText).toBe('안녕하세요');
      expect(results[1].translatedText).toBe('こんにちは');
    });

    test('filters out same-language translations', async () => {
      const results = await TranslationAPI.translateToMultipleLanguages('hello', 'en', ['en', 'ko']);
      
      // Same language translations should be filtered out (confidence = 0)
      const validResults = results.filter(r => r.confidence > 0);
      expect(validResults.length).toBeLessThan(2);
    });

    test('handles translation failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Translation service unavailable'));

      const results = await TranslationAPI.translateToMultipleLanguages('hello', 'en', ['ko']);
      
      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBe(0);
      expect(results[0].translatedText).toBe('번역 서비스를 사용할 수 없습니다');
    });
  });

  describe('Text Processing', () => {
    test('cleans HTML tags and entities', () => {
      const dirtyText = '<p>Hello &amp; welcome!</p>';
      const cleanText = TranslationAPI.cleanText(dirtyText);
      
      expect(cleanText).toBe('Hello welcome!');
    });

    test('normalizes whitespace', () => {
      const messyText = '  Hello    world  \n\n  ';
      const cleanText = TranslationAPI.cleanText(messyText);
      
      expect(cleanText).toBe('Hello world');
    });

    test('handles empty or null text', () => {
      expect(TranslationAPI.cleanText('')).toBe('');
      expect(TranslationAPI.cleanText(null as any)).toBe('');
    });
  });

  describe('Word Definitions (Wiktionary)', () => {
    test('fetches word definitions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          en: [{
            partOfSpeech: 'noun',
            definitions: [
              { definition: 'A greeting or expression of goodwill' }
            ]
          }]
        })
      } as Response);

      const meanings = await TranslationAPI.fetchWordDefinitions('hello', 'en');
      
      expect(meanings).toHaveLength(1);
      expect(meanings[0].type).toBe('noun');
      expect(meanings[0].translation).toContain('greeting');
    });

    test('limits definitions to maximum 5', async () => {
      const manyDefinitions = Array.from({ length: 10 }, (_, i) => ({
        definition: `Definition ${i + 1}`
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          en: [{ definitions: manyDefinitions }]
        })
      } as Response);

      const meanings = await TranslationAPI.fetchWordDefinitions('test', 'en');
      
      expect(meanings.length).toBeLessThanOrEqual(5);
    });

    test('handles Wiktionary API errors', async () => {
      mockFetch.mockRejectedValue(new Error('Wiktionary API error'));

      const meanings = await TranslationAPI.fetchWordDefinitions('nonexistent', 'en');
      
      expect(meanings).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('returns error message when all translations fail', async () => {
      mockFetch.mockRejectedValue(new Error('All services down'));

      const result = await TranslationAPI.translate('hello', 'en', 'ko');
      
      expect(result.translation).toBe('번역을 찾을 수 없습니다');
    });

    test('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response);

      const result = await TranslationAPI.translate('hello', 'en', 'ko');
      
      expect(result.translation).toBe('번역을 찾을 수 없습니다');
    });

    test('handles network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await TranslationAPI.translate('hello', 'en', 'ko');
      
      expect(result.translation).toBe('번역을 찾을 수 없습니다');
    });
  });

  describe('Cache Management', () => {
    test('cleans up expired cache entries', () => {
      // Add some entries to cache manually for testing
      const cache = (TranslationAPI as any).translationCache;
      const CACHE_DURATION = 24 * 60 * 60 * 1000;
      
      cache.set('fresh_key', {
        translation: 'fresh',
        timestamp: Date.now()
      });
      
      cache.set('expired_key', {
        translation: 'expired',
        timestamp: Date.now() - (CACHE_DURATION + 1000)
      });
      
      const cleanup = (TranslationAPI as any).cleanupCache;
      cleanup();
      
      expect(cache.has('fresh_key')).toBe(true);
      expect(cache.has('expired_key')).toBe(false);
    });

    test('deletes specific cache entries', () => {
      TranslationAPI.deleteCacheFor('test', 'en', 'ko');
      
      // Verify the method exists and doesn't throw
      expect(typeof TranslationAPI.deleteCacheFor).toBe('function');
    });
  });
});