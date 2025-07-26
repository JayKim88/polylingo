import { createClient } from '@supabase/supabase-js';

// Supabase 설정
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Supabase features will be disabled.'
  );
}

// Supabase 클라이언트 생성
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// 데이터베이스 타입 정의
export interface DatabaseUser {
  id: string;
  apple_id: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  original_transaction_identifier_ios?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseDailyUsage {
  id: string;
  user_id: string | null;
  date: string;
  usage_count: number;
  original_transaction_identifier_ios?: string;
  created_at: string;
  updated_at: string;
}

// Supabase 사용 가능 여부 확인
export const isSupabaseAvailable = (): boolean => {
  return supabase !== null;
};
