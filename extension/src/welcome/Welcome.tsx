import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getResume, getSession, getSettings, isAccountReady, resolveMode, watchAccountReady, watchResume } from '../lib/storage'
import AccountPanel from '../popup/components/AccountPanel'
import ResumePage from '../popup/pages/ResumePage'
import logoIcon from '../public/icon/48.png'

type StepState = 'done' | 'current' | 'waiting'

// One line for a finished step 1: who is signed in, or which key is in use.
async function accountSummary(): Promise<string> {
  const [settings, session] = await Promise.all([getSettings(), getSession()])
  if (resolveMode(settings) === 'hosted') return `Signed in as ${session?.user.email ?? 'your account'}`
  return `Using your ${settings?.provider === 'openai' ? 'OpenAI' : 'Claude'} API key`
}

export default function Welcome() {
  // null until the first read, so a set-up user doesn't see the lock flash.
  const [ready, setReady] = useState<boolean | null>(null)
  const [summary, setSummary] = useState('')
  const [hasResume, setHasResume] = useState(false)
  // Step 1 reopened with "Change" after it was done.
  const [editing, setEditing] = useState(false)
  const resumeHeading = useRef<HTMLHeadingElement>(null)
  const wasReady = useRef<boolean | null>(null)

  useEffect(() => {
    // The resume waits for step 1: an account to sync it to, or a key to use it with.
    const refresh = async () => {
      const [r, s] = await Promise.all([isAccountReady(), accountSummary()])
      setReady(r)
      setSummary(s)
    }
    void refresh()
    const showResume = (r: { signedOutUpload?: boolean } | null) => setHasResume(!!r && !r.signedOutUpload)
    getResume().then(showResume)
    const stopAccount = watchAccountReady(() => void refresh())
    const stopResume = watchResume(showResume)
    return () => { stopAccount(); stopResume() }
  }, [])

  useEffect(() => {
    if (ready === false) setEditing(false) // signed out: the full panel shows anyway
    // Step 1 just finished on this page: take the user to the step it unlocked.
    if (ready && wasReady.current === false) {
      resumeHeading.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

      <ol className="welcome-steps">
        <Step n={1} state={accountState} title="Create a free account, or add your own API key"
          action={ready ? { label: editing ? 'Done' : 'Change', onClick: () => setEditing(!editing) } : undefined}>
          {ready && !editing
            ? <p className="welcome-summary">{summary}</p>
            : ready !== null && (
              <div className="welcome-card">
                <AccountPanel initialView="signup" links={false} />
              </div>
            )}
        </Step>

        <Step n={2} state={resumeState} title="Add your resume" headingRef={resumeHeading}>
          {ready ? <ResumePage hideHeader /> : ready === false && <p className="hint">Finish step 1 first.</p>}
        </Step>

        <Step n={3} state={postingState} title="Open a job posting">
          <p className="hint">
            Pin Cover Me: click the puzzle icon in Chrome's toolbar, then the pin next to Cover Me.
            On any posting (LinkedIn, Indeed, Greenhouse, Lever, Workday and more), click Cover Me, then Generate.
          </p>
        </Step>
      </ol>
    </main>
  )
}

function Step({ n, state, title, action, headingRef, children }: {
  n: number
  state: StepState
  title: string
  action?: { label: string; onClick: () => void }
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
          {action && <button className="auth-link" onClick={action.onClick}>{action.label}</button>}
        </div>
        {children}
      </div>
    </li>
  )
}
