import type { Step } from '../../lib/progress-steps'

const SPOKEN = { done: 'done', active: 'in progress', todo: 'not started' } as const

// Done steps get a check square, the active one a spinner, later ones a
// dashed square (the website's ProgressStep, made real). Screen readers hear
// each step's state, and the live region announces it as the run moves on.
export default function ProgressSteps({ steps }: { steps: Step[] }) {
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
          {s.detail && <span className="step-detail">{s.detail}</span>}
          <span className="sr-only">, {SPOKEN[s.state]}</span>
        </li>
      ))}
    </ul>
  )
}
