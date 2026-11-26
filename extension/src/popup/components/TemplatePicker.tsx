import { RESUME_TEMPLATES, templateOf } from '../../lib/pdf/resume'
import type { ResumeTemplate } from '../../lib/pdf/types'
import UpgradePrompt from './UpgradePrompt'

export const TEMPLATE_NAMES: Record<ResumeTemplate, string> = {
  classic: 'Classic',
  modern: 'Modern',
  compact: 'Compact',
  minimal: 'Minimal',
}

const NOTES: Record<ResumeTemplate, string> = {
  classic: 'Serif, centred',
  modern: 'Sans-serif, indigo headings',
  compact: 'Fits more on a page',
  minimal: 'Large name, open space',
}

// ponytail: a client-side check on the cached tier; templates ship in the bundle, so a
// determined user can get past it. Enforcing it means rendering on the server (#119).
export const isLocked = (template: ResumeTemplate, pro: boolean) => !pro && template !== 'classic'

export default function TemplatePicker({ value, pro, onChange }: { value: ResumeTemplate | undefined; pro: boolean; onChange: (t: ResumeTemplate) => void }) {
  const current = templateOf(value)
  return (
    <fieldset className="template-picker">
      <legend className="form-label">Template</legend>
      <div className="template-options">
        {RESUME_TEMPLATES.map((t) => {
          const locked = isLocked(t, pro)
          return (
            <label key={t} className={`template-option${locked ? ' is-locked' : ''}`} title={NOTES[t]}>
              <input type="radio" name="resume-template" value={t} checked={current === t} disabled={locked} onChange={() => onChange(t)} />
              <span className={`template-thumb template-thumb-${t}`} aria-hidden="true">
                <span className="tt-name" /><span className="tt-rule" /><span className="tt-line" /><span className="tt-line" />
                <span className="tt-rule" /><span className="tt-line" /><span className="tt-line" />
              </span>
              <span className="template-name">{TEMPLATE_NAMES[t]}</span>
              {locked && (
                <span className="template-lock">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                  Pro
                </span>
              )}
            </label>
          )
        })}
      </div>
      {!pro && (
        <>
          <p className="hint">Modern, Compact and Minimal come with Pro.</p>
          <UpgradePrompt />
        </>
      )}
    </fieldset>
  )
}
