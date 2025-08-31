/**
 * SpeechService Test Suite
 * Tests core speech functionality: TTS, language mapping, and availability checks
 */

import { Platform } from 'react-native';
import { SpeechService } from '../../utils/speechService';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { StorageService } from '../../utils/storage';

// Mock dependencies
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-speech');
jest.mock('expo-av');
jest.mock('../../utils/storage');

const mockVoice = {
  isAvailable: jest.fn().mockResolvedValue(true),
  start: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  _loaded: true
};
jest.mock('@react-native-voice/voice', () => ({ default: mockVoice }), { virtual: true });

const mockSpeech = Speech as jest.Mocked<typeof Speech>;
const mockAudio = Audio as jest.Mocked<typeof Audio>;
const mockStorage = StorageService as jest.Mocked<typeof StorageService>;

describe('SpeechService', () => {
  const defaultVoiceSettings = { rate: 0.5, pitch: 1.0, volume: 1.0 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getVoiceSettings.mockResolvedValue(defaultVoiceSettings);
    mockAudio.setAudioModeAsync.mockResolvedValue(undefined);
  });

  describe('Platform Support', () => {
    test('available on iOS/Android', () => {
      expect(SpeechService.isSpeechRecognitionAvailable()).toBe(true);
      
      (Platform as any).OS = 'web';
      expect(SpeechService.isSpeechRecognitionAvailable()).toBe(false);
    });
  });

  describe('Language Mapping', () => {
    test('maps supported languages correctly', () => {
      expect(SpeechService.getVoiceLanguage('en')).toBe('en-US');
      expect(SpeechService.getVoiceLanguage('ko')).toBe('ko-KR');
      expect(SpeechService.getVoiceLanguage('ja')).toBe('ja-JP');
      expect(SpeechService.getVoiceLanguage('es')).toBe('es-ES');
    });

    test('fallback for unknown languages', () => {
      expect(SpeechService.getVoiceLanguage('unknown')).toBe('en-US');
      expect(SpeechService.getVoiceLanguage('')).toBe('en-US');
    });
  });

  describe('Text-to-Speech', () => {
    test('speaks with default settings', async () => {
      mockSpeech.speak.mockImplementation((text, options) => {
        if (options?.onDone) options.onDone();
      });

      await SpeechService.speak('Hello', 'en');

      expect(mockSpeech.speak).toHaveBeenCalledWith('Hello', {
        language: 'en-US',
        rate: 0.5,
        pitch: 1.0,
        volume: 1.0,
        onDone: expect.any(Function),
        onError: expect.any(Function)
      });
    });

    test('uses custom settings when provided', async () => {
      const customSettings = { rate: 0.8, pitch: 1.2, volume: 0.9 };
      mockSpeech.speak.mockImplementation((text, options) => {
        if (options?.onDone) options.onDone();
      });

      SpeechService.speak('Hello', 'ko', customSettings);

      expect(mockSpeech.speak).toHaveBeenCalledWith('Hello', expect.objectContaining({
        language: 'ko-KR',
        rate: 0.8,
        pitch: 1.2,
        volume: 0.9
      }));
    });

    test('handles speech errors', async () => {
      mockSpeech.speak.mockImplementation((text, options) => {
        if (options?.onError) options.onError(new Error('Speech error'));
      });

      await expect(SpeechService.speak('Hello', 'en'))
        .rejects.toThrow('An error occurred while playing the voice.');
    });

    test('rejects on unsupported platforms', async () => {
      (Platform as any).OS = 'web';

      await expect(SpeechService.speak('Hello', 'en'))
        .rejects.toThrow('Voice function is not available.');
    });
  });

  describe('Speech Control', () => {
    test('stops speech when available', () => {
      SpeechService.stop();
      expect(mockSpeech.stop).toHaveBeenCalled();
    });
  });

  describe('Speech Recognition', () => {
    test('starts recognition with proper setup', async () => {
      const mockCallbacks = {
        onResult: jest.fn(),
        onError: jest.fn(),
        onEnd: jest.fn()
      };

      const result = await SpeechService.startSpeechRecognition('en', 
        mockCallbacks.onResult, mockCallbacks.onError, mockCallbacks.onEnd);

      expect(result).not.toBeNull();
      expect(mockAudio.setAudioModeAsync).toHaveBeenCalled();
    });

    test('handles unavailable Voice module', async () => {
      // Mock Voice as undefined to simulate missing module
      jest.doMock('@react-native-voice/voice', () => ({ default: undefined }), { virtual: true });
      
      const onError = jest.fn();
      
      await SpeechService.startSpeechRecognition('en', jest.fn(), onError, jest.fn());
      
      expect(onError).toHaveBeenCalledWith(
        'Speech recognition requires a development build. Please use npx expo run:ios or npx expo run:android'
      );
    });

    test('returns null for unsupported platforms', async () => {
      (Platform as any).OS = 'web';
      const onError = jest.fn();

      const result = await SpeechService.startSpeechRecognition('en', 
        jest.fn(), onError, jest.fn());

      expect(result).toBeNull();
      expect(onError).toHaveBeenCalledWith('Speech recognition is not available on this device');
    });
  });

  describe('Error Handling', () => {
    test('handles storage service errors', async () => {
      mockStorage.getVoiceSettings.mockRejectedValue(new Error('Storage error'));
      mockSpeech.speak.mockImplementation((text, options) => {
        if (options?.onDone) options.onDone();
      });

      // Should fallback to default settings
      await SpeechService.speak('Hello', 'en');

      expect(mockSpeech.speak).toHaveBeenCalledWith('Hello', expect.objectContaining({
        rate: 0.5, // Default fallback values
        pitch: 1.0,
        volume: 1.0
      }));
    });

    test('handles audio initialization errors', async () => {
      mockAudio.setAudioModeAsync.mockRejectedValue(new Error('Audio error'));
      mockSpeech.speak.mockImplementation((text, options) => {
        if (options?.onDone) options.onDone();
      });

      // Should continue despite audio error
      await expect(SpeechService.speak('Hello', 'en')).resolves.not.toThrow();
    });
  });
});