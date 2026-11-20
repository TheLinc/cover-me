import type { Keyword } from './keywords'

export interface AiReport {
  score: number
  gaps: string[]
  keywordMatch: { tier1Covered: string[]; tier1Missing: string[]; tier2Covered: string[]; tier2Missing: string[]; gatingGaps: string[] }
  quotes: { name: string; posting_text: string; resume_text: string }[]
  title: string
}

export type AiReply = AiReport | { error: 'busy' | 'failed' }

export async function askAi(posting: string, resume: string, token: string | null, signal: AbortSignal): Promise<AiReply> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ats-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posting, resume, token }),
      signal,
    })
    if (res.ok) return (await res.json()) as AiReport
    return { error: res.status === 429 ? 'busy' : 'failed' }
  } catch (err) {
    if (signal.aborted) throw err
    return { error: 'failed' }
  }
}

export function fromAi(posting: string, report: AiReport): { keywords: Array<Keyword & { found: boolean }>; gates: string[] } {
  const lines = posting.split('\n').map((l) => l.trim())
  const quotes = new Map(report.quotes.map((q) => [q.name, q]))
  const gaps = new Set(report.gaps)
  const { tier1Covered, tier1Missing, tier2Covered, tier2Missing } = report.keywordMatch
  const tiers = [
    { level: 'required' as const, names: [...tier1Covered, ...tier1Missing] },
    { level: 'preferred' as const, names: [...tier2Covered, ...tier2Missing] },
  ]
  const keywords = tiers.flatMap(({ level, names }) => names.map((name) => {
    const { posting_text = '', resume_text = '' } = quotes.get(name) ?? {}
    const asked = posting_text.trim().toLowerCase()
    return {
      name,
      level,
      found: !gaps.has(name),
      strict: false,
      spellings: [...new Set([posting_text, resume_text, name].map((s) => s.trim()).filter(Boolean))],
      line: asked ? lines.find((l) => l.toLowerCase().includes(asked)) : undefined,
    }
  }))
  const named = new Set(tiers.flatMap((t) => t.names))
  return { keywords, gates: report.gaps.filter((g) => !named.has(g)) }
}
