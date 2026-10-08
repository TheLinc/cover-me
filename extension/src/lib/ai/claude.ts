const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Sonnet for cover letters: the letter is the product's flagship "must sound
// human" artifact and the prompt carries ~60 constraints — the small models
// are the ones that leak AI-tells and drop rules. ~1¢/letter on the user's key.
// Keep in step with backend/supabase/functions/_shared/anthropic.ts.
export const HAIKU_MODEL = 'claude-haiku-4-5'

// Request fields every Sonnet call sends. Adaptive thinking at high effort: with
// thinking off, letters cited posting requirements the resume lacks in 26 of 32
// eval cases; at high effort, 0 of 32 (low and medium effort don't think on
// this prompt). Thinking counts toward max_tokens, so callers leave room
// (SONNET_MAX_TOKENS). fallbacks: 'default' re-runs a cyber-category decline (a
// security-job posting can trip it) on Sonnet 5 server-side.
export const SONNET_FIELDS = {
  model: 'claude-sonnet-5-5',
  thinking: { type: 'adaptive' },
  output_config: { effort: 'high' },
  fallbacks: 'default',
} as const

// Room for thinking plus the reply. Unused tokens cost nothing.
export const SONNET_MAX_TOKENS = 16000

export const SONNET_BETA_HEADER = { 'anthropic-beta': 'server-side-fallback-2026-07-01' }

export async function callClaude(prompt: string | ChatMessage[], apiKey: string): Promise<string> {
  const messages = typeof prompt === 'string' ? [{ role: 'user', content: prompt }] : prompt
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      ...SONNET_BETA_HEADER,
    },
    body: JSON.stringify({
      ...SONNET_FIELDS,
      max_tokens: SONNET_MAX_TOKENS,
      messages,
    }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Claude API error ${res.status}`)
  }

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
  const text = data.content.find((b) => b.type === 'text')?.text ?? ''
  if (!text) throw new Error('Empty response from Claude')
  return text
}
