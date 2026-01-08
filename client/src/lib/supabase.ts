import { createClient, SupabaseClient } from '@supabase/supabase-js';

// VITE_ prefix is required for Vite to expose these to the client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        "[Supabase] URL or Anon Key not found. Please check your .env file.\n" +
        "Required variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY\n" +
        "Auth and data features will be disabled."
    );
} else {
    try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
        console.error("[Supabase] Failed to initialize client:", error);
    }
}

/**
 * Supabase client instance.
 * WARNING: May be null if env vars are missing or initialization failed.
 * Always check before using in critical paths.
 */
export const supabase = supabaseClient as SupabaseClient;

/**
 * Check if Supabase is properly configured and available
 */
export function isSupabaseConfigured(): boolean {
    return supabaseClient !== null;
}
