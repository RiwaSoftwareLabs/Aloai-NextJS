import { createClient } from '@supabase/supabase-js';

// These would typically come from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create a singleton client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Store session in localStorage by default
    autoRefreshToken: true, // Refresh JWT token automatically
    storageKey: 'supabase-auth-token', // Explicitly set storage key
    detectSessionInUrl: true, // Detect session from URL hash
    flowType: 'implicit', // Use implicit flow for better compatibility
  },
});

// Log supabase client initialization to help with debugging
console.log('Supabase client initialized with options:', { 
  url: supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'missing',
  hasKey: !!supabaseAnonKey,
  persistSession: true,
  autoRefreshToken: true,
});
