// Anthropic Messages endpoint. ANTHROPIC_BASE_URL is unset in production; the
// local test run points it at a mock server (backend/tests/mock-anthropic.ts)
// so function tests exercise the full request path without paid API calls
// (https://github.com/TheLinc/cover-me/commit/f2256d0).
const BASE_URL = (Deno.env.get('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com').replace(/\/+$/, '')

export const ANTHROPIC_MESSAGES_URL = `${BASE_URL}/v1/messages`

export const SONNET_MODEL = 'claude-sonnet-5-5'

// Resume parsing is verbatim extraction, so low effort. Haiku 5.5 counts the
// same text as ~30% more tokens than 4.5, hence 8000 over the old 6000 (#298).
// Keep in step with extension/src/lib/ai/claude.ts.
export const HAIKU_PARSE_FIELDS = {
  model: 'claude-haiku-5-5',
  output_config: { effort: 'low' },
  max_tokens: 8000,
} as const

// Request fields every Sonnet call sends. Adaptive thinking at high effort: with
// thinking off, letters cited posting requirements the resume lacks in 26 of 32
// eval cases; at high effort, 0 of 32 (low and medium effort don't think on
// this prompt). Thinking counts toward max_tokens, so callers leave room
// (SONNET_MAX_TOKENS). fallbacks: 'default' re-runs a cyber-category decline (a
// security-job posting can trip it) on Sonnet 5 server-side (#1, #203).
export const SONNET_FIELDS = {
  model: SONNET_MODEL,
  thinking: { type: 'adaptive' },
  output_config: { effort: 'high' },
  fallbacks: 'default',
} as const

// Room for thinking plus the reply. Unused tokens cost nothing (#1).
export const SONNET_MAX_TOKENS = 16000

export const SONNET_BETA_HEADER = { 'anthropic-beta': 'server-side-fallback-2026-07-01' }
