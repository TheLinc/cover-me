// When the popup asks for a Chrome Web Store rating (popup/components/ReviewAsk.tsx).
// Only people who came back get asked: 3 generations, the first a day old.
// Shown at most twice, the second time 10 generations after the first. Showing
// the card counts as asking, so closing the popup on it is the same as Not now.
// No sentiment gate, and no reward for rating (Web Store spam policy).

// Successful letters and tailored resumes, counted by the background worker.
// History can't serve: it's capped and users delete entries.
export interface GenerationCount { count: number; firstAt: string }

// Written by the popup only, so it never races the worker's count.
export interface ReviewAsk { shown: number; atCount: number; done: boolean }

const DAY = 24 * 60 * 60 * 1000

export function shouldAskForReview(gen: GenerationCount | null, ask: ReviewAsk | null, now: number): boolean {
  if (!gen || ask?.done) return false
  const shown = ask?.shown ?? 0
  if (shown === 0) return gen.count >= 3 && now - Date.parse(gen.firstAt) >= DAY
  if (shown === 1) return gen.count - ask!.atCount >= 10
  return false
}
