import { useEffect, useRef, useState } from 'react'
import { completeSignIn, EmailConfirmationRequiredError, ensureValidSession, fetchTier, signIn, signOut, signUp } from '../../lib/auth'
import type { GoogleSignInResponse } from '../../lib/auth'
import { GOOGLE_SIGNIN, WEB_URL } from '../../lib/config'
import { encryptApiKey } from '../../lib/crypto'
import { clearSession, getCachedTier, getMode, getSettings, resolveMode, saveCachedTier, saveSettings, takeGoogleSignInError, watchGoogleSignInError, watchSession } from '../../lib/storage'
import type { AIProvider, AppMode, AuthSession } from '../../types'
import GoogleIcon from './GoogleIcon'
import UpgradeButton from './UpgradeButton'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type AuthStatus = 'idle' | 'loading'
type AuthView = 'signin' | 'signup'

const MASKED = '••••••••••••••••'

// The account first, with BYOK behind "I have an API key". Used by Settings and
// by the welcome tab, which leaves out the upgrade and dashboard links so
// onboarding stays on the first letter.
export default function AccountPanel({ initialView = 'signin', links = true }: { initialView?: AuthView; links?: boolean }) {
  const [mode, setMode] = useState<AppMode>('hosted')

  // BYOK
  const [provider, setProvider] = useState<AIProvider>('claude')
  const [apiKey, setApiKey] = useState('')
  const [keyDirty, setKeyDirty] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')

  // Hosted
  const [session, setSession] = useState<AuthSession | null>(null)
  // null until known: no badge and no upgrade button rather than a wrong one.
  const [tier, setTier] = useState<string | null>(null)
  const [authView, setAuthView] = useState<AuthView>(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle') // email sign-in
  const [googleBusy, setGoogleBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [avatarFailed, setAvatarFailed] = useState(false) // offline, or Google's link expired
  // The load, the sign-in handlers and the session watcher can all report the
  // same session; fetch the tier once per session.
  const shownToken = useRef<string | null>(null)

  useEffect(() => {
    Promise.all([getSettings(), ensureValidSession()]).then(async ([s, sess]) => {
      setMode(resolveMode(s))
      if (s) {
        setProvider(s.provider)
        if (s.apiKey) setApiKey(MASKED)
      }
      if (sess) signedIn(sess)
    })
    // A Google sign-in started from the popup fails after the popup closed.
    takeGoogleSignInError().then((msg) => { if (msg && !shownToken.current) setAuthError(msg) })
    // The worker may finish a Google sign-in after this panel opened, and the
    // welcome tab should follow a sign-in or sign-out made in the popup. A
    // token refresh lands here too, so take the mode from storage rather than
    // assuming hosted (completeSignIn saves hosted mode before the session).
    const stopSession = watchSession((sess) => {
      if (sess) {
        getMode().then(setMode)
        signedIn(sess)
      } else {
        shownToken.current = null
        setSession(null)
        setTier(null) // the next account's badge must not show this one's tier
      }
    })
    // A flow that fails while this panel is open: show it now, not next open.
    const stopError = watchGoogleSignInError((msg) => {
      if (!shownToken.current) setAuthError(msg) // signed in: nothing to show it on
      void takeGoogleSignInError()
    })
    return () => { stopSession(); stopError() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function switchMode(next: AppMode) {
    setMode(next)
    const existing = await getSettings()
    await saveSettings({ provider: existing?.provider ?? 'claude', apiKey: existing?.apiKey ?? '', mode: next })
  }

  async function saveBYOK() {
    setSaveStatus('saving')
    setSaveError('')
    try {
      const existing = await getSettings()
      const encryptedKey = keyDirty
        ? await encryptApiKey(apiKey.trim())
        : (existing?.apiKey ?? '')

      if (!encryptedKey) {
        setSaveError('Please enter your API key.')
        setSaveStatus('error')
        return
      }

      await saveSettings({ provider, apiKey: encryptedKey, mode: 'byok' })
      if (keyDirty) { setApiKey(MASKED); setKeyDirty(false) }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
      setSaveStatus('error')
    }
  }

  function signedIn(sess: AuthSession) {
    setSession(sess)
    setAuthError('') // an old failure would reappear on the form after sign-out
    if (shownToken.current === sess.access_token) return
    shownToken.current = sess.access_token
    // The last known tier at once, so a Pro account doesn't flash "Upgrade"
    // while the lookup runs; the lookup's answer wins when it lands.
    let looked = false
    // A lookup that lands after a sign-out or a switch of account belongs to
    // the old session: it must not set or cache this one's tier.
    const current = () => shownToken.current === sess.access_token
    getCachedTier().then((cached) => { if (cached && !looked && current()) setTier(cached) })
    fetchTier(sess.user.id, sess.access_token).then(async (t) => {
      looked = true
      if (!current()) return
      if (t) {
        setTier(t)
        await saveCachedTier(t)
      } else {
        // Lookup failed (offline, say): show the last known tier, retry next time.
        shownToken.current = null
        const cached = await getCachedTier()
        if (cached) setTier(cached)
      }
    })
  }

  async function handleAuth() {
    setAuthStatus('loading')
    setAuthError('')
    setAuthNotice('')
    try {
      const sess = authView === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password)
      await completeSignIn(sess)
      setEmail('')
      setPassword('')
      signedIn(sess)
    } catch (err) {
      if (err instanceof EmailConfirmationRequiredError) {
        setAuthNotice(err.message)
        setEmail('')
        setPassword('')
      } else {
        setAuthError(err instanceof Error ? err.message : 'Authentication failed')
      }
    } finally {
      setAuthStatus('idle')
    }
  }

  // The worker runs the flow (see handleGoogleSignIn). In the popup this
  // usually never resolves, because the popup closes when Google's window opens.
  async function handleGoogle() {
    setGoogleBusy(true)
    setAuthError('')
    setAuthNotice('')
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GOOGLE_SIGN_IN' }) as GoogleSignInResponse
      if (res.success) signedIn(res.session)
      else if (!res.cancelled) {
        setAuthError(res.error || 'Google sign-in failed')
        await takeGoogleSignInError() // shown here; don't show it again next open
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setGoogleBusy(false)
    }
  }

  async function handleSignOut() {
    if (session) await signOut(session.access_token).catch(() => {})
    await clearSession()
    setSession(null)
  }

  function switchAuthView(v: AuthView) {
    setAuthView(v)
    setAuthError('')
    setAuthNotice('')
    setShowPassword(false)
    if (v === 'signup') {
      setEmail('')
      setPassword('')
    }
  }

  const emailInitial = session?.user.email?.[0]?.toUpperCase() ?? '?'
  const isPro = tier === 'hosted_pro'

  return (
    <>
      {/* Once signed in, the account card's badge states the plan. */}
      {!(mode === 'hosted' && session) && (
        <p className="hint hint-intro">
          {mode === 'hosted'
            ? 'Free: 10 generations to start, then 5 a week. No API key needed.'
            : 'Claude or OpenAI, unlimited. Your key stays on this device.'}
        </p>
      )}

      {/* ── BYOK ────────────────────────────────────────────────────────── */}

      {mode === 'byok' && (
        <>
          <div className="form-group">
            <label className="form-label">AI Provider</label>
            <div className="provider-toggle">
              {(['claude', 'openai'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  className={`provider-option${provider === p ? ' active' : ''}`}
                  onClick={() => setProvider(p)}
                >
                  {p === 'claude' ? 'Claude' : 'OpenAI'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">API Key</label>
            <div className="input-wrap">
              <input
                className="form-input with-eye"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                placeholder={provider === 'claude' ? 'sk-ant-api03-…' : 'sk-proj-…'}
                onChange={(e) => { setApiKey(e.target.value); setKeyDirty(true) }}
                onFocus={() => {
                  if (!keyDirty && apiKey === MASKED) { setApiKey(''); setKeyDirty(true) }
                }}
              />
              <button className="input-eye-btn" onClick={() => setShowKey(v => !v)} title={showKey ? 'Hide' : 'Show'}>
                {showKey ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="hint hint-under">Encrypted locally — never sent to our servers.</p>
          </div>

          {saveStatus === 'error' && <div className="error-box">{saveError}</div>}

          <button className="btn btn-primary" onClick={saveBYOK} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓  Saved' : 'Save Settings'}
          </button>

          <p className="auth-switch">
            <button className="auth-link" onClick={() => switchMode('hosted')}>Use a free Cover Me account instead →</button>
          </p>
        </>
      )}

      {/* ── Hosted ──────────────────────────────────────────────────────── */}

      {mode === 'hosted' && (
        <>
          {session ? (
            /* Signed-in state */
            <div className="account-card">
              <div className="account-row">
                <div className="account-avatar">
                  {session.user.avatar_url && !avatarFailed ? (
                    <img src={session.user.avatar_url} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} />
                  ) : emailInitial}
                </div>
                <div className="account-info">
                  <div className="account-email">{session.user.email}</div>
                  {tier && (
                    <span className={isPro ? 'tier-badge tier-badge-pro' : 'tier-badge'}>
                      {isPro ? '★ Pro · up to 25 a day' : 'Free · 10 to start, then 5 a week'}
                    </span>
                  )}
                </div>
              </div>
              {links && (
                <>
                  {tier === 'hosted_free' && <UpgradeButton label="Upgrade to Pro: up to 25 a day" />}
                  {/* Plan, usage and (for Pro) billing and every saved application. */}
                  <a className="text-link" href={`${WEB_URL}/dashboard`} target="_blank" rel="noreferrer">Open your dashboard</a>
                </>
              )}
              <button className="btn btn-secondary account-signout" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            /* Auth form */
            <>
              {GOOGLE_SIGNIN && (
                <>
                  <button className="btn btn-google" onClick={handleGoogle} disabled={googleBusy || authStatus === 'loading'}>
                    <GoogleIcon />
                    Continue with Google
                  </button>
                  <div className="auth-divider"><span>or use email</span></div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrap">
                  <input
                    className="form-input with-eye"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={authView === 'signup' ? 'At least 6 characters' : '••••••••'}
                    value={password}
                    autoComplete={authView === 'signin' ? 'current-password' : 'new-password'}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && email && password) handleAuth() }}
                  />
                  <button className="input-eye-btn" onClick={() => setShowPassword(v => !v)} title={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {authError && <div className="error-box">{authError}</div>}
              {authNotice && <div className="notice-box">{authNotice}</div>}

              <button
                className={GOOGLE_SIGNIN ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={handleAuth}
                disabled={authStatus === 'loading' || !email || !password}
              >
                {authStatus === 'loading'
                  ? (authView === 'signin' ? 'Signing in…' : 'Creating account…')
                  : (authView === 'signin' ? 'Sign In' : 'Create Free Account')}
              </button>

              <p className="auth-switch">
                {authView === 'signin' ? (
                  <>No account?{' '}
                    <button className="auth-link" onClick={() => switchAuthView('signup')}>
                      Create one free →
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button className="auth-link" onClick={() => switchAuthView('signin')}>
                      Sign in →
                    </button>
                  </>
                )}
              </p>
            </>
          )}

          <p className="auth-switch">
            <button className="auth-link" onClick={() => switchMode('byok')}>I have an API key →</button>
          </p>
        </>
      )}
    </>
  )
}
