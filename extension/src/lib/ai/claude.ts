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
  const messages = typeof prompt === 'string' ? [{ role: 'user' as const, content: prompt }] : prompt
  const text = await streamSonnet(messages, apiKey)
  if (!text) throw new Error('Empty response from Claude')
  return text
}

// Every Sonnet call streams. Chrome stops a service worker whose fetch() gets no
// response for 30 s, and a call that thinks at high effort can take longer; a
// stream sends its headers at once. Returns '' on a decline (no text).
export async function streamSonnet(messages: ChatMessage[], apiKey: string, onText?: (text: string) => void): Promise<string> {
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
      stream: true,
      messages,
    }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Claude API error ${res.status}`)
  }
  return readSseText(res, claudeDelta, onText)
}

// Reads an SSE stream (Claude or OpenAI shape), forwarding each text fragment
// to onText and returning the full accumulated text. Lines may split across
// network chunks, so a partial-line buffer is kept between reads.
export async function readSseText(
  res: Response,
  extract: (ev: Record<string, unknown>) => string | undefined,
  onText?: (text: string) => void,
): Promise<string> {
  if (!res.body) throw new Error('AI response had no body. Please try again.')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let lineBuf = ''
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    lineBuf += decoder.decode(value, { stream: true })
    const lines = lineBuf.split('\n')
    lineBuf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let ev: Record<string, unknown>
      try {
        ev = JSON.parse(payload) as Record<string, unknown>
      } catch {
        continue
      }
      if (ev.type === 'error') {
        const e = ev.error as { message?: string } | undefined
        throw new Error(e?.message ?? 'AI stream error. Please try again.')
      }
      const text = extract(ev)
      if (text) {
        full += text
        onText?.(text)
      }
    }
  }
  return full
}

function claudeDelta(ev: Record<string, unknown>): string | undefined {
  if (ev.type !== 'content_block_delta') return undefined
  const delta = ev.delta as { type?: string; text?: string } | undefined
  return delta?.type === 'text_delta' ? delta.text : undefined
}
