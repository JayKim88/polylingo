import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { StorageService, VoiceSettings } from './storage';

export class SpeechService {
  static isAvailable(): boolean {
    if (Platform.OS === 'web') {
      return (
        'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
      );
    }
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  // Initialize audio session for better TTS control
  static async initializeAudio(): Promise<void> {
    if (Platform.OS !== 'web') {
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
        reject(new Error('음성 기능을 사용할 수 없습니다'));
        return;
      }

      // 사용자 설정 불러오기 (커스텀 설정이 없는 경우)
      const voiceSettings =
        customSettings || (await StorageService.getVoiceSettings());

      if (Platform.OS === 'web') {
        try {
          // 기존 음성 중지
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = this.getVoiceLanguage(languageCode);
          utterance.rate = voiceSettings.rate;
          utterance.pitch = voiceSettings.pitch;
          utterance.volume = voiceSettings.volume;

          utterance.onend = () => resolve();
          utterance.onerror = () =>
            reject(new Error('음성 재생 중 오류가 발생했습니다'));

          // 사용 가능한 음성 중에서 해당 언어의 음성 찾기
          const voices = window.speechSynthesis.getVoices();
          const targetVoice = voices.find(
            (voice) =>
              voice.lang.startsWith(languageCode) ||
              voice.lang.startsWith(this.getVoiceLanguage(languageCode))
          );

          if (targetVoice) {
            utterance.voice = targetVoice;
          }

          window.speechSynthesis.speak(utterance);
        } catch (error) {
          reject(error);
        }
      } else {
        // iOS와 Android는 expo-speech with improved audio session
        try {
          await this.initializeAudio();

          const speechOptions = {
            language: this.getVoiceLanguage(languageCode),
            rate: voiceSettings.rate,
            pitch: voiceSettings.pitch,
            volume: voiceSettings.volume,
            onDone: () => resolve(),
            onError: () =>
              reject(new Error('음성 재생 중 오류가 발생했습니다')),
          };

          Speech.speak(text, speechOptions);
        } catch (error) {
          console.error('🔊 Enhanced TTS error:', error);
          reject(error);
        }
      }
    });
  }

  // 음성 재생 중지
  static stop(): void {
    if (!this.isAvailable()) return;

    if (Platform.OS === 'web') {
      window.speechSynthesis.cancel();
    } else {
      Speech.stop();
    }
  }

  // Get platform information for debugging
  static getPlatformInfo(): string {
    return `Platform: ${Platform.OS}, TTS Available: ${this.isAvailable()}`;
  }
}
