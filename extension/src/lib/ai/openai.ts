import type { ChatMessage } from './claude'

const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

// gpt-4o (not -mini) for cover letters: same reasoning as the Claude path —
// the letter must sound human under a heavily-constrained prompt, and the
// mini model is the one that leaks AI-tells and drops rules.
const LETTER_MODEL = 'gpt-4o'

export async function callOpenAI(prompt: string | ChatMessage[], apiKey: string): Promise<string> {
  const messages = typeof prompt === 'string' ? [{ role: 'user', content: prompt }] : prompt
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: LETTER_MODEL,
      max_tokens: 1024,
      messages,
    }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `OpenAI API error ${res.status}`)
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const text = data.choices[0]?.message.content ?? ''
  if (!text) throw new Error('Empty response from OpenAI')
  return text
}
