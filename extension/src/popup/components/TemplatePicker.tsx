import { useEffect, useId, useRef, useState } from 'react'
import { accentOf, DEFAULT_ACCENT, hasAccent, RESUME_TEMPLATES, templateOf } from '../../lib/pdf/resume'
import type { ResumeTemplate } from '../../lib/pdf/types'
import { getResumeLook, isCachedPro, saveResumeLook, type ResumeLook } from '../../lib/resume-template'
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

// Below WCAG's 4.5:1 for normal text against the white page: Modern's headings are 10.5pt (https://www.w3.org/TR/WCAG21/#contrast-minimum).
export function lowContrast(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05) < 4.5
}

function AccentPicker({ value, onChange }: { value: string | undefined; onChange: (hex: string) => void }) {
  const shown = accentOf(value) ?? DEFAULT_ACCENT
  const [draft, setDraft] = useState(shown)
  useEffect(() => setDraft(shown), [shown])
  const input = useRef<HTMLInputElement>(null)
  const hint = useId()
  // React's onChange fires on every step of a drag; the native change event fires once the picker closes, so that's when it saves (#119).
  useEffect(() => {
    const el = input.current
    if (!el) return
    const commit = () => onChange(el.value)
    el.addEventListener('change', commit)
    return () => el.removeEventListener('change', commit)
  }, [onChange])
  return (
    <div className="template-accent">
      <label className="template-accent-label">
        <span className="form-label">Accent colour</span>
        <input ref={input} type="color" value={draft} onChange={(e) => setDraft(e.target.value)} aria-describedby={hint} />
        <span className="template-accent-hex">{draft.toUpperCase()}</span>
      </label>
      {shown.toLowerCase() !== DEFAULT_ACCENT.toLowerCase() && (
        <button type="button" className="text-link" onClick={() => { onChange(DEFAULT_ACCENT); input.current?.focus() }}>Reset to indigo</button>
      )}
      <p id={hint} className="hint" role="status">{lowContrast(draft) && 'Light colours can be hard to read on a printed page.'}</p>
    </div>
  )
}

function Sketch({ template, mini, accent }: { template: ResumeTemplate; mini?: boolean; accent?: string }) {
  const tint = accentOf(accent)
  return (
    <span className={`template-thumb template-thumb-${template}${mini ? ' template-thumb-mini' : ''}`} aria-hidden="true" style={tint ? { '--tt-accent': tint } as React.CSSProperties : undefined}>
      <span className="tt-name" /><span className="tt-rule" /><span className="tt-line" /><span className="tt-line" />
      <span className="tt-rule" /><span className="tt-line" /><span className="tt-line" />
    </span>
  )
}

export default function TemplatePicker({ value, pro, onChange, previewLocked, accent, onAccent, titled }: {
  value: ResumeTemplate | undefined; pro: boolean; onChange: (t: ResumeTemplate) => void; previewLocked?: boolean
  accent?: string; onAccent?: (hex: string) => void; titled?: boolean
}) {
  const current = templateOf(value)
  const group = useId()
  const [open, setOpen] = useState(false)
  return (
    <details className="template-picker" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="template-bar">
        <Sketch template={current} mini accent={accent} />
        <span className="template-current"><span className={titled ? 'sr-only' : 'form-label'}>Template</span>{templateName(current)}</span>
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
                <input type="radio" name={group} value={t} checked={current === t} disabled={locked && !previewLocked} onChange={() => onChange(t)} />
                <Sketch template={t} accent={accent} />
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
      {pro && onAccent && hasAccent(current) && <AccentPicker value={accent} onChange={onAccent} />}
    </details>
  )
}

export function TemplateSetting() {
  const pro = useCachedPro()
  const [look, setLook] = useState<ResumeLook>({})
  useEffect(() => { void getResumeLook().then(setLook) }, [])
  const change = (patch: ResumeLook) => { setLook((l) => ({ ...l, ...patch })); void saveResumeLook(patch) }
  return (
    <section className="page-read-setting" aria-labelledby="template-setting-title">
      <h2 id="template-setting-title" className="page-read-setting-title">Resume template</h2>
      <p className="page-read-setting-hint">Used for your next tailored resume. You can change it on any resume.</p>
      <TemplatePicker titled value={nextTemplate(look.template, pro)} pro={pro} onChange={(template) => change({ template })} accent={look.accent} onAccent={(accent) => change({ accent })} />
    </section>
  )
}
