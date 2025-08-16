import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSubscription, SUBSCRIPTION_PLANS } from '../types/subscription';
import { SUPPORTED_LANGUAGES } from '../types/dictionary';
import { UserService, getDateString } from './userService';
import { DeviceUsageService } from './deviceUsageService';

const STORAGE_KEYS = {
  SUBSCRIPTION: 'user_subscription',
  DAILY_USAGE: 'daily_usage',
  LAST_SYNC: 'last_synced_usage',
} as const;

type SubscriptionUpdateOptions = {
  isActive?: boolean;
  preserveUsage?: boolean;
  startDate?: number; // Apple-provided start date
  endDate?: number; // Apple-provided end date
};

export class SubscriptionService {
  private static isUpdating = false;
  private static subscriptionPromise: Promise<UserSubscription | null> | null =
    null;

  static async getCurrentSubscription(): Promise<UserSubscription | null> {
    // 이미 요청이 진행 중이면 같은 Promise 반환
    if (this.subscriptionPromise) {
      return await this.subscriptionPromise;
    }

    if (this.isUpdating) {
      console.log(
        'Subscription update in progress. Returning local data to avoid race condition.'
      );
      return await this.getLocalSubscriptionOrDefault();
    }

    this.subscriptionPromise = this.fetchSubscription();

    try {
      const result = await this.subscriptionPromise;
      return result;
    } finally {
      this.subscriptionPromise = null; // 완료 후 초기화
    }
  }

  private static async fetchSubscription(): Promise<UserSubscription | null> {
    try {
      // Try to get subscription by transaction ID first (if available from purchases)
      const serverSubscription =
        await this.getServerSubscriptionByTransaction();
      if (serverSubscription) {
        return await this.processServerSubscription(serverSubscription);
      }

      return await this.getLocalSubscriptionOrDefault();
    } catch (error) {
      return await this.handleSubscriptionError(error);
    }
  }

  private static async getServerSubscriptionByTransaction(): Promise<
    any | null
  > {
    try {
      // Try to get stored transaction ID first
      const transactionId = await UserService.getCurrentTransactionId();
      if (transactionId) {
        const serverSubscription =
          await UserService.getLatestSubscriptionFromServer(transactionId);
        return serverSubscription;
      }

      // If no stored transaction ID, user hasn't made any purchases yet
      return null;
    } catch (error) {
      console.warn('Failed to get subscription by transaction:', error);
      return null;
    }
  }

