import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSubscription, SUBSCRIPTION_PLANS } from '../types/subscription';
import { SUPPORTED_LANGUAGES } from '../types/dictionary';
import { UserService } from './userService';
import { DeviceUsageService } from './deviceUsageService';

export const SUBSCRIPTION_KEY = 'user_subscription';
const DAILY_USAGE_KEY = 'daily_usage';
const LAST_SYNC_KEY = 'last_synced_usage';

export class SubscriptionService {
  /**
   * @description 현재 구독 정보 가져오기 (Supabase 동기화 포함)
   */
  static async getCurrentSubscription(): Promise<UserSubscription | null> {
    try {
      // Apple ID 로그인 상태 확인 (개발 모드에서는 우회)
      if (!__DEV__) {
        const { IAPService } = await import('./iapService');
        const isLoggedIn = IAPService.getAppleIDLoginState();

        if (!isLoggedIn) {
          console.log('🔒 Not logged in to Apple ID - enforcing free plan');
          return this.getDefaultSubscription();
        }
      }

      const serverSubscription =
        await UserService.getLatestSubscriptionFromServer();

      if (serverSubscription) {
        // 서버 구독 정보가 있으면 로컬과 동기화
        const subscription: UserSubscription = {
          planId: serverSubscription.plan_id,
          isActive: serverSubscription.is_active,
          startDate: new Date(serverSubscription.start_date).getTime(),
          endDate: serverSubscription.end_date
            ? new Date(serverSubscription.end_date).getTime()
            : 0,
          dailyUsage: {
            date: new Date().toDateString(),
            count: 0, // 하단의 일일 사용량 업데이트에서 로드
          },
          isTrialUsed: false,
        };

        // 만료 확인
        const isExpired =
          subscription.endDate && Date.now() > subscription.endDate;
        if (isExpired) {
          subscription.planId = 'free';
          subscription.isActive = false;
          subscription.endDate = 0;
          await this.setSubscription('free');
        }

        // 일일 사용량 로드
        const today = new Date().toDateString();
        const dailyUsageCount = await UserService.getDailyUsage(today);
        subscription.dailyUsage = {
          date: today,
          count: dailyUsageCount,
        };

        // 로컬 캐시 업데이트
        await AsyncStorage.setItem(
          SUBSCRIPTION_KEY,
          JSON.stringify(subscription)
        );
        return subscription;
      }

      // 서버 정보가 없으면 로컬 데이터 사용
      const subscriptionData = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      if (subscriptionData) {
        const subscription = JSON.parse(subscriptionData);

        const isSubscriptionExpired =
          subscription.endDate && Date.now() > subscription.endDate;

        if (isSubscriptionExpired) {
          await this.setSubscription('free');
          return this.getDefaultSubscription();
        }
        return subscription;
      }

      return this.getDefaultSubscription();
    } catch (error) {
      console.error('Error getting subscription:', error);

      // 에러 시 로컬 데이터 폴백
      try {
        const subscriptionData = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
        if (subscriptionData) {
          return JSON.parse(subscriptionData);
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }

      return this.getDefaultSubscription();
    }
  }

  /**
   * @description Supabase 동기화하여 구독 설정
   */
  static async setSubscription(
    planId: string,
    isActive: boolean = true
  ): Promise<void> {
    try {
      // Apple ID 로그인 상태 확인 (개발 모드에서는 우회)
      if (!__DEV__) {
        const { IAPService } = await import('./iapService');
        const isLoggedIn = IAPService.getAppleIDLoginState();

        // Apple ID 로그인하지 않은 경우 유료 플랜 설정 방지
        if (!isLoggedIn) {
          planId = 'free';
        }
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      if (!plan) {
        console.error('🔍 setSubscription: Invalid plan ID:', planId);
        throw new Error('Invalid plan ID');
      }

      const existingSubscription = await this.getExistingSubscriptionInLocal();

      const now = Date.now();
      const endDate =
        plan.period === 'yearly'
          ? now + 365 * 24 * 60 * 60 * 1000 // 1년
          : now + 30 * 24 * 60 * 60 * 1000; // 1개월

      const today = new Date().toDateString();

      // 기존 사용량 보존 (같은 날짜인 경우만)
      let preservedUsage = {
        date: today,
        count: 0,
      };

      const existingDailyUsage = existingSubscription?.dailyUsage;

      if (existingDailyUsage && existingDailyUsage.date === today) {
        preservedUsage = existingDailyUsage;
      }

      const subscription: UserSubscription = {
        planId,
        isActive,
        startDate: now,
        endDate: planId === 'free' ? 0 : endDate,
        dailyUsage: preservedUsage,
        isTrialUsed: existingSubscription?.isTrialUsed || false,
      };

      // 로컬 저장
      await AsyncStorage.setItem(
        SUBSCRIPTION_KEY,
        JSON.stringify(subscription)
      );

      // 서버에 동기화 (백그라운드에서 실행, 실패해도 에러 던지지 않음)
      UserService.syncSubscription(planId, isActive).catch((error) => {
        console.warn('Failed to sync subscription to server:', error);
      });

      console.log('Subscription set:', planId, isActive);
    } catch (error) {
      console.error('Error setting subscription:', error);
      throw error;
    }
  }

  // 로컬에서 기존 구독 정보 가져오기 (getCurrentSubscription과 달리 서버 동기화 없음)
  private static async getExistingSubscriptionInLocal(): Promise<UserSubscription | null> {
    try {
      const subscriptionData = await AsyncStorage.getItem(SUBSCRIPTION_KEY);

      return subscriptionData ? JSON.parse(subscriptionData) : null;
    } catch (error) {
      console.error('Error getting existing subscription:', error);
      return null;
    }
  }

  // 기본 구독 (Free) 반환
  static getDefaultSubscription(): UserSubscription {
    return {
      planId: 'free',
      isActive: true,
      startDate: Date.now(),
      endDate: 0,
      dailyUsage: {
        date: new Date().toDateString(),
        count: 0,
      },
      isTrialUsed: false,
    };
  }

  // 번역 사용 가능 여부 확인 (실제 사용량은 증가시키지 않음)
  static async canUseTranslation(languageCount: number = 1): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return false;

      // Apple ID 없는 무료 사용자의 경우 디바이스 기반 제한 적용
      if (subscription.planId === 'free') {
        const { IAPService } = await import('./iapService');
        const isLoggedIn = __DEV__ ? true : IAPService.getAppleIDLoginState();

        if (!isLoggedIn) {
          // 디바이스 기반 사용량 검사 (실제 증가는 하지 않음)
          const plan = SUBSCRIPTION_PLANS.find((p) => p.id === 'free');
          if (!plan) return false;

          const maxLanguages = plan.maxLanguages;
          const usageIncrement = languageCount / maxLanguages;

          const deviceStats = await DeviceUsageService.getCurrentUsageStats();
          return deviceStats.daily.remaining >= usageIncrement;
        }
      }

      const today = new Date().toDateString();
      const resetRequired = subscription.dailyUsage.date !== today;

      // 날짜가 바뀌면 카운트 리셋
      if (resetRequired) {
        subscription.dailyUsage = {
          date: today,
          count: 0,
        };
        // 날짜가 바뀐 경우 저장
        await AsyncStorage.setItem(
          SUBSCRIPTION_KEY,
          JSON.stringify(subscription)
        );
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId);
      if (!plan) return false;

      const maxLanguages = plan.maxLanguages;
      const usageIncrement = languageCount / maxLanguages;

      return (
        subscription.dailyUsage.count + usageIncrement <= plan.dailyTranslations
      );
    } catch (error) {
      console.error('Error checking translation usage:', error);
      return false;
    }
  }

