import { createClient } from '@supabase/supabase-js';

// Ganti string di bawah ini dengan Project URL & Anon Key dari Supabase kamu (Project Settings -> API)
const SUPABASE_URL = 'https://qfebkqdexgnlwbdzdhqv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_69l8_45AAPqjeCsFdSbeXA_Y2qfJTzT';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);