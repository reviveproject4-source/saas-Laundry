import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uzrqolqdqsispedbmtrl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_P9tSZc2aZIzAlNoTOzkR-Q_Mqpnn1Bh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
