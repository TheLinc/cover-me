// Public Supabase credentials — safe to bundle in the extension.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in extension/.env.local
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? ''
export const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? ''
