// Where the resume goes, per mode. Keep each line true to the code:
// BYOK keeps the resume in chrome.storage.local and encrypts only the API key
// (extension/src/lib/crypto.ts); hosted encrypts the resume at rest in
// Postgres (backend/supabase/functions/_shared/encrypt.ts) and calls Claude.
export const MODES = {
  byok: {
    label: 'Your own API key',
    short: 'Own key',
    holds: 'Resume + API key',
    via: null,
    ai: 'Claude or OpenAI',
    facts: ['Resume saved in your browser only', 'API key encrypted on your device (AES-256-GCM)', 'Goes straight to the AI you pick'],
  },
  hosted: {
    label: 'Cover Me account',
    short: 'Account',
    holds: 'Resume + sign-in',
    via: 'Cover Me server',
    ai: 'Claude',
    facts: ['Resume encrypted at rest (AES-256-GCM)', 'Resume text is never logged', 'Applications tracked on your board; Pro syncs letters and resumes'],
  },
} as const
export type Mode = keyof typeof MODES
