// Public Supabase credentials — safe to bundle in the extension.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in extension/.env.local
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? ''
export const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? ''

// Web app URL — used as the email confirmation redirect target.
// Set VITE_WEB_URL in extension/.env.local (e.g. http://localhost:3000 for dev)
export const WEB_URL = (import.meta.env.VITE_WEB_URL as string) ?? 'https://cover-me.dev'