  // 일일 사용량 증가 (언어 수에 따라 차등 적용, Supabase 동기화 포함)
  static async incrementDailyUsage(
    languageCount: number = 1
  ): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return false;

      // Apple ID 없는 무료 사용자의 경우 디바이스 기반 사용량 관리
      if (subscription.planId === 'free') {
        const { IAPService } = await import('./iapService');
        const isLoggedIn = !__DEV__ ? IAPService.getAppleIDLoginState() : true;

        if (!isLoggedIn) {
          const plan = SUBSCRIPTION_PLANS.find((p) => p.id === 'free');
          if (!plan) return false;

          const maxLanguages = plan.maxLanguages;
          const usageIncrement = languageCount / maxLanguages;

          // 디바이스 기반 사용량 증가 및 제한 검사
          const result = await DeviceUsageService.incrementUsageWithLimits(
            usageIncrement
          );

          if (!result.allowed) {
            console.log('Device usage limit exceeded:', result.reason);
            return false;
          }

          console.log(
            'Device usage incremented:',
            usageIncrement,
            'remaining daily:',
            result.remainingDaily
          );
          return true;
        }
      }

      const today = new Date().toDateString();
      const resetRequired = subscription.dailyUsage.date !== today;

      if (resetRequired) {
        subscription.dailyUsage = {
          date: today,
          count: 0,
        };
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId);
      if (!plan) return false;

      /**
       * @description 언어 수에 따른 사용량 계산 (모든 플랜 공통)
       * Free: 최대 2개 언어 기준으로 100회
       * Pro/Pro Max/Premium: 최대 5개 언어 기준으로 각각의 한도
       */
      const maxLanguages = plan.maxLanguages;
      const usageIncrement = languageCount / maxLanguages;

      const usedOverDailyTranslation =
        subscription.dailyUsage.count + usageIncrement > plan.dailyTranslations;

      if (usedOverDailyTranslation) {
        return false; // 한도 초과
      }

      subscription.dailyUsage.count += usageIncrement;

      // 로컬 저장
      await AsyncStorage.setItem(
        SUBSCRIPTION_KEY,
        JSON.stringify(subscription)
      );

      // 서버에 증분 동기화 (백그라운드에서 실행)
      this.syncDailyUsageIncremental(today, subscription.dailyUsage.count).catch(
        (error) => {
          console.warn('Failed to sync daily usage to server:', error);
        }
      );

