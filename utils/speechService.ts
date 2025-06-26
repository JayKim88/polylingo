import { Platform } from 'react-native';

export class SpeechService {
  // 웹에서 TTS 사용 가능 여부 확인
  static isAvailable(): boolean {
    if (Platform.OS === 'web') {
      return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    }
    return false;
  }

  // 언어 코드를 TTS에서 사용하는 언어 코드로 변환
  static getVoiceLanguage(languageCode: string): string {
    const languageMap: { [key: string]: string } = {
      'ko': 'ko-KR',
      'en': 'en-US',
      'ja': 'ja-JP',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'es': 'es-ES',
    };
    return languageMap[languageCode] || 'en-US';
  }

  // 텍스트를 음성으로 읽기
  static speak(text: string, languageCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
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
          utterance.onerror = (event) => reject(new Error('음성 재생 중 오류가 발생했습니다'));

          // 사용 가능한 음성 중에서 해당 언어의 음성 찾기
          const voices = window.speechSynthesis.getVoices();
          const targetVoice = voices.find(voice => 
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
        reject(new Error('이 플랫폼에서는 음성 기능을 지원하지 않습니다'));
      }
    });
  }

  // 음성 재생 중지
  static stop(): void {
    if (this.isAvailable() && Platform.OS === 'web') {
      window.speechSynthesis.cancel();
    }
  }

  // 사용 가능한 음성 목록 가져오기
  static getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.isAvailable() && Platform.OS === 'web') {
      return window.speechSynthesis.getVoices();
    }
    return [];
  }
}