import { createClient } from '@supabase/supabase-js'

// Public project credentials — safe to ship in the client.
// Access control is enforced by Row Level Security policies in the database.
const SUPABASE_URL = 'https://emkboolambrwikodknnv.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_TXfOXf0UUJjT15zF1SlE4g_tTvJY7qx'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
