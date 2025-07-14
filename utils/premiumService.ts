import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_USER_KEY = 'isPremiumUser';

export class PremiumService {
  /**
   * 프리미엄 사용자 상태를 확인합니다
   */
  static async isPremiumUser(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(PREMIUM_USER_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Failed to get premium user status:', error);
      return false;
    }
  }

  /**
   * 프리미엄 사용자 상태를 설정합니다
   */
  static async setPremiumUser(isPremium: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(PREMIUM_USER_KEY, isPremium.toString());
    } catch (error) {
      console.error('Failed to set premium user status:', error);
    }
  }

  /**
   * 광고를 표시할지 결정합니다
   */
  static async shouldShowAds(): Promise<boolean> {
    try {
      const isPremium = await this.isPremiumUser();
      return !isPremium;
    } catch (error) {
      console.error('Failed to check if should show ads:', error);
      return true; // 에러 시 광고 표시
    }
  }
}