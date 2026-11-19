import type { Keyword } from './keywords'

export interface AiKeyword {
  name: string
  level: 'required' | 'preferred'
  posting_text: string
  resume_text: string
  found: boolean
}

export type AiReply = { keywords: AiKeyword[] } | { error: 'busy' | 'failed' }

export async function askAi(posting: string, resume: string, token: string | null, signal: AbortSignal): Promise<AiReply> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ats-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posting, resume, token }),
      signal,
    })
    if (res.ok) return (await res.json()) as { keywords: AiKeyword[] }
    return { error: res.status === 429 ? 'busy' : 'failed' }
  } catch (err) {
    if (signal.aborted) throw err
    return { error: 'failed' }
  }
}

export function fromAi(posting: string, keywords: AiKeyword[]): Array<Keyword & { found: boolean }> {
  const lines = posting.split('\n').map((l) => l.trim())
  return keywords.map((k) => ({
    name: k.name,
    level: k.level,
    found: k.found,
    strict: false,
    spellings: [...new Set([k.posting_text, k.resume_text, k.name].map((s) => s.trim()).filter(Boolean))],
    line: k.posting_text.trim() ? lines.find((l) => l.toLowerCase().includes(k.posting_text.trim().toLowerCase())) : undefined,
  }))
}
