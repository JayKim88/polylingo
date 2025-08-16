import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  supabase,
  isSupabaseAvailable,
  DatabaseSubscription,
} from './supabase';
import { getTimeZone } from 'react-native-localize';

/**
 * @description Utility function to get consistent date format (YYYY-MM-DD)
 */
export const getDateString = (date?: Date): string => {
  const currentTimeZone = getTimeZone();
  const today = new Date();

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: currentTimeZone,
  }).format(date ?? today);
};

const TRANSACTION_ID_KEY = 'original_transaction_identifier_ios';

export class UserService {
  private static currentTransactionId: string | null = null;
  private static syncLocks = new Map<string, Promise<boolean>>();

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
    startDate: number,
    endDate: number,
    originalTransactionIdentifierIOS?: string
  ): Promise<boolean> {
    if (!originalTransactionIdentifierIOS || !isSupabaseAvailable()) {
      console.log('No transaction ID or Supabase unavailable');
      return false;
    }

    const lockKey = `${originalTransactionIdentifierIOS}_${startDate}_${endDate}`;
    if (this.syncLocks.has(lockKey)) {
      return await this.syncLocks.get(lockKey)!;
    }

    const syncPromise = this.performSyncSubscription(
      planId,
      isActive,
      startDate,
      endDate,
      originalTransactionIdentifierIOS
    );

    this.syncLocks.set(lockKey, syncPromise);

    try {
      const result = await syncPromise;
      return result;
    } finally {
      this.syncLocks.delete(lockKey);
    }
  }

  private static async performSyncSubscription(
    planId: string,
    isActive: boolean,
    startDate: number,
    endDate: number,
    originalTransactionIdentifierIOS: string
  ): Promise<boolean> {
    // Transaction ID 저장
    await this.saveTransactionId(originalTransactionIdentifierIOS);

    try {
      const currentSubscription = await this.getLatestSubscriptionFromServer(
        originalTransactionIdentifierIOS,
        startDate,
        endDate
      );

      const startDateInISO = new Date(startDate).toISOString();
      const endDateInISO =
        endDate && endDate > 0 ? new Date(endDate).toISOString() : null;

      const isIdenticalSubscription =
        currentSubscription &&
        currentSubscription.plan_id === planId &&
        currentSubscription.is_active === isActive &&
        new Date(currentSubscription.start_date).getTime() === startDate &&
        (endDate > 0
          ? currentSubscription.end_date
            ? new Date(currentSubscription.end_date).getTime() === endDate
            : false
          : !currentSubscription.end_date);

      const keepCurrentFreeSubscription =
        planId === 'free' &&
        currentSubscription &&
        currentSubscription.plan_id === 'free' &&
        currentSubscription.is_active === isActive;

      // 구독 변경 없음
      if (isIdenticalSubscription || keepCurrentFreeSubscription) return true;

      const now = new Date().toISOString();

      // 기존 활성 구독 비활성화 (Transaction ID로)
      await supabase!
        .from('user_subscriptions')
        .update({ is_active: false, updated_at: now })
        .eq(
          'original_transaction_identifier_ios',
          originalTransactionIdentifierIOS
        )
        .eq('is_active', true);

      const { error } = await supabase!.from('user_subscriptions').upsert(
        [
          {
            plan_id: planId,
            is_active: isActive,
            original_transaction_identifier_ios:
              originalTransactionIdentifierIOS,
            start_date: startDateInISO,
            end_date: endDateInISO,
          },
        ],
        {
          onConflict: 'original_transaction_identifier_ios,start_date,end_date',
          ignoreDuplicates: false,
        }
      );

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

  // 서버에서 최신 구독 정보 가져오기 (Transaction ID + Apple dates 기반)
  static async getLatestSubscriptionFromServer(
    transactionId?: string | null,
    expectedStartDate?: number,
    expectedEndDate?: number
  ): Promise<DatabaseSubscription | null> {
    // Transaction ID가 없으면 저장된 것을 가져오기 시도
    const finalTransactionId =
      transactionId || (await this.getCurrentTransactionId());

    if (!finalTransactionId || !isSupabaseAvailable()) {
      return null;
    }

    try {
      let data: any = null;
      let error: any = null;

      if (expectedStartDate && expectedEndDate) {
        const startDateISO = new Date(expectedStartDate).toISOString();
        const endDateISO =
          expectedEndDate > 0 ? new Date(expectedEndDate).toISOString() : null;

        let exactQuery = supabase!
          .from('user_subscriptions')
          .select('*')
          .eq('original_transaction_identifier_ios', finalTransactionId)
          .eq('is_active', true)
          .eq('start_date', startDateISO);

        if (endDateISO) {
          exactQuery = exactQuery.eq('end_date', endDateISO);
        } else {
          exactQuery = exactQuery.is('end_date', null);
        }

        const exactResult = await exactQuery
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        data = exactResult.data;
        error = exactResult.error;

        if (data) {
          return data;
        }
      }

      if (!data || error) {
        const fallbackResult = await supabase!
          .from('user_subscriptions')
          .select('*')
          .eq('original_transaction_identifier_ios', finalTransactionId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        data = fallbackResult.data;
        error = fallbackResult.error;

        const invalidJWTTokenFromPostgREST = error && error.code !== 'PGRST116';

        if (invalidJWTTokenFromPostgREST) {
          console.error('Failed to fetch subscription:', error);
          return null;
        }
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
    startDate: number,
    endDate: number,
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

      const usageData: any = {
        original_transaction_identifier_ios: finalTransactionId,
        date,
        usage_count: usageCount,
        updated_at: now,
      };

      if (startDate) {
        usageData.start_date = new Date(startDate).toISOString();
      }
      if (endDate && endDate > 0) {
        usageData.end_date = new Date(endDate).toISOString();
      }

      const result = await supabase!.from('daily_usage').upsert([usageData], {
        onConflict: 'original_transaction_identifier_ios,date',
      });

      if (result.error) {
        console.error('Failed to sync daily usage:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Daily usage sync error:', error);
      return false;
    }
  }

  static async getDailyUsage(
    date: string,
    originalTransactionIdentifierIOS?: string | null,
    expectedStartDate?: number,
    expectedEndDate?: number
  ): Promise<number> {
    const finalTransactionId =
      originalTransactionIdentifierIOS ||
      (await this.getCurrentTransactionId());

    if (!finalTransactionId || !isSupabaseAvailable()) {
      return 0;
    }

    try {
      let data: any = null;
      let error: any = null;

      if (expectedStartDate && expectedEndDate) {
        const startDateISO = new Date(expectedStartDate).toISOString();
        const endDateISO =
          expectedEndDate > 0 ? new Date(expectedEndDate).toISOString() : null;

        let exactQuery = supabase!
          .from('daily_usage')
          .select('usage_count, start_date, end_date')
          .eq('original_transaction_identifier_ios', finalTransactionId)
          .eq('date', date)
          .eq('start_date', startDateISO);

        if (endDateISO) {
          exactQuery = exactQuery.eq('end_date', endDateISO);
        } else {
          exactQuery = exactQuery.is('end_date', null);
        }

        const result = await exactQuery.single();
        data = result.data;
        error = result.error;

        if (data) {
          return data.usage_count || 0;
        }
      }

      if (!data || error) {
        const fallbackResult = await supabase!
          .from('daily_usage')
          .select('usage_count, start_date, end_date')
          .eq('original_transaction_identifier_ios', finalTransactionId)
          .eq('date', date)
          .single();

        data = fallbackResult.data;
        error = fallbackResult.error;

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to fetch daily usage:', error);
          return 0;
        }
      }

      return data?.usage_count || 0;
    } catch (error) {
      console.error('Get daily usage error:', error);
      return 0;
    }
  }
}
