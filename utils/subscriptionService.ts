import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSubscription, SUBSCRIPTION_PLANS } from '../types/subscription';
import { SUPPORTED_LANGUAGES } from '../types/dictionary';
import { UserService } from './userService';
import { DeviceUsageService } from './deviceUsageService';

const STORAGE_KEYS = {
  SUBSCRIPTION: 'user_subscription',
  DAILY_USAGE: 'daily_usage',
  LAST_SYNC: 'last_synced_usage',
} as const;

type SubscriptionUpdateOptions = {
  isActive?: boolean;
  preserveUsage?: boolean;
};

export class SubscriptionService {
  private static isUpdating = false;

  static async getCurrentSubscription(): Promise<UserSubscription | null> {
    if (this.isUpdating) {
      console.log(
        'Subscription update in progress. Returning local data to avoid race condition.'
      );
      const localData = await this.getExistingSubscriptionInLocal();
      return localData || this.getDefaultSubscription();
    }

    try {
      if (!(await this.isAppleIDLoggedIn())) {
        return this.getDefaultSubscription();
      }

      const serverSubscription =
        await UserService.getLatestSubscriptionFromServer();
      if (serverSubscription) {
        return await this.processServerSubscription(serverSubscription);
      }

      return await this.getLocalSubscriptionOrDefault();
    } catch (error) {
      return await this.handleSubscriptionError(error);
    }
  }