      console.log(
        'Daily usage incremented:',
        today,
        subscription.dailyUsage.count
      );
      return true;
    } catch (error) {
      console.error('Error incrementing daily usage:', error);
      return false;
    }
  }

  // 일일 사용량 확인
  static async getDailyUsage(): Promise<{
    used: number;
    limit: number;
    remaining: number;
  }> {
    const freeUsage = { used: 0, limit: 100, remaining: 100 };
    try {
      const subscription = await this.getCurrentSubscription();

      if (!subscription) {
        return freeUsage;
      }

      // Apple ID 없는 무료 사용자의 경우 디바이스 기반 사용량 반환
      if (subscription.planId === 'free') {
        const { IAPService } = await import('./iapService');
        const isLoggedIn = !__DEV__ ? IAPService.getAppleIDLoginState() : true;

        if (!isLoggedIn) {
          const deviceStats = await DeviceUsageService.getCurrentUsageStats();
          return deviceStats.daily;
        }
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId);

      if (!plan) {
        return freeUsage;
      }

      const today = new Date().toDateString();
      let used = 0;

      if (subscription.dailyUsage.date === today) {
        used = subscription.dailyUsage.count;
      }

      const result = {
        used,
        limit: plan.dailyTranslations,
        remaining: Math.max(0, plan.dailyTranslations - used),
      };

      return result;
    } catch (error) {
      console.error('Error getting daily usage:', error);
      return freeUsage;
    }
  }

  // 프리미엄 사용자 여부 확인
  static async isPremiumUser(): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      return subscription?.planId !== 'free' && subscription?.isActive === true;
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  // 최대 언어 수 가져오기 (선택 가능한 총 언어 수: 소스 언어 + 타겟 언어)
  static async getMaxLanguages(): Promise<number> {
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return 3; // Free plan: 2 target + 1 source = 3 total

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId);

      // maxLanguages는 타겟 언어 수이므로, 소스 언어 1개를 더해서 총 선택 가능한 언어 수 반환
      return (plan?.maxLanguages || 2) + 1;
    } catch (error) {
      console.error('Error getting max languages:', error);
      return 3; // Free plan fallback: 2 target + 1 source = 3 total
    }
  }

  // 광고 표시 여부 확인
  static async shouldShowAds(): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return true;

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId);
      return plan?.hasAds ?? true;
    } catch (error) {
      console.error('Error checking ads status:', error);
      return true;
    }
  }

  // 플랜에 맞는 기본 언어 선택 반환 (Free: 3개, 유료: 6개)
  static async getDefaultLanguageSelection(): Promise<string[]> {
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription)
        return SUPPORTED_LANGUAGES.slice(0, 3).map((lang) => lang.code);

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId);
      const maxLanguages = plan?.maxLanguages || 2;

      // 소스 언어 1개 + 타겟 언어들
      return SUPPORTED_LANGUAGES.slice(0, maxLanguages + 1).map(
        (lang) => lang.code
      );
    } catch (error) {
      console.error('Error getting default language selection:', error);
      return SUPPORTED_LANGUAGES.slice(0, 3).map((lang) => lang.code);
    }
  }


  // 구독 설정과 함께 언어 설정 초기화
  static async setSubscriptionWithLanguageReset(
    planId: string,
    isActive: boolean = true
  ): Promise<void> {
    try {
      await this.setSubscription(planId, isActive);
      const defaultLanguages = await this.getDefaultLanguageSelection();

      const { StorageService } = await import('./storage');
      await StorageService.saveSelectedLanguages(defaultLanguages);
    } catch (error) {
      console.error('Error setting subscription with language reset:', error);
      throw error;
    }
  }

  // 마지막 동기화된 사용량 조회
  private static async getLastSyncedUsage(date: string): Promise<number> {
    try {
      const syncData = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (!syncData) return 0;

      const parsed = JSON.parse(syncData);
      return parsed[date] || 0;
    } catch (error) {
      console.error('Error getting last synced usage:', error);
      return 0;
    }
  }

  // 마지막 동기화된 사용량 저장
  private static async setLastSyncedUsage(date: string, count: number): Promise<void> {
    try {
      const syncData = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const parsed = syncData ? JSON.parse(syncData) : {};
      
      parsed[date] = count;
      
      // 30일 이전 데이터 정리
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
      
      Object.keys(parsed).forEach(syncDate => {
        if (syncDate < cutoffDate) {
          delete parsed[syncDate];
        }
      });

      await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error('Error setting last synced usage:', error);
    }
  }

  // 증분 방식으로 일일 사용량 동기화
  private static async syncDailyUsageIncremental(
    date: string,
    currentUsageCount: number
  ): Promise<void> {
    try {
      const lastSyncedCount = await this.getLastSyncedUsage(date);
      
      const success = await UserService.syncDailyUsageIncremental(
        date,
        currentUsageCount,
        lastSyncedCount
      );

      if (success) {
        // 동기화 성공 시 마지막 동기화된 사용량 업데이트
        await this.setLastSyncedUsage(date, currentUsageCount);
        console.log(`Incremental sync completed for ${date}: ${currentUsageCount} (increment: ${currentUsageCount - lastSyncedCount})`);
      }
    } catch (error) {
      console.error('Incremental sync failed:', error);
      throw error;
    }
  }
}
