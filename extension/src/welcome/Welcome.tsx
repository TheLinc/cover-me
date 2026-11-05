import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getResume, getSession, getSettings, resolveMode, setupState, watchSetup } from '../lib/storage'
import AccountPanel from '../popup/components/AccountPanel'
import ResumePage from '../popup/pages/ResumePage'
import logoIcon from '../public/icon/48.png'
// The sites' own favicons (largest size in each .ico), unchanged.
import indeedIcon from './indeed.png'
import linkedInIcon from './linkedin.png'

type StepState = 'done' | 'current' | 'waiting'

const JOB_SITES = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/', icon: linkedInIcon },
  { name: 'Indeed', url: 'https://www.indeed.com/', icon: indeedIcon },
]

export default function Welcome() {
  // null until the first read, so a set-up user doesn't see the lock flash.
  const [ready, setReady] = useState<boolean | null>(null)
  const [hasResume, setHasResume] = useState(false)
  // One line for a finished step 1: who is signed in, or which key is in use.
  const [summary, setSummary] = useState('')
  // Step 1 reopened with "Change" after it was done.
  const [editing, setEditing] = useState(false)
  // Done swaps in a fresh panel, which loads while step 1 is shut, so the next
  // Change shows what's saved rather than edits left unsaved.
  const [panelKey, setPanelKey] = useState(0)
  const resumeHeading = useRef<HTMLHeadingElement>(null)
  const wasReady = useRef<boolean | null>(null)

  useEffect(() => {
    // The resume waits for step 1: an account to sync it to, or a key to use it with.
    const refresh = async () => {
      const [settings, session, resume] = await Promise.all([getSettings(), getSession(), getResume()])
      const state = setupState(settings, session, resume)
      setReady(state.ready)
      setHasResume(state.hasResume)
      setSummary(resolveMode(settings) === 'hosted'
        ? `Signed in as ${session?.user.email ?? 'your account'}`
        : `Using your ${settings?.provider === 'openai' ? 'OpenAI' : 'Claude'} API key`)
    }
    void refresh()
    return watchSetup(() => void refresh())
  }, [])

  useEffect(() => {
    if (ready === false) setEditing(false) // signed out: the full panel shows anyway
    // Step 1 just finished on this page: take the user to the step it unlocked.
    if (ready && wasReady.current === false) {
      resumeHeading.current?.focus({ preventScroll: true })
      // Scroll once the steps have finished growing and shrinking, or the
      // target is measured where the heading was, not where it ends up.
      const scroll = () => resumeHeading.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        resumeHeading.current?.scrollIntoView({ block: 'start' })
      } else {
        let done = false
        const once = () => { if (!done) { done = true; scroll() } }
        const onEnd = (e: TransitionEvent) => { if (e.propertyName === 'grid-template-rows') once() }
        document.addEventListener('transitionend', onEnd)
        const timer = setTimeout(once, 600) // in case no transition ends
        wasReady.current = ready
        return () => { document.removeEventListener('transitionend', onEnd); clearTimeout(timer) }
      }
    }
    wasReady.current = ready
  }, [ready])

  const accountState: StepState = ready ? 'done' : 'current'
  const resumeState: StepState = !ready ? 'waiting' : hasResume ? 'done' : 'current'
  const postingState: StepState = ready && hasResume ? 'current' : 'waiting'

  return (
    <main className="welcome">
      <div className="logo">
        <img src={logoIcon} width="32" height="32" alt="" className="logo-icon" />
        <span className="logo-text">Cover Me</span>
      </div>
      <h1 className="page-title welcome-title">Your first application is 3 steps away</h1>
      <p className="welcome-sub">Do these in order.</p>

      {ready !== null && <ol className="welcome-steps">
        <Step n={1} state={accountState} title="Create a free account, or add your own API key"
          action={ready ? { label: editing ? 'Done' : 'Change', ariaLabel: editing ? undefined : 'Change your account or API key', expanded: editing, onClick: () => { if (editing) setPanelKey((k) => k + 1); setEditing(!editing) } } : undefined}>
          <Reveal open={!!ready && !editing}><p className="welcome-summary">{summary}</p></Reveal>
          <Reveal open={!ready || editing}>
            <div className="welcome-card">
              <AccountPanel key={panelKey} initialView="signup" links={false} />
            </div>
          </Reveal>
        </Step>

        <Step n={2} state={resumeState} title="Add your resume" headingRef={resumeHeading}>
          <Reveal open={!ready}><p className="hint">Finish step 1 first.</p></Reveal>
          <Reveal open={!!ready}><ResumePage hideHeader /></Reveal>
        </Step>

        <Step n={3} state={postingState} title="Open a job posting">
          <p className="hint">
            Pin Cover Me: click the puzzle icon in Chrome's toolbar, then the pin next to Cover Me.
            On any posting (LinkedIn, Indeed, Greenhouse, Lever, Workday and more), click Cover Me, then Generate.
          </p>
          {/* Only once set up: earlier, they'd invite skipping steps 1 and 2. The
              other sites are hiring systems on each company's site, with no
              job search to link to. */}
          <Reveal open={postingState === 'current'}>
            <div className="welcome-links">
              {JOB_SITES.map(({ name, url, icon }) => (
                <a key={name} className="btn btn-secondary" href={url} target="_blank" rel="noreferrer">
                  <img src={icon} width="18" height="18" alt="" />
                  Find jobs on {name}<span className="welcome-sr"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          </Reveal>
        </Step>
      </ol>}
    </main>
  )
}

function Step({ n, state, title, action, headingRef, children }: {
  n: number
  state: StepState
  title: string
  action?: { label: string; ariaLabel?: string; expanded: boolean; onClick: () => void }
  headingRef?: React.Ref<HTMLHeadingElement>
  children: ReactNode
}) {
  return (
    <li className={`welcome-step welcome-step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
      <span className="welcome-dot" aria-hidden="true">{state === 'done' ? '✓' : n}</span>
      <div className="welcome-step-body">
        <div className="welcome-step-head">
          <h2 ref={headingRef} tabIndex={-1}>
            {title}
            {state === 'done' && <span className="welcome-sr"> (done)</span>}
            {state === 'waiting' && n === 2 && <span className="welcome-sr"> (locked)</span>}
          </h2>
          {action && (
            <button className="auth-link" onClick={action.onClick} aria-label={action.ariaLabel} aria-expanded={action.expanded}>
              {action.label}
            </button>
          )}
        </div>
        {children}
      </div>
    </li>
  )
}

// Grows open and shrinks shut instead of snapping. It stays mounted, so a
// half-filled form keeps its state; shut, it's inert, so nothing in it can be
// clicked, focused or read.
function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  // React 18 doesn't type inert; the empty string turns it on.
  return (
    <div className="welcome-reveal" data-open={open} {...(!open && { inert: '' })}>
      <div>{children}</div>
    </div>
  )
}
