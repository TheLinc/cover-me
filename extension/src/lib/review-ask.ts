// When to ask for a Chrome Web Store rating (popup/components/ReviewAsk.tsx).
// Only people who came back get asked: 3 generations, the first a day old.
// Shown at most twice, the second time 10 generations after the first.
// No sentiment gate, and no reward for rating (Web Store spam policy).

// Successful letters and tailored resumes, counted by the background worker
// since v1.4.0. History alone can't serve: it's capped and users delete entries.
export interface GenerationCount { count: number; firstAt: string }

// Written by the card and Settings only, never the worker, so it never races the worker's count.
export interface ReviewAsk { shown: number; atCount: number; done: boolean }

const DAY = 24 * 60 * 60 * 1000

// The count started at zero in v1.4.0, so earlier generations come from History.
// The larger of the two, not the sum: later ones are in both. An 'other' entry
// belongs to a previous user of this browser.
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

// Only the first showing counts History: it stops growing at its cap, so the
// second showing's 10 generations are the worker's.
export function nextShowing(gen: GenerationCount | null, history: { createdAt: string; account?: string }[], ask: ReviewAsk | null, now: number): ReviewAsk | null {
  const shown = ask?.shown ?? 0
  if (!shouldAskForReview(shown === 0 ? generationsSoFar(gen, history) : gen, ask, now)) return null
  return { shown: shown + 1, atCount: gen?.count ?? 0, done: false }
}

// A showing counts once the card was seen: 2 seconds on screen, or a click on
// Not now or Send feedback (`now`). Closing the popup sooner keeps it unused.
export function countShowingWhenSeen(save: () => void) {
  let pending = true
  const cancel = () => { pending = false; clearTimeout(timer) }
  const now = () => { if (pending) { cancel(); save() } }
  const timer = setTimeout(now, 2000)
  return { now, cancel }
}
