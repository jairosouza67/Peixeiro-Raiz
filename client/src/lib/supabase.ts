import { createClient, SupabaseClient } from '@supabase/supabase-js';

// VITE_ prefix is required for Vite to expose these to the client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
    // Only log error in development to avoid exposing config issues in production
    if (import.meta.env.DEV) {
        console.error(
            "[Supabase] URL or Anon Key not found. Please check your .env file.\n" +
            "Required variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY\n" +
            "Auth and data features will be disabled."
        );
    }
} else {
    try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                // Keep user logged in across app restarts (PWA/mobile)
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: window.localStorage,
            },
        });
    } catch (error) {
        if (import.meta.env.DEV) {
            console.error("[Supabase] Failed to initialize client:", error);
        }
    }
}

/**
 * Check if Supabase is properly configured and available
 */
export function isSupabaseConfigured(): boolean {
    return supabaseClient !== null;
}

/**
 * Get Supabase client with null safety check.
 * Throws error if client is not configured - use in critical paths.
 */
export function getSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {
        throw new Error(
            "Supabase client not configured. " +
            "Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables."
        );
    }
    return supabaseClient;
}

/**
 * Supabase client instance.
 * For backwards compatibility - prefer using getSupabaseClient() for null safety
 * or check isSupabaseConfigured() first.
 */
export const supabase = supabaseClient as SupabaseClient;
