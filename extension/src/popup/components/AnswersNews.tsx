import { useEffect, useState } from 'react'
import { WEB_URL } from '../../lib/config'
import { isAnswersNewsSeen, markAnswersNewsSeen } from '../../lib/storage'

// Answers to application questions (#232), announced under the Generate page's
// header until the user closes it. The link opens the homepage's demo of the
// right-click flow; utm_source=extension is how site analytics sees these
// visits (no click tracking here, as with What's new).
const DEMO_URL = `${WEB_URL}/?utm_source=extension#answers`

export default function AnswersNews() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    void isAnswersNewsSeen().then((seen) => setShow(!seen))
  }, [])

  if (!show) return null

  function dismiss() {
    setShow(false)
    void markAnswersNewsSeen()
    // The card is gone: move keyboard focus to the page's first control, not <body>.
    const controls = document.querySelectorAll<HTMLElement>('.page button, .page a[href], .page input')
    Array.from(controls).find((el) => !el.closest('.answers-news'))?.focus()
  }

  return (
    <section className="page-read-notice answers-news" aria-labelledby="answers-news-title">
      <div className="news-heading">
        <span className="news-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </span>
        <p id="answers-news-title" className="page-read-notice-title">New: answers to application questions</p>
        <button className="news-dismiss" aria-label="Dismiss" onClick={dismiss}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <p>
        On a job application, right-click a question's box and choose Cover Me: write an answer. It writes one from your
        resume and the posting and types it in, for you to edit.
      </p>
      <a className="text-link answers-news-link" href={DEMO_URL} target="_blank" rel="noreferrer">See how it works</a>
    </section>
  )
}
