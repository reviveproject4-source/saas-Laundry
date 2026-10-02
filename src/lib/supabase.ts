import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zhcneknemfuwyusapbum.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoY25la25lbWZ1d3l1c2FwYnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MjU3OTIsImV4cCI6MjEwNjQwMTc5Mn0._IjRwmq8qwVqp9TJwEogVgBaJDYV5BMOQftoWX0PFzA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