  private static async isAppleIDLoggedIn(): Promise<boolean> {
    if (__DEV__) return true;

    try {
      const { IAPService } = await import('./iapService');
      const isLoggedIn = IAPService.getAppleIDLoginState();
      if (!isLoggedIn) {
        console.log('🔒 Not logged in to Apple ID - enforcing free plan');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking Apple ID login state:', error);
      return false;
    }
  }

  private static async processServerSubscription(
    serverSubscription: any
  ): Promise<UserSubscription> {
    const subscription: UserSubscription = {
      planId: serverSubscription.plan_id,
      isActive: serverSubscription.is_active,
      startDate: new Date(serverSubscription.start_date).getTime(),
      endDate: serverSubscription.end_date
        ? new Date(serverSubscription.end_date).getTime()
        : 0,
      dailyUsage: { date: new Date().toDateString(), count: 0 },
      isTrialUsed: false,
    };

    if (this.isSubscriptionExpired(subscription)) {
      subscription.planId = 'free';
      subscription.isActive = false;
      subscription.endDate = 0;
      await this.setSubscription('free');
    }

    await this.updateDailyUsage(subscription);
    await this.cacheSubscription(subscription);
    return subscription;
  }

  private static isSubscriptionExpired(
    subscription: UserSubscription
  ): boolean {
    return subscription.endDate > 0 && Date.now() > subscription.endDate;
  }

  private static async updateDailyUsage(
    subscription: UserSubscription
  ): Promise<void> {
    const today = new Date().toDateString();
    const dailyUsageCount = await UserService.getDailyUsage(today);
    subscription.dailyUsage = { date: today, count: dailyUsageCount };
  }

  private static async cacheSubscription(
    subscription: UserSubscription
  ): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SUBSCRIPTION,
      JSON.stringify(subscription)
    );
  }

  private static async getLocalSubscriptionOrDefault(): Promise<UserSubscription> {
    const subscriptionData = await AsyncStorage.getItem(
      STORAGE_KEYS.SUBSCRIPTION
    );
    if (!subscriptionData) {
      return this.getDefaultSubscription();
    }

    const subscription = JSON.parse(subscriptionData);
    if (this.isSubscriptionExpired(subscription)) {
      await this.setSubscription('free');
      return this.getDefaultSubscription();
    }

    return subscription;
  }

  private static async handleSubscriptionError(
    error: unknown
  ): Promise<UserSubscription> {
    console.error('Error getting subscription:', error);

    try {
      const subscriptionData = await AsyncStorage.getItem(
        STORAGE_KEYS.SUBSCRIPTION
      );
      if (subscriptionData) {
        return JSON.parse(subscriptionData);
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }

    return this.getDefaultSubscription();
  }

  static async setSubscription(
    planId: string,
    options: SubscriptionUpdateOptions = {}
  ): Promise<void> {
    if (this.isUpdating) {
      console.log('Subscription update already in progress. Skipping.');
      return;
    }

    this.isUpdating = true;
    try {
      const finalPlanId = await this.validateAndAdjustPlanId(planId);
      const plan = this.validatePlan(finalPlanId);

      const subscription = await this.buildSubscription(
        finalPlanId,
        plan,
        options
      );

      await this.saveSubscription(subscription);
      await this.syncToServer(subscription);

      console.log('Subscription set:', finalPlanId, options.isActive ?? true);
    } catch (error) {
      console.error('Error setting subscription:', error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  private static async validateAndAdjustPlanId(
    planId: string
  ): Promise<string> {
    if (__DEV__) return planId;

    const isLoggedIn = await this.isAppleIDLoggedIn();
    return isLoggedIn ? planId : 'free';
  }

  private static validatePlan(planId: string) {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      console.error('🔍 setSubscription: Invalid plan ID:', planId);
      throw new Error('Invalid plan ID');
    }
    return plan;
  }

  private static async buildSubscription(
    planId: string,
    plan: any,
    options: SubscriptionUpdateOptions
  ): Promise<UserSubscription> {
    const existingSubscription = await this.getExistingSubscriptionInLocal();
    const now = Date.now();
    const endDate = this.calculateEndDate(plan, now);
    const preservedUsage = this.calculatePreservedUsage(
      existingSubscription,
      planId,
      options.preserveUsage
    );

    return {
      planId,
      isActive: options.isActive ?? true,
      startDate: now,
      endDate: planId === 'free' ? 0 : endDate,
      dailyUsage: preservedUsage,
      isTrialUsed: existingSubscription?.isTrialUsed || false,
    };
  }

  private static calculateEndDate(plan: any, now: number): number {
    const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    return plan.period === 'yearly' ? now + YEAR_MS : now + MONTH_MS;
  }

  private static calculatePreservedUsage(
    existingSubscription: UserSubscription | null,
    newPlanId: string,
    preserveUsage?: boolean
  ) {
    const today = new Date().toDateString();
    const defaultUsage = { date: today, count: 0 };

    if (!existingSubscription?.dailyUsage) {
      return defaultUsage;
    }

    const existingDailyUsage = existingSubscription.dailyUsage;
    const isChangePlan = existingSubscription.planId !== newPlanId;
    const shouldPreserve =
      (!isChangePlan || preserveUsage) && existingDailyUsage.date === today;

    return shouldPreserve ? existingDailyUsage : defaultUsage;
  }

  private static async saveSubscription(
    subscription: UserSubscription
  ): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SUBSCRIPTION,
      JSON.stringify(subscription)
    );
  }

  private static async syncToServer(
    subscription: UserSubscription
  ): Promise<void> {
    try {
      await Promise.all([
        UserService.syncSubscription(
          subscription.planId,
          subscription.isActive
        ),
        UserService.syncDailyUsage(
          subscription.dailyUsage.date,
          subscription.dailyUsage.count
        ),
      ]);
    } catch (error) {
      console.warn('Failed to sync subscription/usage to server:', error);
    }
  }

  private static async getExistingSubscriptionInLocal(): Promise<UserSubscription | null> {
    try {
      const subscriptionData = await AsyncStorage.getItem(
        STORAGE_KEYS.SUBSCRIPTION
      );
      return subscriptionData ? JSON.parse(subscriptionData) : null;
    } catch (error) {
      console.error('Error getting existing subscription:', error);
      return null;
    }
  }

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
          STORAGE_KEYS.SUBSCRIPTION,
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
        const isLoggedIn = __DEV__ ? true : IAPService.getAppleIDLoginState();

        if (!isLoggedIn) {
          const plan = SUBSCRIPTION_PLANS.find((p) => p.id === 'free');
          if (!plan) return false;

          const maxLanguages = plan.maxLanguages;
          const usageIncrement = languageCount / maxLanguages;

          const result = await DeviceUsageService.incrementUsageWithLimits(
            usageIncrement
          );

          if (!result.allowed) {
            console.log('Device usage limit exceeded:', result.reason);
            return false;
          }

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

      await AsyncStorage.setItem(
        STORAGE_KEYS.SUBSCRIPTION,
        JSON.stringify(subscription)
      );

      UserService.syncDailyUsage(today, subscription.dailyUsage.count).catch(
        (error) => {
          console.warn('Failed to sync daily usage to server:', error);
        }
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

      if (!subscription) return freeUsage;

      // Apple ID 없는 무료 사용자의 경우 디바이스 기반 사용량 반환
      if (subscription.planId === 'free') {
        const { IAPService } = await import('./iapService');
        const isLoggedIn = __DEV__ ? true : IAPService.getAppleIDLoginState();

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
  static async getDefaultLanguageSelection(planId: string): Promise<string[]> {
    try {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
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
      await this.setSubscription(planId, { isActive });
      const defaultLanguages = await this.getDefaultLanguageSelection(planId);

      const { StorageService } = await import('./storage');
      await StorageService.saveSelectedLanguages(defaultLanguages);
    } catch (error) {
      console.error('Error setting subscription with language reset:', error);
      throw error;
    }
  }
}
