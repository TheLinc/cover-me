import { useEffect, useRef, useState } from 'react'
import { WEB_URL } from '../../lib/config'
import { countShowingWhenSeen, generationsSoFar, shouldAskForReview, type ReviewAsk as Asked } from '../../lib/review-ask'
import { getGenerationCount, getHistory, getReviewAsk, getTailoredHistory, saveReviewAsk } from '../../lib/storage'

const RATE_URL = 'https://chromewebstore.google.com/detail/bpbnopjgjbimdjjdolhkgimllbgamgpi/reviews'

// What the card saves once seen, or null when the user doesn't qualify yet.
async function nextShowing(): Promise<Asked | null> {
  const [count, letters, resumes, ask] = await Promise.all([getGenerationCount(), getHistory(), getTailoredHistory(), getReviewAsk()])
  const gen = generationsSoFar(count, [...letters, ...resumes])
  if (!gen || !shouldAskForReview(gen, ask, Date.now())) return null
  return { shown: (ask?.shown ?? 0) + 1, atCount: gen.count, done: false }
}

// Only rating ends the asking for good. One write and no read first: the
// popup closes as the new tab opens.
function endReviewAsk() {
  void saveReviewAsk({ shown: 0, atCount: 0, done: true })
}

// Mounted right after a copy or download, next to that result. Renders nothing
// unless the user qualifies (lib/review-ask.ts).
export default function ReviewAsk({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const [showing, setShowing] = useState<Asked | null>(null)
  const seen = useRef(() => {})

  useEffect(() => {
    void nextShowing().then(setShowing)
  }, [])

  useEffect(() => {
    if (!showing) return
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current?.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
    const counter = countShowingWhenSeen(() => void saveReviewAsk(showing))
    seen.current = counter.now
    return counter.cancel
  }, [showing])

  if (!showing) return null

  function close() {
    seen.current()
    onClose()
  }

  return (
    <section ref={ref} className="review-ask" aria-labelledby="review-ask-title">
      <p id="review-ask-title" className="review-ask-title">Is Cover Me saving you time?</p>
      <p>A rating on the Chrome Web Store helps other job seekers find it.</p>
      <div className="review-ask-actions">
        <a className="btn btn-primary btn-sm" href={RATE_URL} target="_blank" rel="noreferrer" onClick={() => { endReviewAsk(); onClose() }}>Rate Cover Me</a>
        <a className="text-link" href={`${WEB_URL}/support`} target="_blank" rel="noreferrer" onClick={close}>Send feedback</a>
        <button
          className="review-ask-dismiss"
          onClick={() => {
            // The card is gone: put keyboard focus on the controls it sat next to, not <body>.
            const near = ref.current?.nextElementSibling ?? ref.current?.previousElementSibling
            near?.querySelector<HTMLElement>('button, a[href], textarea')?.focus()
            close()
          }}
        >
          Not now
        </button>
      </div>
    </section>
  )
}

// Settings: all three links, always there, never prompting.
export function ReviewLinksSetting() {
  return (
    <section className="page-read-setting" aria-labelledby="review-links-title">
      <h2 id="review-links-title" className="page-read-setting-title">Like Cover Me?</h2>
      <p className="page-read-setting-hint">A rating on the Chrome Web Store helps other job seekers find it.</p>
      <div className="review-ask-actions">
        <a className="text-link" href={RATE_URL} target="_blank" rel="noreferrer" onClick={endReviewAsk}>Rate Cover Me</a>
        <a className="text-link" href="https://github.com/TheLinc/cover-me" target="_blank" rel="noreferrer">Star on GitHub</a>
        <a className="text-link" href={`${WEB_URL}/support`} target="_blank" rel="noreferrer">Send feedback</a>
      </div>
    </section>
  )
}
