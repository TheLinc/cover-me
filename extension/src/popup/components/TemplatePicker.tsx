import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { accentOf, DEFAULT_ACCENT, hasAccent, RESUME_TEMPLATES, templateOf } from '../../lib/pdf/resume'
import type { ResumeTemplate } from '../../lib/pdf/types'
import { getResumeLook, isCachedPro, saveResumeLook, templatesUnlocked, type ResumeLook } from '../../lib/resume-template'
import { ChevronIcon } from './icons'
import UpgradePrompt from './UpgradePrompt'

export const templateName = (t: ResumeTemplate) => t[0].toUpperCase() + t.slice(1)

// ponytail: a client-side check on the cached tier; templates ship in the bundle, so a
// determined user can get past it. Enforcing it means rendering on the server (#119).
export const isLocked = (template: ResumeTemplate, unlocked: boolean) => !unlocked && template !== 'classic'

// The tailor drops a template the account can't pick, so a pick saved while Pro shows as Classic once Pro lapses (#119).
export function nextTemplate(saved: ResumeTemplate | undefined, unlocked: boolean): ResumeTemplate {
  const t = templateOf(saved)
  return isLocked(t, unlocked) ? 'classic' : t
}

// Rechecked on a sign-in, sign-out, mode switch or tier refresh, which Settings can do while it's open (#119).
function useStoredCheck(read: () => Promise<boolean>): boolean {
  const [value, setValue] = useState(false)
  useEffect(() => {
    const check = () => void read().then(setValue)
    check()
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && ('cachedTier' in changes || 'settings' in changes)) check()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [read])
  return value
}

export const useCachedPro = () => useStoredCheck(isCachedPro)
export const useTemplatesUnlocked = () => useStoredCheck(templatesUnlocked)

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
        <span className="form-label">Accent</span>
        <input ref={input} type="color" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Accent colour" aria-describedby={hint} />
        <span className="template-accent-hex">{draft.toUpperCase()}</span>
      </label>
      {shown.toLowerCase() !== DEFAULT_ACCENT.toLowerCase() && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { onChange(DEFAULT_ACCENT); input.current?.focus() }}>Reset to default</button>
      )}
      <p id={hint} className="hint" role="status">{lowContrast(draft) && 'Light colours can be hard to read on a printed page.'}</p>
    </div>
  )
}

// Stays mounted so it can grow and shrink; inert keeps the hidden part out of the tab order and away from screen readers (#119).
export function Reveal({ shown, children }: { shown: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { ref.current?.toggleAttribute('inert', !shown) }, [shown])
  return <div ref={ref} className={`template-reveal${shown ? ' is-shown' : ''}`}><div>{children}</div></div>
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

export default function TemplatePicker({ value, unlocked, onChange, previewLocked, accent, onAccent }: {
  value: ResumeTemplate | undefined; unlocked: boolean; onChange: (t: ResumeTemplate) => void; previewLocked?: boolean
  accent?: string; onAccent?: (hex: string) => void
}) {
  const current = templateOf(value)
  const group = useId()
  // Stays true once opened, so the upgrade prompt is still there while the picker shrinks shut (#119).
  const [opened, setOpened] = useState(false)
  return (
    <details className="template-picker" onToggle={(e) => { if (e.currentTarget.open) setOpened(true) }}>
      <summary className="template-bar">
        <Sketch template={current} mini accent={accent} />
        <span className="template-current"><span className="form-label">Template</span><span className="template-current-name">{templateName(current)}</span></span>
        {!unlocked && <span className="template-more">3 more with Pro</span>}
        <span className="template-toggle">Change <ChevronIcon /></span>
      </summary>
      <fieldset className="template-choices">
        <legend className="sr-only">Template</legend>
        <div className="template-options">
          {RESUME_TEMPLATES.map((t) => {
            const locked = isLocked(t, unlocked)
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
        {!unlocked && opened && (
          <>
            <p className="hint">Modern, Compact and Minimal come with Pro.</p>
            <UpgradePrompt />
          </>
        )}
      </fieldset>
      {unlocked && onAccent && <Reveal shown={hasAccent(current)}><AccentPicker value={accent} onChange={onAccent} /></Reveal>}
    </details>
  )
}

export function TemplateSetting() {
  const unlocked = useTemplatesUnlocked()
  const [look, setLook] = useState<ResumeLook>({})
  useEffect(() => { void getResumeLook().then(setLook) }, [])
  const change = (patch: ResumeLook) => { setLook((l) => ({ ...l, ...patch })); void saveResumeLook(patch) }
  return <TemplatePicker value={nextTemplate(look.template, unlocked)} unlocked={unlocked} onChange={(template) => change({ template })} accent={look.accent} onAccent={(accent) => change({ accent })} />
}
