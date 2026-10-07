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

// Request fields every Sonnet call sends. Sonnet 5.5 thinks by default, and
// thinking counts toward max_tokens, so a 1,024-token letter could be cut off;
// it rejects {type: 'disabled'}, and between_tools is its thinking-off setting.
// fallbacks: 'default' re-runs a cyber-category decline (a security-job posting
// can trip it) on Sonnet 5 server-side instead of failing the request.
export const SONNET_FIELDS = {
  model: 'claude-sonnet-5-5',
  thinking: { type: 'between_tools' },
  fallbacks: 'default',
} as const

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
      max_tokens: 1024,
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
