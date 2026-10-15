import { readSseText, type ChatMessage } from './claude'

const OPENAI_RESPONSES = 'https://api.openai.com/v1/responses'
export const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions'

// GPT-6.1 Sol for letters, tailoring and the grounding checks: OpenAI's
// balanced tier, priced like Sonnet 5.5 ($2/$10). A reasoning model:
// max_output_tokens covers its reasoning plus the answer, and it rejects
// max_tokens and any temperature but the default. Medium effort: a full letter
// took 20 s there (the site promises about 20) and 53 s at high.
export const OPENAI_MODEL = 'gpt-6.1-sol'
// store: false: the Responses API saves each request and response in the user's
// OpenAI account by default (store defaults to true); nothing here reuses a
// saved response. The privacy policy says these calls ask OpenAI not to store
// them; OpenAI may still keep API data for abuse monitoring under its terms.
const OPENAI_FIELDS = { model: OPENAI_MODEL, reasoning: { effort: 'medium' }, max_output_tokens: 16000, store: false }

// GPT-6 Luna for resume parsing, the job Haiku does on the Claude path:
// extraction, not judgment. Through Chat Completions, streamed: low effort
// barely reasons, but copying a 12,000-character resume out took 30 s.
// store: false is Chat Completions' default; it's sent anyway so every OpenAI call says so.
export const OPENAI_PARSE_FIELDS = { model: 'gpt-6-luna', reasoning_effort: 'low', max_completion_tokens: 8000, store: false } as const

// Streams through the Responses API, which sends progress events from the
// first second while the model reasons. Chat Completions sends nothing until
// reasoning ends (40-100 s on a full prompt), and Chrome stops the service
// worker when a fetch waits 30 s for a response.
export async function callOpenAI(prompt: string | ChatMessage[], apiKey: string, onText?: (text: string) => void): Promise<string> {
  const res = await fetch(OPENAI_RESPONSES, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...OPENAI_FIELDS, stream: true, input: prompt }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `OpenAI API error ${res.status}`)
  }

  const text = await readSseText(res, responsesDelta, onText)
  if (!text) throw new Error('Empty response from OpenAI')
  return text
}

function responsesDelta(ev: Record<string, unknown>): string | undefined {
  if (ev.type === 'response.output_text.delta') return ev.delta as string
  if (ev.type === 'response.failed' || ev.type === 'response.incomplete') {
    const r = ev.response as { error?: { message?: string }; incomplete_details?: { reason?: string } } | undefined
    throw new Error(r?.error?.message ??
      (ev.type === 'response.failed' ? 'OpenAI response failed' : `OpenAI response cut off (${r?.incomplete_details?.reason ?? 'unknown reason'})`))
  }
  return undefined
}
