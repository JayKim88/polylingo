import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Supabase features will be disabled.'
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface DatabaseSubscription {
  id: string;
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
  date: string;
  usage_count: number;
  original_transaction_identifier_ios?: string;
  created_at: string;
  updated_at: string;
}

export const isSupabaseAvailable = (): boolean => {
  return supabase !== null;
};
