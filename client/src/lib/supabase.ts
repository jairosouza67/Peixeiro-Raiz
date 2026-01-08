import { createClient } from '@supabase/supabase-js';

// VITE_ prefix is required for Vite to expose these to the client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "Supabase URL ou Anon Key não encontrados. Verifique se o arquivo .env existe " +
        "e contém VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
