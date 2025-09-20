import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_USER_KEY = 'isPremiumUser';

export class PremiumService {
  static async isPremiumUser(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(PREMIUM_USER_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Failed to get premium user status:', error);
      return false;
    }
  }

  static async setPremiumUser(isPremium: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(PREMIUM_USER_KEY, isPremium.toString());
    } catch (error) {
      console.error('Failed to set premium user status:', error);
    }
  }

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
