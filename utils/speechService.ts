import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { StorageService, VoiceSettings } from './storage';

// Safely import Voice module with fallback
let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (error) {
  console.log(
    '🎤 react-native-voice not available - running in Expo Go or web'
  );
}

export class SpeechService {
  static isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  static isSpeechRecognitionAvailable(): boolean {
    return (
      Voice !== null && (Platform.OS === 'ios' || Platform.OS === 'android')
    );
  }

  // Initialize audio session for better TTS control
  static async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.log('🔊 Audio initialization warning:', error);
    }
  }

  // 언어 코드를 TTS에서 사용하는 언어 코드로 변환
  static getVoiceLanguage(languageCode: string): string {
    const languageMap: { [key: string]: string } = {
      ko: 'ko-KR',
      en: 'en-US',
      ja: 'ja-JP',
      fr: 'fr-FR',
      de: 'de-DE',
      es: 'es-ES',
      pt: 'pt-BR',
      hi: 'hi-IN',
      id: 'id-ID',
      ar: 'ar-SA',
      it: 'it-IT',
      th: 'th-TH',
      ru: 'ru-RU',
      zh: 'zh-CN',
    };
    return languageMap[languageCode] || 'en-US';
  }

  // 텍스트를 음성으로 읽기 (기본 설정 사용)
  static speak(
    text: string,
    languageCode: string,
    customSettings?: VoiceSettings
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!this.isAvailable()) {
        reject(new Error('Voice function is not available.'));
        return;
      }

      const voiceSettings =
        customSettings || (await StorageService.getVoiceSettings());

      try {
        await this.initializeAudio();

        const speechOptions = {
          language: this.getVoiceLanguage(languageCode),
          rate: voiceSettings.rate,
          pitch: voiceSettings.pitch,
          volume: voiceSettings.volume,
          onDone: () => resolve(),
          onError: () =>
            reject(new Error('An error occurred while playing the voice.')),
        };

        Speech.speak(text, speechOptions);
      } catch (error) {
        console.error('🔊 Enhanced TTS error:', error);
        reject(error);
      }
    });
  }

  static stop(): void {
    if (!this.isAvailable()) return;

    Speech.stop();
  }

  static getPlatformInfo(): string {
    return `Platform: ${Platform.OS}, TTS Available: ${this.isAvailable()}`;
  }

  static async startSpeechRecognition(
    languageCode: string,
    onResult: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): Promise<{ stop: () => void } | null> {
    if (!this.isSpeechRecognitionAvailable()) {
      onError('Speech recognition is not available on this device');
      return null;
    }

    if (!Voice) {
      onError(
        'Speech recognition requires a development build. Please use npx expo run:ios or npx expo run:android'
      );
      return null;
    }

    try {
      // Configure audio session for iOS speech recognition
      if (Platform.OS === 'ios') {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: false,
            staysActiveInBackground: false,
            playThroughEarpieceAndroid: false,
          });
          console.log('🎤 Audio session configured for recording');
        } catch (audioError) {
          console.log('🎤 Audio session config warning:', audioError);
        }
      }

      Voice.onSpeechStart = (event: any) => {
        console.log('🎤 Speech recognition started');
      };

      Voice.onSpeechRecognized = (event: any) => {
        console.log('🎤 Speech recognized', JSON.stringify(event));
      };

      Voice.onSpeechEnd = () => {
        console.log('🎤 Speech recognition ended');
        console.log('🎤 Speech ended - did we get any results before this?');
        onEnd();
      };

      Voice.onSpeechError = (event: any) => {
        console.log('🎤 Speech recognition error:', JSON.stringify(event));
        onError(
          `Speech recognition error: ${
            event.error?.message || event.error || 'Unknown error'
          }`
        );
      };

      Voice.onSpeechResults = (event: any) => {
        if (event.value && event.value.length > 0) {
          const transcript = event.value[0];
          console.log('🎤 Transcript:', transcript);
          if (transcript && transcript.trim()) {
            onResult(transcript.trim());
          }
        } else {
          console.log('🎤 No results in event:', event);
        }
      };

      // Optional: Handle partial results
      Voice.onSpeechPartialResults = (event: any) => {
        console.log('🎤 Partial results:', JSON.stringify(event));
        // Also try to get partial results for immediate feedback
        if (event.value && event.value.length > 0) {
          const transcript = event.value[0];
          console.log('🎤 Partial transcript:', transcript);
        }
      };

      // Reduce volume logging noise
      Voice.onSpeechVolumeChanged = (event: any) => {
        // Only log every 10th volume change to reduce noise
        if (Math.random() < 0.1) {
          console.log('🔊 Volume changed (sample):', JSON.stringify(event));
        }
      };

      // Check if Voice is available (includes permission check)
      const isAvailable = await Voice.isAvailable();
      console.log('🎤 Voice availability check:', isAvailable);
      if (!isAvailable) {
        onError('Microphone or speech recognition permission not granted');
        return null;
      }

      // Initialize Voice module if not loaded
      if (!Voice._loaded) {
        console.log('🎤 Voice module not loaded, initializing...');
        try {
          await Voice.isAvailable();
          console.log('🎤 Voice module initialization attempt completed');
        } catch (initError) {
          console.log('🎤 Voice module initialization failed:', initError);
        }
      }

      const locale = this.getVoiceLanguage(languageCode);

      try {
        if (Platform.OS === 'ios') {
          console.log('🎤 Requesting iOS speech recognition permissions...');
          try {
            await Voice.start(locale);
          } catch (permError) {
            console.log('🎤 Permission request failed:', permError);
          }
        }
      } catch (localeError) {
        console.log('🎤 Locale-specific start failed:', localeError);
      }

      return {
        stop: async () => {
          try {
            console.log('🎤 Stopping voice recognition...');

            // Clear all event listeners first to prevent callbacks
            Voice.onSpeechStart = null;
            Voice.onSpeechRecognized = null;
            Voice.onSpeechEnd = null;
            Voice.onSpeechError = null;
            Voice.onSpeechResults = null;
            Voice.onSpeechPartialResults = null;
            Voice.onSpeechVolumeChanged = null;

            await Voice.stop();
            await Voice.destroy();
            console.log('🎤 Voice stopped and destroyed');
          } catch (error) {
            console.error('🎤 Error stopping voice:', error);
          }
        },
      };
    } catch (error) {
      console.error('🎤 Voice initialization error:', error);
      onError(`Failed to initialize speech recognition: ${error}`);
      return null;
    }
  }
}
