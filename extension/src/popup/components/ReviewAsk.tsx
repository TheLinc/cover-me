import { useEffect, useRef, useState } from 'react'
import { WEB_URL } from '../../lib/config'
import { countShowingWhenSeen, nextShowing, type ReviewAsk as Asked } from '../../lib/review-ask'
import { getGenerationCount, getHistory, getReviewAsk, getTailoredHistory, saveReviewAsk } from '../../lib/storage'

const RATE_URL = 'https://chromewebstore.google.com/detail/bpbnopjgjbimdjjdolhkgimllbgamgpi/reviews'

// One write and no read first: the popup closes as soon as the store tab opens (#96).
function endReviewAsk() {
  void saveReviewAsk({ shown: 0, atCount: 0, done: true })
}

export default function ReviewAsk({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const [showing, setShowing] = useState<Asked | null>(null)
  const seen = useRef(() => {})

  useEffect(() => {
    void Promise.all([getGenerationCount(), getHistory(), getTailoredHistory(), getReviewAsk()])
      .then(([gen, letters, resumes, ask]) => setShowing(nextShowing(gen, [...letters, ...resumes], ask, Date.now())))
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
            // Removing the card would otherwise drop keyboard focus to <body> (#266).
            const card = ref.current!
            const controls = 'button, a[href], textarea, input'
            const near = [card.nextElementSibling, card.previousElementSibling].map((el) => el?.querySelector<HTMLElement>(controls)).find(Boolean)
              ?? [...document.querySelectorAll<HTMLElement>(controls)].find((el) => !card.contains(el) && card.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
            near?.focus()
            close()
          }}
        >
          Not now
        </button>
      </div>
    </section>
  )
}

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
