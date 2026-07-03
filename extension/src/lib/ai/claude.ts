const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Sonnet for cover letters: the letter is the product's flagship "must sound
// human" artifact and the prompt carries ~60 constraints — the small models
// are the ones that leak AI-tells and drop rules. ~1¢/letter on the user's key.
const LETTER_MODEL = 'claude-sonnet-4-6'

export async function callClaude(prompt: string | ChatMessage[], apiKey: string): Promise<string> {
  const messages = typeof prompt === 'string' ? [{ role: 'user', content: prompt }] : prompt
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: LETTER_MODEL,
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
