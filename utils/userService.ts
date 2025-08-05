import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  supabase,
  isSupabaseAvailable,
  DatabaseSubscription,
} from './supabase';

// Utility function to get consistent date format (YYYY-MM-DD)
export const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const TRANSACTION_ID_KEY = 'original_transaction_identifier_ios';

export class UserService {
  private static currentTransactionId: string | null = null;

  // Transaction ID 관리 메소드들
  static async saveTransactionId(transactionId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TRANSACTION_ID_KEY, transactionId);
      this.currentTransactionId = transactionId;
      console.log('Transaction ID saved:', transactionId);
    } catch (error) {
      console.error('Failed to save transaction ID:', error);
    }
  }

  static async getCurrentTransactionId(): Promise<string | null> {
    if (this.currentTransactionId) {
      return this.currentTransactionId;
    }

    try {
      const stored = await AsyncStorage.getItem(TRANSACTION_ID_KEY);
      this.currentTransactionId = stored;
      return stored;
    } catch (error) {
      console.error('Failed to get transaction ID:', error);
      return null;
    }
  }

  static async clearTransactionId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TRANSACTION_ID_KEY);
      this.currentTransactionId = null;
    } catch (error) {
      console.error('Failed to clear transaction ID:', error);
    }
  }

  // Transaction ID 복원 (단순히 로컬에 저장)
  static async restoreUserByTransactionId(
    originalTransactionId: string
  ): Promise<boolean> {
    try {
      if (!originalTransactionId) {
        console.error('Original transaction ID is required');
        return false;
      }

      // Transaction ID를 로컬에 저장
      await this.saveTransactionId(originalTransactionId);
      return true;
    } catch (error) {
      console.error('Transaction-based restoration failed:', error);
      return false;
    }
  }

  // 구독 정보 동기화 (Transaction ID 기반)
  static async syncSubscription(
    planId: string,
    isActive: boolean,
    originalTransactionIdentifierIOS?: string
  ): Promise<boolean> {
    if (!originalTransactionIdentifierIOS || !isSupabaseAvailable()) {
      console.log('No transaction ID or Supabase unavailable');
      return false;
    }

    // Transaction ID 저장
    await this.saveTransactionId(originalTransactionIdentifierIOS);

    try {
      // 현재 활성 구독 확인 (Transaction ID로)
      const currentSubscription = await this.getLatestSubscriptionFromServer(
        originalTransactionIdentifierIOS
      );

      const isIdenticalSubscription =
        currentSubscription &&
        currentSubscription.plan_id === planId &&
        currentSubscription.is_active === isActive;

      // 구독 변경 없음
      if (isIdenticalSubscription) return true;

      const now = new Date().toISOString();
      const endDate =
        planId === 'free'
          ? null
          : planId.includes('yearly')
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // 기존 활성 구독 비활성화 (Transaction ID로)
      await supabase!
        .from('user_subscriptions')
        .update({ is_active: false, updated_at: now })
        .eq(
          'original_transaction_identifier_ios',
          originalTransactionIdentifierIOS
        )
        .eq('is_active', true);

      // 새 구독 추가
      const { error } = await supabase!.from('user_subscriptions').insert([
        {
          plan_id: planId,
          is_active: isActive,
          original_transaction_identifier_ios: originalTransactionIdentifierIOS,
          start_date: now,
          end_date: endDate,
        },
      ]);

      if (error) {
        console.error('Failed to sync subscription:', error);
        return false;
      }

      console.log('Subscription synced successfully:', planId);
      return true;
    } catch (error) {
      console.error('Subscription sync error:', error);
      return false;
    }
  }

  // 서버에서 최신 구독 정보 가져오기 (Transaction ID 기반)
  static async getLatestSubscriptionFromServer(
    transactionId?: string | null
  ): Promise<DatabaseSubscription | null> {
    // Transaction ID가 없으면 저장된 것을 가져오기 시도
    const finalTransactionId =
      transactionId || (await this.getCurrentTransactionId());

    if (!finalTransactionId || !isSupabaseAvailable()) {
      return null;
    }

    try {
      const { data, error } = await supabase!
        .from('user_subscriptions')
        .select('*')
        .eq('original_transaction_identifier_ios', finalTransactionId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const invalidJWTTokenFromPostgREST = error && error.code !== 'PGRST116';

      if (invalidJWTTokenFromPostgREST) {
        console.error('Failed to fetch subscription:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Get subscription error:', error);
      return null;
    }
  }

  static async syncDailyUsage(
    date: string,
    usageCount: number,
    originalTransactionIdentifierIOS?: string
  ): Promise<boolean> {
    const finalTransactionId =
      originalTransactionIdentifierIOS ||
      (await this.getCurrentTransactionId());

    if (!finalTransactionId || !isSupabaseAvailable()) {
      console.log('No transaction ID available for daily usage sync');
      return false;
    }

    // Transaction ID 저장
    if (originalTransactionIdentifierIOS) {
      await this.saveTransactionId(originalTransactionIdentifierIOS);
    }

    try {
      const now = new Date().toISOString();

      const result = await supabase!.from('daily_usage').upsert(
        [
          {
            original_transaction_identifier_ios: finalTransactionId,
            date,
            usage_count: usageCount,
            updated_at: now,
          },
        ],
        {
          onConflict: 'original_transaction_identifier_ios,date',
        }
      );

      if (result.error) {
        console.error('Failed to sync daily usage:', result.error);
        return false;
      }

      console.log('Daily usage synced:', date, usageCount);
      return true;
    } catch (error) {
      console.error('Daily usage sync error:', error);
      return false;
    }
  }

  // 서버에서 일일 사용량 가져오기 (Transaction ID 기반)
  static async getDailyUsage(
    date: string,
    originalTransactionIdentifierIOS?: string | null
  ): Promise<number> {
    const finalTransactionId =
      originalTransactionIdentifierIOS ||
      (await this.getCurrentTransactionId());

    if (!finalTransactionId || !isSupabaseAvailable()) {
      return 0;
    }

    try {
      const { data, error } = await supabase!
        .from('daily_usage')
        .select('usage_count')
        .eq('original_transaction_identifier_ios', finalTransactionId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch daily usage:', error);
        return 0;
      }

      return data?.usage_count || 0;
    } catch (error) {
      console.error('Get daily usage error:', error);
      return 0;
    }
  }
}
