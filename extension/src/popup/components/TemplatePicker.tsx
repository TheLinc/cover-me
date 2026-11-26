import { useEffect, useId, useState } from 'react'
import { RESUME_TEMPLATES, templateOf } from '../../lib/pdf/resume'
import type { ResumeTemplate } from '../../lib/pdf/types'
import { getResumeTemplate, isCachedPro, saveResumeTemplate } from '../../lib/resume-template'
import { ChevronIcon } from './icons'
import UpgradePrompt from './UpgradePrompt'

export const templateName = (t: ResumeTemplate) => t[0].toUpperCase() + t.slice(1)

// ponytail: a client-side check on the cached tier; templates ship in the bundle, so a
// determined user can get past it. Enforcing it means rendering on the server (#119).
export const isLocked = (template: ResumeTemplate, pro: boolean) => !pro && template !== 'classic'

// The tailor drops a template the account can't pick, so a pick saved while Pro shows as Classic once Pro lapses (#119).
export function nextTemplate(saved: ResumeTemplate | undefined, pro: boolean): ResumeTemplate {
  const t = templateOf(saved)
  return isLocked(t, pro) ? 'classic' : t
}

// Rechecked on a sign-in, sign-out, mode switch or tier refresh, which Settings can do while it's open (#119).
export function useCachedPro(): boolean {
  const [pro, setPro] = useState(false)
  useEffect(() => {
    const check = () => void isCachedPro().then(setPro)
    check()
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && ('cachedTier' in changes || 'settings' in changes)) check()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])
  return pro
}

function Sketch({ template, mini }: { template: ResumeTemplate; mini?: boolean }) {
  return (
    <span className={`template-thumb template-thumb-${template}${mini ? ' template-thumb-mini' : ''}`} aria-hidden="true">
      <span className="tt-name" /><span className="tt-rule" /><span className="tt-line" /><span className="tt-line" />
      <span className="tt-rule" /><span className="tt-line" /><span className="tt-line" />
    </span>
  )
}

export default function TemplatePicker({ value, pro, onChange }: { value: ResumeTemplate | undefined; pro: boolean; onChange: (t: ResumeTemplate) => void }) {
  const current = templateOf(value)
  const group = useId()
  const [open, setOpen] = useState(false)
  return (
    <details className="template-picker" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="template-bar">
        <Sketch template={current} mini />
        <span className="template-current"><span className="form-label">Template</span>{templateName(current)}</span>
        {!pro && <span className="template-more">3 more with Pro</span>}
        <span className="template-toggle">Change <ChevronIcon /></span>
      </summary>
      <fieldset className="template-choices">
        <legend className="sr-only">Template</legend>
        <div className="template-options">
          {RESUME_TEMPLATES.map((t) => {
            const locked = isLocked(t, pro)
            return (
              <label key={t} className={`template-option${locked ? ' is-locked' : ''}`}>
                <input type="radio" name={group} value={t} checked={current === t} disabled={locked} onChange={() => onChange(t)} />
                <Sketch template={t} />
                <span className="template-name">{templateName(t)}</span>
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
        {!pro && open && (
          <>
            <p className="hint">Modern, Compact and Minimal come with Pro.</p>
            <UpgradePrompt />
          </>
        )}
      </fieldset>
    </details>
  )
}

export function TemplateSetting() {
  const pro = useCachedPro()
  const [template, setTemplate] = useState<ResumeTemplate | undefined>()
  useEffect(() => { void getResumeTemplate().then(setTemplate) }, [])
  return (
    <section className="page-read-setting" aria-labelledby="template-setting-title">
      <h2 id="template-setting-title" className="page-read-setting-title">Resume template</h2>
      <p className="page-read-setting-hint">Used for your next tailored resume. You can change it on any resume.</p>
      <TemplatePicker value={nextTemplate(template, pro)} pro={pro} onChange={(t) => { setTemplate(t); void saveResumeTemplate(t) }} />
    </section>
  )
}
