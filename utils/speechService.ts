import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { StorageService, VoiceSettings } from './storage';

const GOOGLE_TTS_URL = 'https://translate.googleapis.com/translate_tts';
const GOOGLE_TTS_LANG_MAP: Record<string, string> = {
  zh: 'zh-TW',
};

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

  static async speakWithGoogle(text: string, languageCode: string, rate?: number): Promise<void> {
    const tl = GOOGLE_TTS_LANG_MAP[languageCode] ?? languageCode;
    // Map expo-speech rate (0.1–1.5) to Google TTS ttsspeed (0.3–1.0)
    const ttsspeed = rate != null
      ? Math.min(1.0, Math.max(0.3, rate)).toFixed(2)
      : '0.9';
    const params = new URLSearchParams([
      ['ie', 'UTF-8'],
      ['q', text],
      ['tl', tl],
      ['client', 'gtx'],
      ['ttsspeed', ttsspeed],
    ]);

    const url = `${GOOGLE_TTS_URL}?${params}`;
    await this.initializeAudio();

    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true }
    );

    return new Promise((resolve, reject) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          sound.unloadAsync();
          resolve();
        }
      });
      // 10초 타임아웃
      setTimeout(() => {
        sound.unloadAsync();
        reject(new Error('Google TTS timeout'));
      }, 10000);
    });
  }

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

      const voiceSettings = customSettings || (await StorageService.getVoiceSettings());

      if (voiceSettings.engine === 'system') {
        // System Voice: expo-speech with full pitch/rate/volume control
        try {
          await this.initializeAudio();
          Speech.speak(text, {
            language: this.getVoiceLanguage(languageCode),
            rate: voiceSettings.rate,
            pitch: voiceSettings.pitch,
            volume: voiceSettings.volume,
            onDone: () => resolve(),
            onError: () => reject(new Error('An error occurred while playing the voice.')),
          });
        } catch (error) {
          console.error('🔊 expo-speech error:', error);
          reject(error);
        }
        return;
      }

      // Google TTS (default): high quality, speed only
      try {
        await this.speakWithGoogle(text, languageCode, voiceSettings.rate);
        resolve();
        return;
      } catch (error) {
        console.log('🔊 Google TTS failed, falling back to expo-speech:', error);
      }

      // Fallback to expo-speech if Google TTS fails
      try {
        await this.initializeAudio();
        Speech.speak(text, {
          language: this.getVoiceLanguage(languageCode),
          rate: voiceSettings.rate,
          pitch: voiceSettings.pitch,
          volume: voiceSettings.volume,
          onDone: () => resolve(),
          onError: () => reject(new Error('An error occurred while playing the voice.')),
        });
      } catch (error) {
        console.error('🔊 expo-speech error:', error);
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
        } catch (audioError) {
          console.log('🎤 Audio session config warning:', audioError);
        }
      }

      Voice.onSpeechStart = (_event: any) => {};

      Voice.onSpeechRecognized = (_event: any) => {};

      Voice.onSpeechEnd = () => {
        onEnd();
      };

      Voice.onSpeechError = (event: any) => {
        const errorCode = event.error?.code;
        const errorMessage = event.error?.message || String(event.error || '');
        // 1110 = no speech detected (user was silent) — silently end
        if (
          errorCode === '1110' ||
          errorCode === 1110 ||
          errorMessage.includes('1110')
        ) {
          onEnd();
          return;
        }
        onError(`Speech recognition error: ${errorMessage || 'Unknown error'}`);
      };

      Voice.onSpeechResults = (event: any) => {
        if (event.value && event.value.length > 0) {
          const transcript = event.value[0];
          if (transcript && transcript.trim()) {
            onResult(transcript.trim());
          }
        }
      };

      Voice.onSpeechPartialResults = (_event: any) => {};

      Voice.onSpeechVolumeChanged = (_event: any) => {};

      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        onError('Microphone or speech recognition permission not granted');
        return null;
      }

      if (!Voice._loaded) {
        try {
          await Voice.isAvailable();
        } catch (initError) {
          console.log('🎤 Voice module initialization failed:', initError);
        }
      }

      const locale = this.getVoiceLanguage(languageCode);

      try {
        if (Platform.OS === 'ios') {
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
            Voice.onSpeechStart = null;
            Voice.onSpeechRecognized = null;
            Voice.onSpeechEnd = null;
            Voice.onSpeechError = null;
            Voice.onSpeechResults = null;
            Voice.onSpeechPartialResults = null;
            Voice.onSpeechVolumeChanged = null;

            await Voice.stop();
            await Voice.destroy();
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
