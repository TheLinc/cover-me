// Where the resume goes, per mode. Keep each line true to the code:
// BYOK keeps the resume in chrome.storage.local and encrypts only the API key
// (extension/src/lib/crypto.ts); hosted encrypts the resume at rest in
// Postgres (backend/supabase/functions/_shared/encrypt.ts) and calls Claude. (#268)
export const MODES = {
  byok: {
    label: 'Your own API key',
    short: 'Own key',
    holds: 'Resume + API key',
    via: null,
    ai: 'Claude or OpenAI',
    facts: ['Your resume stays in your browser', 'Sent only to the AI you pick, never to Cover Me', 'Never sold or used to train AI'],
  },
  hosted: {
    label: 'Cover Me account',
    short: 'Account',
    holds: 'Resume + sign-in',
    via: 'Cover Me server',
    ai: 'Claude',
    facts: ['Your resume is stored encrypted on our server', 'Resume text never goes in our logs', 'Never sold or used to train AI'],
  },
} as const
export type Mode = keyof typeof MODES
