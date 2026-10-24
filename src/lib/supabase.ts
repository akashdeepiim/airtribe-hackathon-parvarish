import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '../types/database';
import { sessionStorageAdapter, authStorageKey } from './session-storage';
const configuration = z.object({ url: z.url(), key: z.string().min(20) }).safeParse({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
export const isConfigured = configuration.success;
// A missing configuration renders an actionable setup state; no mock session is substituted.
export const supabase = configuration.success
  ? createClient<Database>(configuration.data.url, configuration.data.key, {
      auth: {
        storageKey: authStorageKey(configuration.data.url),
        storage: sessionStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
export function db() {
  if (!supabase) throw new Error('setup_required');
  return supabase;
}
