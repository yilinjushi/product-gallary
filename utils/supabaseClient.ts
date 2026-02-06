import { createClient } from '@supabase/supabase-js';

// Access environment variables using Vite's import.meta.env
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = SUPABASE_URL !== '' && SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);