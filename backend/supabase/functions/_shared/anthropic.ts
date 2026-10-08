// Anthropic Messages endpoint. ANTHROPIC_BASE_URL is unset in production; the
// local test run points it at a mock server (backend/tests/mock-anthropic.ts)
// so function tests exercise the full request path without paid API calls.
const BASE_URL = (Deno.env.get('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com').replace(/\/+$/, '')

export const ANTHROPIC_MESSAGES_URL = `${BASE_URL}/v1/messages`

// Sonnet writes letters and tailored resumes; Haiku parses resumes.
export const SONNET_MODEL = 'claude-sonnet-5-5'
export const HAIKU_MODEL = 'claude-haiku-4-5'

// Request fields every Sonnet call sends. Adaptive thinking at high effort: with
// thinking off, letters cited posting requirements the resume lacks in 26 of 32
// eval cases; at high effort, 0 of 32 (low and medium effort don't think on
// this prompt). Thinking counts toward max_tokens, so callers leave room
// (SONNET_MAX_TOKENS). fallbacks: 'default' re-runs a cyber-category decline (a
// security-job posting can trip it) on Sonnet 5 server-side.
export const SONNET_FIELDS = {
  model: SONNET_MODEL,
  thinking: { type: 'adaptive' },
  output_config: { effort: 'high' },
  fallbacks: 'default',
} as const

// Room for thinking plus the reply. Unused tokens cost nothing.
export const SONNET_MAX_TOKENS = 16000

export const SONNET_BETA_HEADER = { 'anthropic-beta': 'server-side-fallback-2026-07-01' }
