import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  supabase,
  isSupabaseAvailable,
  DatabaseUser,
  DatabaseSubscription,
} from './supabase';

// Utility function to get consistent date format (YYYY-MM-DD)
export const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const USER_CACHE_KEY = 'cached_user_data';
const APPLE_USER_KEY = 'apple_user_id';
const TRANSACTION_ID_KEY = 'original_transaction_identifier_ios';

export interface CachedUserData {
  userId: string;
  appleId: string;
  email?: string;
  lastSync: number;
}

export class UserService {
  private static currentUser: CachedUserData | null = null;
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

  // 저장된 Apple User ID 복원 (향후 호환성용)
  static async restoreAppleUserID(): Promise<string | null> {
    try {
      const storedAppleUserID = await AsyncStorage.getItem(APPLE_USER_KEY);
      return storedAppleUserID;
    } catch (error) {
      console.error('Failed to restore Apple User ID:', error);
      return null;
    }
  }

  // Apple User ID 저장 (향후 호환성용)
  static async saveAppleUserID(appleUserID: string): Promise<void> {
    try {
      await AsyncStorage.setItem(APPLE_USER_KEY, appleUserID);
    } catch (error) {
      console.error('Failed to save Apple User ID:', error);
    }
  }

  // Transaction ID 복원 (단순히 로컬에 저장)
  static async restoreUserByTransactionId(
    originalTransactionId: string
  ): Promise<CachedUserData | null> {
    try {
      if (!originalTransactionId) {
        console.error('Original transaction ID is required');
        return null;
      }

      // Transaction ID를 로컬에 저장
      await this.saveTransactionId(originalTransactionId);
      
      console.log('Transaction ID restored successfully:', originalTransactionId);
      
      // 더 이상 user 객체가 필요없으므로 null 반환
      // 실제 데이터는 transaction ID로 관리됨
      return null;
    } catch (error) {
      console.error('Transaction-based restoration failed:', error);
      return null;
    }
  }

  // Apple ID로 사용자 인증 및 동기화
  static async authenticateWithAppleID(
    appleId: string,
    email?: string
  ): Promise<CachedUserData | null> {
    try {
      // Supabase를 사용할 수 없는 경우 로컬 캐시만 사용
      if (!isSupabaseAvailable()) {
        console.log('Supabase not available - using local mode only');
        const localUser: CachedUserData = {
          userId: `local_${appleId}`,
          appleId,
          email,
          lastSync: Date.now(),
        };
        this.currentUser = localUser;
        await this.saveCachedUser(localUser);
        return localUser;
      }

      // 기존 사용자 조회
      const { data: existingUser, error: fetchError } = await supabase!
        .from('users')
        .select('*')
        .eq('apple_id', appleId)
        .single();

      let user: DatabaseUser;

      if (fetchError && fetchError.code === 'PGRST116') {
        // 사용자가 존재하지 않음 - 새 사용자 생성
        const userData: { apple_id: string; email?: string } = {
          apple_id: appleId,
        };
        if (email) {
          userData.email = email;
        }

        const { data: newUser, error: createError } = await supabase!
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (createError) {
          console.error('Failed to create user:', createError);
          return null;
        }
        user = newUser;
        console.log('New user created:', user.id);
      } else if (fetchError) {
        console.error('Failed to fetch user:', fetchError);
        return null;
      } else {
        user = existingUser;
        console.log('Existing user found:', user.id);

        // 기존 사용자의 이메일이 없고 새로 제공된 이메일이 있으면 업데이트
        if (!user.email && email) {
          const { error: updateError } = await supabase!
            .from('users')
            .update({ email })
            .eq('id', user.id);

          if (!updateError) {
            user.email = email;
            console.log('User email updated:', email);
          }
        }
      }

      // 사용자 정보 캐시
      const cachedUser: CachedUserData = {
        userId: user.id,
        appleId: user.apple_id,
        email: user.email,
        lastSync: Date.now(),
      };

      this.currentUser = cachedUser;
      await this.saveCachedUser(cachedUser);

      // Apple User ID도 별도 저장
      await this.saveAppleUserID(appleId);

      return cachedUser;
    } catch (error) {
      console.error('Authentication failed:', error);
      return null;
    }
  }

  // 현재 사용자 정보 가져오기
  static async getCurrentUser(): Promise<CachedUserData | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    // 캐시된 사용자 정보 로드
    try {
      const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
      if (cached) {
        this.currentUser = JSON.parse(cached);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Failed to load cached user:', error);
    }

    return null;
  }

  // 사용자 캐시 저장
  private static async saveCachedUser(user: CachedUserData): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save cached user:', error);
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

      // 새 구독 추가 (user_id 없이)
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

  // 사용자 로그아웃 (캐시 클리어)
  static async logout(): Promise<void> {
    try {
      this.currentUser = null;
      this.currentTransactionId = null;
      await AsyncStorage.removeItem(USER_CACHE_KEY);
      await AsyncStorage.removeItem(APPLE_USER_KEY);
      await AsyncStorage.removeItem(TRANSACTION_ID_KEY);
      console.log('User logged out and cache cleared');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
