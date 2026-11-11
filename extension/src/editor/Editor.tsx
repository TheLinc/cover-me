import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ensureValidSession, fetchApplicationsFromBackend, saveResumeEditToBackend } from '../lib/auth'
import { skillGroups, splitSkills } from '../lib/ai/resume-grounding'
import { downloadTailoredResumePdf, tailoredResumePdf } from '../lib/pdf/resume'
import type { PlacedSection } from '../lib/pdf/sections'
import { editedResume, saveResumeEdit, shownSections, withResumeEdit, withSections } from '../lib/resume-edit'
import { getCachedTier, getMode, getTailoredHistory } from '../lib/storage'
import DownloadMenu from '../popup/components/DownloadMenu'
import GapChips from '../popup/components/GapChips'
import PdfPreview from './PdfPreview'
import ScoreRing from '../popup/components/ScoreRing'
import type { AuthSession, TailoredHistoryEntry, TailoredResume } from '../types'

// The editor tab (#118): a form over one tailored resume on the left, the PDF
// it makes on the right. Edits are the user's own, so the grounding checks
// that guard the model's output don't run on them. Saved to local History as
// you type; a Pro account's copy is overwritten too.

interface Opened { scored: TailoredResume; jobTitle: string; company: string }

// A Pro account's session, or null. Checked from what this browser has
// cached first, so BYOK and Free make no network call here.
async function proSession(): Promise<AuthSession | null> {
  if ((await getMode()) !== 'hosted' || (await getCachedTier()) !== 'hosted_pro') return null
  return ensureValidSession()
}

// Local History first; a Pro resume this browser no longer keeps (made on
// another device, or past the 20 kept here) comes from the account.
async function openResume(id: string): Promise<Opened | null> {
  const entry = (await getTailoredHistory()).find((e) => e.id === id)
  if (entry) return { scored: entry.resume, jobTitle: entry.job.title, company: entry.job.company }
  const session = await proSession()
  if (!session) return null
  for (const app of await fetchApplicationsFromBackend(session.access_token)) {
    const tr = app.tailoredResumes.find((t) => t.id === id)
    if (tr) return { scored: tr.resume, jobTitle: app.title, company: app.company }
  }
  return null
}

// The form's state as a resume: skills joined back into one line, and lines
// left empty dropped. A section emptied out stays, empty, so it can be filled again.
function resumeFromForm(draft: TailoredResume, skills: string[]): TailoredResume {
  const lines = (l: string[] | undefined) => l?.filter((s) => s.trim())
  return {
    ...draft,
    experience: draft.experience.map((e) => ({ ...e, bullets: lines(e.bullets) ?? [] })),
    projects: draft.projects?.map((p) => ({ ...p, bullets: lines(p.bullets) ?? [] })),
    education: draft.education.map((e) => ({ ...e, bullets: lines(e.bullets) ?? [] })),
    certifications: lines(draft.certifications),
    otherSections: draft.otherSections?.map((s) => ({ ...s, lines: lines(s.lines) ?? [] })),
    // Grouped skills ("Languages: Python, SQL") are edited a group per line
    // and kept that way; a plain list goes back to one comma-separated line.
    skills: draft.skills === undefined ? undefined : lines(skills)!.map((s) => s.trim()).join(skillGroups(draft.skills).length ? '\n' : ', '),
  }
}

type Status = '' | 'saving' | 'saved' | 'local'

// Everything an undo step restores.
interface Form { draft: TailoredResume; skills: string[] }

// Typing in one field counts as one undo step until it pauses this long.
const STEP_PAUSE_MS = 1000
const UNDO_LIMIT = 200
const MOD = /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl+'

const SECTION_TITLES: Record<Exclude<PlacedSection['key'], 'other'>, string> = {
  summary: 'Summary', experience: 'Experience', projects: 'Projects', education: 'Education', certifications: 'Certifications', skills: 'Skills',
}