  // Apple ID login check removed - using transaction-based identification

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
      dailyUsage: { date: getDateString(), count: 0 },
      isTrialUsed: false,
      originalTransactionIdentifierIOS:
        serverSubscription.original_transaction_identifier_ios,
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
    const today = getDateString();
    const dailyUsageCount = await UserService.getDailyUsage(
      today,
      subscription.originalTransactionIdentifierIOS,
      subscription.startDate,
      subscription.endDate
    );
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
    options: SubscriptionUpdateOptions = {},
    originalTransactionIdentifierIOS?: string
  ): Promise<void> {
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;

    try {
      const plan = this.validatePlan(planId);

      const subscription = await this.buildSubscription(
        planId,
        plan,
        options,
        originalTransactionIdentifierIOS
      );

      await this.saveSubscription(subscription);
      await this.syncToServer(subscription, originalTransactionIdentifierIOS);

      // Sentry 구독 컨텍스트 업데이트
      try {
        const { updateSubscriptionContext } = await import('./sentryUtils');
        await updateSubscriptionContext(subscription);
      } catch (sentryError) {
        console.warn(
          'Failed to update Sentry subscription context:',
          sentryError
        );
      }
    } catch (error) {
      console.error('Error setting subscription:', error);
      // 이미 syncToServer에서 free로 롤백되었으므로 에러만 던짐
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  private static validatePlan(planId: string) {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new Error('Invalid plan ID');
    }
    return plan;
  }

  private static async buildSubscription(
    planId: string,
    plan: any,
    options: SubscriptionUpdateOptions,
    originalTransactionIdentifierIOS?: string
  ): Promise<UserSubscription> {
    const existingSubscription = await this.getExistingSubscriptionInLocal();

    const startDate = options.startDate || Date.now();
    const endDate =
      options.endDate ||
      (planId === 'free' ? 0 : this.calculateEndDate(plan, startDate));
    const today = getDateString();
    const finalTransactionId =
      originalTransactionIdentifierIOS ||
      (await UserService.getCurrentTransactionId());

    const todayUsageFromServer = await UserService.getDailyUsage(
      today,
      finalTransactionId,
      options.startDate,
      options.endDate
    );
    const serverSubscription =
      await UserService.getLatestSubscriptionFromServer(
        finalTransactionId,
        options.startDate,
        options.endDate
      );

    const currentPlan = serverSubscription
      ? serverSubscription.plan_id
      : existingSubscription
      ? existingSubscription.planId
      : null;

    const isNewPlan = currentPlan !== planId;

    const currentUsage =
      todayUsageFromServer ||
      (existingSubscription?.dailyUsage.date === today
        ? existingSubscription.dailyUsage.count
        : 0);

    const finalUsage = isNewPlan || !options.preserveUsage ? 0 : currentUsage;

    return {
      planId,
      isActive: options.isActive ?? true,
      startDate,
      endDate,
      dailyUsage: {
        date: today,
        count: finalUsage,
      },
      isTrialUsed: existingSubscription?.isTrialUsed || false,
      originalTransactionIdentifierIOS:
        finalTransactionId ||
        existingSubscription?.originalTransactionIdentifierIOS,
    };
  }

  private static calculateEndDate(plan: any, now: number): number {
    const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    return plan.period === 'yearly' ? now + YEAR_MS : now + MONTH_MS;
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
    subscription: UserSubscription,
    originalTransactionIdentifierIOS?: string
  ): Promise<void> {
    const finalTransactionId =
      originalTransactionIdentifierIOS ||
      subscription.originalTransactionIdentifierIOS ||
      (await UserService.getCurrentTransactionId());

    if (!finalTransactionId) {
      console.warn('No transaction ID available for server sync');
      return;
    }

    try {
      await Promise.all([
        UserService.syncSubscription(
          subscription.planId,
          subscription.isActive,
          subscription.startDate,
          subscription.endDate,
          finalTransactionId
        ),
        UserService.syncDailyUsage(
          subscription.dailyUsage.date,
          subscription.dailyUsage.count,
          subscription.startDate,
          subscription.endDate,
          finalTransactionId
        ),
      ]);
    } catch (error) {
      console.warn('Failed to sync subscription/usage to server:', error);
      const freeSubscription = this.getDefaultSubscription();
      await this.saveSubscription(freeSubscription);
      throw error; // 에러를 다시 throw하여 상위에서 처리할 수 있도록 함
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
        date: getDateString(),
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

      // For free users without purchases, use device-based usage tracking
      if (
        subscription.planId === 'free' &&
        !subscription.originalTransactionIdentifierIOS
      ) {
        // Device-based usage check (doesn't actually increment)
        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === 'free');
        if (!plan) return false;

        const maxLanguages = plan.maxLanguages;
        const usageIncrement = languageCount / maxLanguages;

        const deviceStats = await DeviceUsageService.getCurrentUsageStats();
        return deviceStats.daily.remaining >= usageIncrement;
      }

      const today = getDateString();
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

      // For free users without purchases, use device-based usage management
      if (
        subscription.planId === 'free' &&
        !subscription.originalTransactionIdentifierIOS
      ) {
        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === 'free');
        if (!plan) return false;

        const maxLanguages = plan.maxLanguages;
        const usageIncrement = languageCount / maxLanguages;

        const result = await DeviceUsageService.incrementUsageWithLimits(
          usageIncrement
        );

        if (!result.allowed) {
          return false;
        }

        return true;
      }

      const today = getDateString();
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

      UserService.syncDailyUsage(
        today,
        subscription.dailyUsage.count,
        subscription.startDate,
        subscription.endDate,
        subscription.originalTransactionIdentifierIOS
      ).catch((error) => {
        console.warn('Failed to sync daily usage to server:', error);
      });

      // Sentry 구독 컨텍스트 업데이트 (사용량 변경)
      try {
        const { updateSubscriptionContext } = await import('./sentryUtils');
        await updateSubscriptionContext(subscription);
      } catch (sentryError) {
        console.warn(
          'Failed to update Sentry context after usage increment:',
          sentryError
        );
      }

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

      // For free users without purchases, return device-based usage
      if (
        subscription.planId === 'free' &&
        !subscription.originalTransactionIdentifierIOS
      ) {
        const deviceStats = await DeviceUsageService.getCurrentUsageStats();
        return deviceStats.daily;
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId);

      if (!plan) {
        return freeUsage;
      }

      const today = getDateString();
      let used = 0;

      if (subscription.originalTransactionIdentifierIOS) {
        try {
          const serverUsage = await UserService.getDailyUsage(
            today,
            subscription.originalTransactionIdentifierIOS,
            subscription.startDate,
            subscription.endDate
          );
          used = serverUsage;
        } catch (error) {
          console.warn('Failed to get server usage, using local:', error);
          if (subscription.dailyUsage.date === today) {
            used = subscription.dailyUsage.count;
          }
        }
      } else {
        // No transaction ID, use local data
        if (subscription.dailyUsage.date === today) {
          used = subscription.dailyUsage.count;
        }
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
    isActive: boolean = true,
    originalTransactionIdentifierIOS?: string
  ): Promise<void> {
    try {
      await this.setSubscription(
        planId,
        { isActive },
        originalTransactionIdentifierIOS
      );
      const defaultLanguages = await this.getDefaultLanguageSelection(planId);

      const { StorageService } = await import('./storage');
      await StorageService.saveSelectedLanguages(defaultLanguages);
    } catch (error) {
      console.error('Error setting subscription with language reset:', error);
      throw error;
    }
  }
}
