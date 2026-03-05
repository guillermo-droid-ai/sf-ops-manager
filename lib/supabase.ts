import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

// Browser client (anon key)
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON;
  
  if (!url || !anonKey) {
    throw new Error('Supabase environment variables not configured');
  }
  
  _supabase = createClient(url, anonKey);
  return _supabase;
}

// Server client (service role - full access, server-side only)
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  
  if (!url || !serviceKey) {
    // Return a mock client that logs but doesn't throw during sync log attempts
    console.warn('Supabase not configured - sync logging disabled');
    return {
      from: () => ({
        select: () => ({ 
          eq: () => ({ 
            order: () => ({ 
              limit: () => ({ 
                single: async () => ({ data: null, error: null }) 
              }) 
            }) 
          }) 
        }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        upsert: async () => ({ error: null }),
        update: () => ({ eq: async () => ({ error: null }) })
      })
    } as unknown as SupabaseClient;
  }
  
  _supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _supabaseAdmin;
}

// Legacy export for compatibility
export const supabase = {
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabase().from(...args)
};
