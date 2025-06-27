import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

export class SpeechService {
  static isAvailable(): boolean {
    if (Platform.OS === 'web') {
      return (
        'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
      );
    }
    return Platform.OS === 'ios' || Platform.OS === 'android';
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

  // 텍스트를 음성으로 읽기
  static speak(text: string, languageCode: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!this.isAvailable()) {
        reject(new Error('음성 기능을 사용할 수 없습니다'));
        return;
      }

      if (Platform.OS === 'web') {
        try {
          // 기존 음성 중지
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = this.getVoiceLanguage(languageCode);
          utterance.rate = 0.8; // 조금 느리게
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onend = () => resolve();
          utterance.onerror = (event) =>
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
        // iOS와 Android는 expo-speech 사용
        try {
          await Speech.speak(text, {
            language: this.getVoiceLanguage(languageCode),
            rate: 0.8,
            pitch: 1.0,
            volume: 1.0,
            onDone: () => resolve(),
            onError: (error) =>
              reject(new Error('음성 재생 중 오류가 발생했습니다')),
          });
        } catch (error) {
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
