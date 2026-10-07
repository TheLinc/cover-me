// Anthropic Messages endpoint. ANTHROPIC_BASE_URL is unset in production; the
// local test run points it at a mock server (backend/tests/mock-anthropic.ts)
// so function tests exercise the full request path without paid API calls.
const BASE_URL = (Deno.env.get('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com').replace(/\/+$/, '')

export const ANTHROPIC_MESSAGES_URL = `${BASE_URL}/v1/messages`

// Sonnet writes letters and tailored resumes; Haiku parses resumes.
export const SONNET_MODEL = 'claude-sonnet-5-5'
export const HAIKU_MODEL = 'claude-haiku-4-5'

// Request fields every Sonnet call sends. Sonnet 5.5 thinks by default, and
// thinking counts toward max_tokens, so a 1,024-token letter could be cut off;
// it rejects {type: 'disabled'}, and between_tools is its thinking-off setting.
// fallbacks: 'default' re-runs a cyber-category decline (a security-job posting
// can trip it) on Sonnet 5 server-side instead of failing the request.
export const SONNET_FIELDS = {
  model: SONNET_MODEL,
  thinking: { type: 'between_tools' },
  fallbacks: 'default',
} as const

export const SONNET_BETA_HEADER = { 'anthropic-beta': 'server-side-fallback-2026-07-01' }
