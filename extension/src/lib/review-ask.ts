// No "do you like it?" step and no reward for rating, per the Web Store spam policy (#96).

// Counted by the worker because History is capped and users delete entries (#96).
export interface GenerationCount { count: number; firstAt: string }

// Only the card and Settings write this, never the worker, so it can't race the worker's count (#96).
export interface ReviewAsk { shown: number; atCount: number; done: boolean }

const DAY = 24 * 60 * 60 * 1000

// The worker's count started at zero in v1.4.0. The larger of the two, not the sum,
// because generations since then are in both (#266).
export function generationsSoFar(gen: GenerationCount | null, history: { createdAt: string; account?: string }[]): GenerationCount | null {
  const own = history.filter((e) => e.account !== 'other')
  const dates = [...own.map((e) => e.createdAt), ...(gen ? [gen.firstAt] : [])].filter((d) => !Number.isNaN(Date.parse(d)))
  if (!dates.length) return null
  return {
    count: Math.max(gen?.count ?? 0, own.length),
    firstAt: dates.reduce((a, b) => (Date.parse(b) < Date.parse(a) ? b : a)),
  }
}

export function shouldAskForReview(gen: GenerationCount | null, ask: ReviewAsk | null, now: number): boolean {
  if (!gen || ask?.done) return false
  const shown = ask?.shown ?? 0
  if (shown === 0) return gen.count >= 3 && now - Date.parse(gen.firstAt) >= DAY
  if (shown === 1) return gen.count - ask!.atCount >= 10
  return false
}

// History stops growing at its cap, so the second showing counts the worker's generations only (#266).
export function nextShowing(gen: GenerationCount | null, history: { createdAt: string; account?: string }[], ask: ReviewAsk | null, now: number): ReviewAsk | null {
  const shown = ask?.shown ?? 0
  if (!shouldAskForReview(shown === 0 ? generationsSoFar(gen, history) : gen, ask, now)) return null
  return { shown: shown + 1, atCount: gen?.count ?? 0, done: false }
}

// Closing the popup right after a copy shouldn't use up one of the two showings (#266).
export function countShowingWhenSeen(save: () => void) {
  let pending = true
  const cancel = () => { pending = false; clearTimeout(timer) }
  const now = () => { if (pending) { cancel(); save() } }
  const timer = setTimeout(now, 2000)
  return { now, cancel }
}
