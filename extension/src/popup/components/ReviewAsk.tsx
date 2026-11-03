import { useEffect, useRef } from 'react'
import { WEB_URL } from '../../lib/config'
import { shouldAskForReview } from '../../lib/review-ask'
import { getGenerationCount, getReviewAsk, saveReviewAsk } from '../../lib/storage'

// Called right after a copy or PDF download. Records the showing before it
// shows (see lib/review-ask.ts), so closing the popup counts as Not now.
export async function claimReviewAsk(): Promise<boolean> {
  const [gen, ask] = await Promise.all([getGenerationCount(), getReviewAsk()])
  if (!gen || !shouldAskForReview(gen, ask, Date.now())) return false
  await saveReviewAsk({ shown: (ask?.shown ?? 0) + 1, atCount: gen.count, done: false })
  return true
}

// Any link click, on the card or in Settings, ends the asking for good. One
// write and no read first: the popup closes as the new tab opens.
function endReviewAsk() {
  void saveReviewAsk({ shown: 0, atCount: 0, done: true })
}

// All three side by side every time: no "do you like it?" gate first.
function ReviewLinks({ rateClass, onDone }: { rateClass: string; onDone?: () => void }) {
  const done = () => { endReviewAsk(); onDone?.() }
  return (
    <>
      <a className={rateClass} href="https://chromewebstore.google.com/detail/bpbnopjgjbimdjjdolhkgimllbgamgpi/reviews" target="_blank" rel="noreferrer" onClick={done}>Rate Cover Me</a>
      <a className="text-link" href="https://github.com/TheLinc/cover-me" target="_blank" rel="noreferrer" onClick={done}>Star on GitHub</a>
      <a className="text-link" href={`${WEB_URL}/support`} target="_blank" rel="noreferrer" onClick={done}>Send feedback</a>
    </>
  )
}

// The card under a result on the Generate page.
export default function ReviewAsk({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLElement>(null)
  // A long letter fills the popup, so the card opens below the fold. Bring it
  // into view, without the slide when the user asked for less motion.
  useEffect(() => {
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current?.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
  }, [])
  return (
    <section ref={ref} className="review-ask" aria-labelledby="review-ask-title">
      <p id="review-ask-title" className="review-ask-title">Is Cover Me saving you time?</p>
      <p>A rating on the Chrome Web Store helps other job seekers find it.</p>
      <div className="review-ask-actions">
        <ReviewLinks rateClass="btn btn-primary btn-sm" onDone={onClose} />
        <button
          className="review-ask-dismiss"
          onClick={() => {
            onClose()
            // The card is gone: put keyboard focus back on the result's actions, not <body>.
            document.querySelector<HTMLElement>('.letter-actions .btn')?.focus()
          }}
        >
          Not now
        </button>
      </div>
    </section>
  )
}

// Settings: the same links, always there, never prompting.
export function ReviewLinksSetting() {
  return (
    <section className="page-read-setting" aria-labelledby="review-links-title">
      <h2 id="review-links-title" className="page-read-setting-title">Like Cover Me?</h2>
      <p className="page-read-setting-hint">A rating on the Chrome Web Store helps other job seekers find it.</p>
      <div className="review-ask-actions">
        <ReviewLinks rateClass="text-link" />
      </div>
    </section>
  )
}
