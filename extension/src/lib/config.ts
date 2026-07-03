// Public Supabase credentials — safe to bundle in the extension.
// Production values live in extension/.env; local dev overrides go in
// extension/.env.development (only loaded by `vite dev`, never by `vite build`).
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? ''
export const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? ''

// Web app URL — used as the email confirmation redirect target.
// Set VITE_WEB_URL in extension/.env (prod) or extension/.env.development (local dev)
export const WEB_URL = (import.meta.env.VITE_WEB_URL as string) ?? 'https://cover-me.dev'
