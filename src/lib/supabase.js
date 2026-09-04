import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Er portalen koblet på en rigtig database? Uden det kører appen i
 *  demo-tilstand, hvor den kun husker i den ene browser. */
export const erKoblet = Boolean(url && anonKey)

export const supabase = erKoblet ? createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}) : null