export default function Editor() {
  const id = useMemo(() => new URLSearchParams(location.search).get('id') ?? '', [])
  const [opened, setOpened] = useState<Opened | null | 'loading' | 'error'>('loading')
  const [form, setForm] = useState<Form | null>(null)
  const [steps, setSteps] = useState<{ past: Form[]; future: Form[] }>({ past: [], future: [] })
  const lastStep = useRef<{ field: Element | null; at: number }>({ field: null, at: 0 })
  const [note, setNote] = useState('') // what the last section delete removed
  const focusNext = useRef<string | null>(null) // a control to focus once the form re-renders
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<Status>('')
  const [preview, setPreview] = useState<ArrayBuffer | null>(null)

  const localSaves = useRef<Promise<void>>(Promise.resolve())
  const accountSaves = useRef<Promise<void>>(Promise.resolve())
  const forAccount = useRef<TailoredResume | null>(null) // saved locally, not yet sent
  const accountOk = useRef(true)
  const session = useRef<AuthSession | null>(null)

  useEffect(() => {
    openResume(id).then((o) => {
      setOpened(o)
      if (!o) return
      setForm({ draft: structuredClone(o.scored), skills: o.scored.skills ? (skillGroups(o.scored.skills).length ? o.scored.skills.split(/\n+/).filter((l) => l.trim()) : splitSkills(o.scored.skills)) : [] })
      document.title = `Edit resume · ${o.jobTitle || 'Cover Me'}`
      // Ready for a save as the tab closes, which can't wait for a refresh.
      void proSession().then((s) => { session.current = s }).catch(() => {})
    }).catch(() => setOpened('error'))
  }, [id])

  const scored = typeof opened === 'object' && opened ? opened.scored : null
  const current = useMemo(() => (form ? resumeFromForm(form.draft, form.skills) : null), [form])
  const saved = useMemo(() => (current && scored ? editedResume(scored, current) : null), [current, scored])

  // The preview, re-made a moment after typing stops.
  useEffect(() => {
    if (!current) return
    const t = setTimeout(() => {
      setPreview(tailoredResumePdf(current).output('arraybuffer'))
    }, 300)
    return () => clearTimeout(t)
  }, [current])

  // The account's copy, one save at a time, in order.
  function saveToAccount(): Promise<void> {
    accountSaves.current = accountSaves.current.then(async () => {
      const edit = forAccount.current
      if (!edit) return
      forAccount.current = null
      try {
        await localSaves.current
        session.current = await proSession()
        if (session.current) await saveResumeEditToBackend(session.current.access_token, id, edit)
        accountOk.current = true
        setStatus('saved')
      } catch {
        accountOk.current = false
        setStatus('local')
      }
    })
    return accountSaves.current
  }

  // History gets each pause in typing; the account's copy a moment later.
  // ponytail: History is read then written whole, as the background does when
  // a tailor finishes, so the two can still collide; the pause keeps it rare.
  // A per-entry key would end it.
  useEffect(() => {
    if (!dirty || !saved) return
    setStatus('saving')
    forAccount.current = saved
    const local = setTimeout(() => {
      localSaves.current = localSaves.current.then(() => saveResumeEdit(id, saved)).catch(() => {})
    }, 300)
    const account = setTimeout(saveToAccount, 800)
    return () => { clearTimeout(local); clearTimeout(account) }
  }, [saved, dirty])

  // Closing the tab before those: save now. There's no time to read History
  // first, so a copy is kept current here. The account's copy goes with
  // keepalive (in saveResumeEditToBackend), so it lands after the page is gone.
  const history = useRef<TailoredHistoryEntry[] | null>(null)
  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && 'tailoredHistory' in changes) history.current = (changes.tailoredHistory.newValue as TailoredHistoryEntry[]) ?? []
    }
    chrome.storage.onChanged.addListener(listener)
    void getTailoredHistory().then((list) => { history.current ??= list })
    function flush() {
      const edit = forAccount.current
      forAccount.current = null
      if (!edit) return
      const next = history.current && withResumeEdit(history.current, id, edit)
      if (next) void chrome.storage.local.set({ tailoredHistory: next })
      if (session.current) void saveResumeEditToBackend(session.current.access_token, id, edit).catch(() => {})
    }
    window.addEventListener('pagehide', flush)
    return () => {
      chrome.storage.onChanged.removeListener(listener)
      window.removeEventListener('pagehide', flush)
    }
  }, [id])

  // Every change goes through here, so it can be undone. Typing in one field
  // joins the step before it until a pause; anything else is a step of its own.
  function change(update: (f: Form) => Form) {
    if (!form) return
    const active = document.activeElement
    const field = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null
    const now = Date.now()
    const joins = field !== null && field === lastStep.current.field && now - lastStep.current.at < STEP_PAUSE_MS
    lastStep.current = { field, at: now }
    setSteps((s) => ({ past: joins ? s.past : [...s.past, form].slice(-UNDO_LIMIT), future: [] }))
    setForm(update(form))
    setNote('')
    setDirty(true)
  }

  function edit(fn: (r: TailoredResume) => void) {
    change((f) => {
      const draft = structuredClone(f.draft)
      fn(draft)
      return { ...f, draft }
    })
  }

  function undo() {
    if (!form || !steps.past.length) return
    setSteps({ past: steps.past.slice(0, -1), future: [form, ...steps.future] })
    setForm(steps.past[steps.past.length - 1])
    lastStep.current = { field: null, at: 0 }
    setNote('')
    setDirty(true)
  }

  function redo() {
    if (!form || !steps.future.length) return
    setSteps({ past: [...steps.past, form], future: steps.future.slice(1) })
    setForm(steps.future[0])
    lastStep.current = { field: null, at: 0 }
    setNote('')
    setDirty(true)
  }

  // Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y (⌘ on a Mac) work in a field too: one
  // history for the whole resume instead of each field's own.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Focus follows a moved section's button, or goes to Undo after a delete.
  useEffect(() => {
    if (!focusNext.current) return
    document.querySelector<HTMLElement>(focusNext.current)?.focus()
    focusNext.current = null
  }, [form])

  function moveSection(list: PlacedSection[], i: number, by: number, title: string) {
    const next = [...list]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    change((f) => ({ ...f, draft: withSections(f.draft, next) }))
    // Moved to the top or bottom, its button is disabled: focus the other one.
    const end = by < 0 ? i + by === 0 : i + by === list.length - 1
    const dir = (by < 0) !== end ? 'up' : 'down'
    focusNext.current = `[aria-label="Move ${CSS.escape(title)} section ${dir}"]`
  }

  function deleteSection(list: PlacedSection[], i: number, title: string) {
    change((f) => ({ ...f, draft: withSections(f.draft, list.filter((_, j) => j !== i)) }))
    setNote(`${title} deleted.`)
    focusNext.current = '.ed-note button'
  }

  // Closes once everything is saved. When the account couldn't be reached the
  // tab stays, showing why.
  async function done() {
    if (dirty && saved) {
      forAccount.current = saved
      localSaves.current = localSaves.current.then(() => saveResumeEdit(id, saved)).catch(() => {})
    }
    await saveToAccount()
    if (accountOk.current) window.close()
  }

  if (opened === 'loading') return <main className="ed-message">Opening your resume…</main>
  if (opened === 'error') return <main className="ed-message">Couldn't open this resume. Check your connection and reload the tab.</main>
  if (!opened || !form || !current || !scored || !saved) {
    return <main className="ed-message">This resume isn't in your History anymore.</main>
  }

  const edited = dirty || !!scored.editedAt
  const { draft, skills } = form
  const sections = shownSections(draft)

  function sectionFields(placed: PlacedSection): ReactNode {
    switch (placed.key) {
      case 'summary':
        return <Field label="Summary" hideLabel long value={draft.summary ?? ''} onChange={(v) => edit((r) => { r.summary = v })} />
      case 'experience':
        return draft.experience.map((e, i) => (
          <div key={i} className="ed-item">
            <div className="ed-grid">
              <Field label="Title" value={e.title} onChange={(v) => edit((r) => { r.experience[i].title = v })} />
              <Field label="Dates" value={e.dates} onChange={(v) => edit((r) => { r.experience[i].dates = v })} />
              <Field label="Company" value={e.company} onChange={(v) => edit((r) => { r.experience[i].company = v })} />
              <Field label="Location" value={e.location} onChange={(v) => edit((r) => { r.experience[i].location = v })} />
            </div>
            <Lines label={`Bullets for ${e.title || `job ${i + 1}`}`} noun="bullet" items={e.bullets ?? []}
              onChange={(l) => edit((r) => { r.experience[i].bullets = l })} />
          </div>
        ))
      case 'projects':
        return (draft.projects ?? []).map((p, i) => (
          <div key={i} className="ed-item">
            <Field label="Project" value={p.name} onChange={(v) => edit((r) => { r.projects![i].name = v })} />
            <Lines label={`Bullets for ${p.name || `project ${i + 1}`}`} noun="bullet" items={p.bullets ?? []}
              onChange={(l) => edit((r) => { r.projects![i].bullets = l })} />
          </div>
        ))
      case 'education':
        return draft.education.map((e, i) => (
          <div key={i} className="ed-item">
            <div className="ed-grid">
              <Field label="School" value={e.institution} onChange={(v) => edit((r) => { r.education[i].institution = v })} />
              <Field label="Dates" value={e.dates} onChange={(v) => edit((r) => { r.education[i].dates = v })} />
              <Field label="Degree" value={e.degree} onChange={(v) => edit((r) => { r.education[i].degree = v })} />
              <Field label="Location" value={e.location} onChange={(v) => edit((r) => { r.education[i].location = v })} />
            </div>
            <Lines label={`Bullets for ${e.institution || `school ${i + 1}`}`} noun="bullet" items={e.bullets ?? []}
              onChange={(l) => edit((r) => { r.education[i].bullets = l })} />
          </div>
        ))
      case 'certifications':
        return <Lines label="Certifications" hideLabel noun="certification" items={draft.certifications ?? []}
          onChange={(l) => edit((r) => { r.certifications = l })} />
      case 'skills':
        return <Lines label="Skills" hideLabel noun="skill" items={skills} short
          onChange={(l) => change((f) => ({ ...f, skills: l }))} />
      case 'other': {
        const s = draft.otherSections![placed.index]
        return (
          <>
            <Field label="Heading" value={s.heading} onChange={(v) => edit((r) => { r.otherSections![placed.index].heading = v })} />
            <Lines label={`Lines under ${s.heading || 'this section'}`} noun="line" items={s.lines ?? []}
              onChange={(l) => edit((r) => { r.otherSections![placed.index].lines = l })} />
          </>
        )
      }
    }
  }

  return (
    <div className="ed">
      <header className="ed-bar">
        <div className="ed-bar-title">
          <h1>Edit resume</h1>
          <p>{[opened.jobTitle, opened.company].filter(Boolean).join(' · ')}</p>
        </div>
        <p className="ed-note" aria-live="polite">
          {note && <>{note} <button type="button" className="text-link" onClick={undo}>Undo</button></>}
        </p>
        <div className="ed-history">
          <button type="button" className="ed-icon" aria-label="Undo" title={`Undo (${MOD}Z)`} aria-keyshortcuts="Control+Z Meta+Z" disabled={!steps.past.length} onClick={undo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /></svg>
          </button>
          <button type="button" className="ed-icon" aria-label="Redo" title={`Redo (${MOD}Shift+Z)`} aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y" disabled={!steps.future.length} onClick={redo}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 000 11H13" /></svg>
          </button>
        </div>
        <p className="ed-status" aria-live="polite">
          {status === 'saving' ? 'Saving…'
            : status === 'saved' ? 'Saved'
            : status === 'local' ? "Couldn't reach your account, so it still has the version from before this edit. Press Done to try again."
            : ''}
        </p>
        {/* Only Cover Me layout resumes open here (no Edit on "Your design"), so Word is the Cover Me layout too. */}
        <DownloadMenu className="btn btn-secondary btn-compact" options={[
          { label: 'PDF', onSelect: () => downloadTailoredResumePdf(current, opened.jobTitle) },
          // docx is big, so it loads only when someone asks for the Word file.
          { label: 'Word', onSelect: () => void import('../lib/pdf/resume-docx').then((m) => m.downloadTailoredResumeDocx(current, opened.jobTitle)) },
        ]} />
        <button className="btn btn-primary btn-compact" onClick={done}>Done</button>
      </header>

      <main className="ed-form">
        {(typeof scored.atsScore === 'number' || (saved.atsGaps?.length ?? 0) > 0) && (
          <section className="ats-result" aria-label="ATS result">
            {typeof scored.atsScore === 'number' && <ScoreRing score={scored.atsScore} size={88} />}
            <div className="ats-detail">
              {edited && <p className="ats-edited">Scored before your edits</p>}
              <GapChips gaps={saved.atsGaps ?? []} />
            </div>
          </section>
        )}

        <Section title="Contact">
          <div className="ed-grid">
            <Field label="Name" value={draft.name} onChange={(v) => edit((r) => { r.name = v })} />
            <Field label="Phone" value={draft.phone} onChange={(v) => edit((r) => { r.phone = v })} />
            <Field label="Email" value={draft.email} onChange={(v) => edit((r) => { r.email = v })} />
            <Field label="Location" value={draft.location ?? ''} onChange={(v) => edit((r) => { r.location = v })} />
          </div>
          {/* links (#129) prints instead of website; a resume parsed before it has only website. website stays
              set to the first link for builds that print only that. */}
          <Lines label="Links" noun="link" short items={draft.links ?? (draft.website ? [draft.website] : [])}
            onChange={(l) => edit((r) => { r.links = l; r.website = l.find((x) => x.trim())?.trim() ?? '' })} />
        </Section>

        {sections.map((placed, i) => {
          const title = placed.key === 'other' ? draft.otherSections![placed.index].heading || 'Other' : SECTION_TITLES[placed.key]
          const controls: SectionControls = {
            first: i === 0,
            last: i === sections.length - 1,
            move: (by) => moveSection(sections, i, by, title),
            remove: () => deleteSection(sections, i, title),
          }
          return (
            <Section key={placed.key === 'other' ? `other-${placed.index}` : placed.key} title={title} controls={controls}>
              {sectionFields(placed)}
            </Section>
          )
        })}
      </main>

      <aside className="ed-preview" aria-label="PDF preview">
        <PdfPreview pdf={preview} />
      </aside>
    </div>
  )
}

