// src/services/supabase.ts
// Supabase client — shared singleton used across all services

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';

const rawUrl = (SUPABASE_URL as string) || '';
const rawKey = (SUPABASE_ANON_KEY as string) || '';

const isValidUrl = (url?: string) => {
  try {
    return Boolean(url && new URL(url));
  } catch {
    return false;
  }
};

const safeUrl = isValidUrl(rawUrl) ? rawUrl : 'https://placeholder.supabase.co';
const safeKey = rawKey && rawKey !== 'YOUR_SUPABASE_ANON_KEY' ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});


