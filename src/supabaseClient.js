import { createClient } from '@supabase/supabase-js';

// Ganti string di bawah ini dengan Project URL & Anon Key dari Supabase kamu (Project Settings -> API)
const SUPABASE_URL = 'hhttps://qfebkqdexgnlwbdzdhqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZWJrcWRleGdubHdiZHpkaHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDA5NzgsImV4cCI6MjEwMzQxNjk3OH0.UYQ2TDUhmmEq02wiYEFDAWfweOGpJrLVRYWSO1pc55c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);