interface SectionControls { first: boolean; last: boolean; move: (by: number) => void; remove: () => void }

function Section({ title, children, controls }: { title: string; children: ReactNode; controls?: SectionControls }) {
  return (
    <section className="ed-section">
      <div className="ed-section-head">
        <h2>{title}</h2>
        {controls && (
          <div className="ed-line-tools">
            <button type="button" className="ed-icon" aria-label={`Move ${title} section up`} title="Move section up" disabled={controls.first} onClick={() => controls.move(-1)}>↑</button>
            <button type="button" className="ed-icon" aria-label={`Move ${title} section down`} title="Move section down" disabled={controls.last} onClick={() => controls.move(1)}>↓</button>
            <button type="button" className="ed-icon ed-icon-delete" aria-label={`Delete ${title} section`} title="Delete section" onClick={controls.remove}>×</button>
          </div>
        )}
      </div>
      {children}
    </section>
  )
}

function Field({ label, value, onChange, long, hideLabel }: { label: string; value: string; onChange: (v: string) => void; long?: boolean; hideLabel?: boolean }) {
  return (
    <label className="ed-field">
      <span className={hideLabel ? 'ed-sr' : 'form-label'}>{label}</span>
      {long
        ? <textarea className="form-input ed-text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        : <input className="form-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
    </label>
  )
}

// A list the user can add to, delete from and reorder: bullets, skills,
// certifications, an extra section's lines.
function Lines({ label, noun, items, onChange, hideLabel, short }: {
  label: string; noun: string; items: string[]; onChange: (items: string[]) => void; hideLabel?: boolean; short?: boolean
}) {
  const listRef = useRef<HTMLOListElement>(null)
  const [focusLast, setFocusLast] = useState(false)
  useEffect(() => {
    if (!focusLast) return
    setFocusLast(false)
    listRef.current?.querySelector<HTMLElement>('li:last-child textarea, li:last-child input')?.focus()
  }, [focusLast])

  const move = (i: number, by: number) => {
    const next = [...items]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    onChange(next)
  }
  return (
    <fieldset className={`ed-lines${short ? ' ed-lines-short' : ''}`}>
      <legend className={hideLabel ? 'ed-sr' : 'form-label'}>{label}</legend>
      <ol ref={listRef}>
        {items.map((text, i) => (
          <li key={i} className="ed-line">
            {short
              ? <input className="form-input" aria-label={`${noun} ${i + 1}`} value={text} onChange={(e) => onChange(items.map((t, j) => (j === i ? e.target.value : t)))} />
              : <textarea className="form-input ed-text" aria-label={`${noun} ${i + 1}`} value={text} onChange={(e) => onChange(items.map((t, j) => (j === i ? e.target.value : t)))} />}
            <div className="ed-line-tools">
              <button type="button" className="ed-icon" aria-label={`Move ${noun} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="ed-icon" aria-label={`Move ${noun} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className="ed-icon ed-icon-delete" aria-label={`Delete ${noun} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-ghost btn-sm ed-add" onClick={() => { onChange([...items, '']); setFocusLast(true) }}>
        Add {noun}
      </button>
    </fieldset>
  )
}
