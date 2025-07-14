import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSubscription, SUBSCRIPTION_PLANS } from '../types/subscription';

const SUBSCRIPTION_KEY = 'user_subscription';
const DAILY_USAGE_KEY = 'daily_usage';

export class SubscriptionService {
  // 현재 구독 정보 가져오기
  static async getCurrentSubscription(): Promise<UserSubscription | null> {
    try {
      const subscriptionData = await AsyncStorage.getItem(SUBSCRIPTION_KEY);

      console.log('🔍 getCurrentSubscription: Raw subscription data:', subscriptionData);

      if (subscriptionData) {
        const subscription = JSON.parse(subscriptionData);
        console.log('🔍 getCurrentSubscription: Parsed subscription:', subscription);
        
        // 구독 만료 확인
        if (subscription.endDate && Date.now() > subscription.endDate) {
          console.log('🔍 getCurrentSubscription: Subscription expired, setting to free');
          // 만료된 구독은 Free로 변경
          await this.setSubscription('free');
          return this.getDefaultSubscription();
        }
        return subscription;
      }
      console.log('🔍 getCurrentSubscription: No subscription data found, returning default');
      return this.getDefaultSubscription();
    } catch (error) {
      console.error('Error getting subscription:', error);
      return this.getDefaultSubscription();
    }
  }

  // 구독 설정
  static async setSubscription(
    planId: string,
    isActive: boolean = true
  ): Promise<void> {
    try {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
      if (!plan) {
        console.error('🔍 setSubscription: Invalid plan ID:', planId);
        throw new Error('Invalid plan ID');
      }

      console.log('🔍 setSubscription: Setting subscription to plan:', plan);

      const now = Date.now();
      const endDate =
        plan.period === 'yearly'
          ? now + 365 * 24 * 60 * 60 * 1000 // 1년
          : now + 30 * 24 * 60 * 60 * 1000; // 1개월

      const subscription: UserSubscription = {
        planId,
        isActive,
        startDate: now,
        endDate: planId === 'free' ? 0 : endDate,
        dailyUsage: {
          date: new Date().toDateString(),
          count: 0,
        },
        isTrialUsed: false,
      };

      console.log('🔍 setSubscription: Saving subscription:', subscription);

      await AsyncStorage.setItem(
        SUBSCRIPTION_KEY,
        JSON.stringify(subscription)
      );

      console.log('🔍 setSubscription: Subscription saved successfully');
    } catch (error) {
      console.error('Error setting subscription:', error);
      throw error;
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

  // 일일 사용량 증가 (언어 수에 따라 차등 적용)
  static async incrementDailyUsage(languageCount: number = 1): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return false;

      const today = new Date().toDateString();

      // 날짜가 바뀌면 카운트 리셋
      if (subscription.dailyUsage.date !== today) {
        subscription.dailyUsage = {
          date: today,
          count: 0,
        };
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId);
      if (!plan) return false;

      // 언어 수에 따른 사용량 계산 (모든 플랜 공통)
      // Free: 최대 2개 언어 기준으로 100회
      // Pro/Pro Max/Premium: 최대 5개 언어 기준으로 각각의 한도
      const maxLanguages = plan.maxLanguages;
      const usageIncrement = languageCount / maxLanguages;

      // 일일 한도 확인
      if (subscription.dailyUsage.count + usageIncrement > plan.dailyTranslations) {
        return false; // 한도 초과
      }

      // 사용량 증가
      subscription.dailyUsage.count += usageIncrement;
      await AsyncStorage.setItem(
        SUBSCRIPTION_KEY,
        JSON.stringify(subscription)
      );

      console.log(`Daily usage incremented by ${usageIncrement} (${languageCount} languages)`);
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
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) {
        console.log('🔍 getDailyUsage: No subscription found, returning free defaults');
        return { used: 0, limit: 100, remaining: 100 };
      }

      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription.planId);
      if (!plan) {
        console.log('🔍 getDailyUsage: No plan found for planId:', subscription.planId);
        return { used: 0, limit: 100, remaining: 100 };
      }

      console.log('🔍 getDailyUsage: Found plan:', plan);
      console.log('🔍 getDailyUsage: Plan daily translations:', plan.dailyTranslations);

      const today = new Date().toDateString();
      let used = 0;

      // 오늘 날짜가 맞으면 사용량 가져오기
      if (subscription.dailyUsage.date === today) {
        used = subscription.dailyUsage.count;
      }

      const result = {
        used,
        limit: plan.dailyTranslations,
        remaining: Math.max(0, plan.dailyTranslations - used),
      };
      
      console.log('🔍 getDailyUsage: Returning result:', result);
      return result;
    } catch (error) {
      console.error('Error getting daily usage:', error);
      return { used: 0, limit: 100, remaining: 100 };
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

  // 개발 모드 전용: 일일 사용량 리셋
  static async resetDailyUsage(): Promise<void> {
    if (!__DEV__) return;
    
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return;

      subscription.dailyUsage = {
        date: new Date().toDateString(),
        count: 0,
      };

      await AsyncStorage.setItem(
        SUBSCRIPTION_KEY,
        JSON.stringify(subscription)
      );
      
      console.log('Daily usage reset for testing');
    } catch (error) {
      console.error('Error resetting daily usage:', error);
    }
  }

  // 개발 모드 전용: 일일 사용량 수동 설정
  static async setDailyUsage(count: number): Promise<void> {
    if (!__DEV__) return;
    
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return;

      subscription.dailyUsage = {
        date: new Date().toDateString(),
        count: Math.max(0, count),
      };

      await AsyncStorage.setItem(
        SUBSCRIPTION_KEY,
        JSON.stringify(subscription)
      );
      
      console.log(`Daily usage set to ${count} for testing`);
    } catch (error) {
      console.error('Error setting daily usage:', error);
    }
  }

  // 개발 모드 전용: 테스트용 낮은 한도 플랜 생성
  static async setTestLowLimit(): Promise<void> {
    if (!__DEV__) return;
    
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) return;

      // 임시로 SUBSCRIPTION_PLANS 수정 (개발 모드에서만)
      const originalPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
      if (originalPlan) {
        (originalPlan as any).dailyTranslations = 3;
      }

      console.log('Test mode: Daily limit set to 3 for easy testing');
    } catch (error) {
      console.error('Error setting test low limit:', error);
    }
  }
}
