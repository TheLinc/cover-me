import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ensureValidSession } from '../lib/auth'
import { getResume, getSession, getSettings, resolveMode, setupState, watchSetup } from '../lib/storage'
import AccountPanel from '../popup/components/AccountPanel'
import ResumePage from '../popup/pages/ResumePage'
import logoIcon from '../public/icon/48.png'
import { IndeedIcon, LinkedInIcon } from './JobSiteIcons'

type StepState = 'done' | 'current' | 'waiting'

const JOB_SITES = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/', Icon: LinkedInIcon },
  { name: 'Indeed', url: 'https://www.indeed.com/', Icon: IndeedIcon },
]

export default function Welcome() {
  // null until the first read, so a set-up user doesn't see the lock flash.
  const [ready, setReady] = useState<boolean | null>(null)
  const [hasResume, setHasResume] = useState(false)
  // One line for a finished step 1: who is signed in, or which key is in use.
  const [summary, setSummary] = useState('')
  // Step 1 reopened with "Change" after it was done.
  const [editing, setEditing] = useState(false)
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
    // AccountPanel used to do this on load; collapsed, it isn't mounted. A
    // refreshed or cleared session lands through the watcher.
    void ensureValidSession()
    return watchSetup(() => void refresh())
  }, [])

  useEffect(() => {
    if (ready === false) setEditing(false) // signed out: the full panel shows anyway
    // Step 1 just finished on this page: take the user to the step it unlocked.
    if (ready && wasReady.current === false) {
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches
      resumeHeading.current?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
      resumeHeading.current?.focus({ preventScroll: true })
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
      <h1 className="page-title welcome-title">Your first letter is three steps away</h1>
      <p className="welcome-sub">Do these in order.</p>

      {ready !== null && <ol className="welcome-steps">
        <Step n={1} state={accountState} title="Create a free account, or add your own API key"
          action={ready ? { label: editing ? 'Done' : 'Change', ariaLabel: editing ? undefined : 'Change your account or API key', expanded: editing, onClick: () => setEditing(!editing) } : undefined}>
          {ready && !editing
            ? <p className="welcome-summary">{summary}</p>
            : (
              <div className="welcome-card">
                <AccountPanel initialView="signup" links={false} />
              </div>
            )}
        </Step>

        <Step n={2} state={resumeState} title="Add your resume" headingRef={resumeHeading}>
          {ready ? <ResumePage hideHeader /> : <p className="hint">Finish step 1 first.</p>}
        </Step>

        <Step n={3} state={postingState} title="Open a job posting">
          <p className="hint">
            Pin Cover Me: click the puzzle icon in Chrome's toolbar, then the pin next to Cover Me.
            On any posting (LinkedIn, Indeed, Greenhouse, Lever, Workday and more), click Cover Me, then Generate.
          </p>
          {/* Only once set up: earlier, they'd invite skipping steps 1 and 2. The
              other sites are hiring systems on each company's site, with no
              job search to link to. */}
          {postingState === 'current' && (
            <div className="welcome-links">
              {JOB_SITES.map(({ name, url, Icon }) => (
                <a key={name} className="btn btn-secondary" href={url} target="_blank" rel="noreferrer">
                  <Icon />
                  Find jobs on {name}<span className="welcome-sr"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          )}
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
