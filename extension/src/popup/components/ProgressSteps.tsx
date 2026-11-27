import { useRef } from 'react'
import type { Step } from '../../lib/progress-steps'

const SPOKEN = { done: 'done', active: 'in progress', todo: 'not started' } as const

export default function ProgressSteps({ steps }: { steps: Step[] }) {
  // The last thought stays so its row can shrink with the text in it (#342).
  const thoughts = useRef<Record<string, string>>({}).current
  for (const s of steps) if (s.thought && s.detail) thoughts[s.label] = s.detail
  return (
    <ul className="steps" aria-live="polite">
      {steps.map((s) => (
        <li key={s.label} className={`step step-${s.state}`} aria-atomic="true" aria-current={s.state === 'active' ? 'step' : undefined}>
          {s.state === 'done' && (
            <span className="step-icon step-icon-done" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          )}
          {s.state === 'active' && <span className="step-icon step-spinner" aria-hidden="true" />}
          {s.state === 'todo' && <span className="step-icon step-icon-todo" aria-hidden="true" />}
          <span>{s.label}</span>
          {s.detail && !s.thought && <><span className="sr-only">, </span><span className="step-detail">{s.detail}</span></>}
          {thoughts[s.label] && <span className={`step-thought${s.thought ? ' open' : ''}`} aria-hidden="true">{thoughts[s.label]}</span>}
          <span className="sr-only">, {SPOKEN[s.state]}</span>
        </li>
      ))}
    </ul>
  )
}
