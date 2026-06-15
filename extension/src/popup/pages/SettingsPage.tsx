import { useEffect, useState } from 'react'
import { ensureValidSession, fetchTier, signIn, signOut, signUp, uploadResumeToBackend } from '../../lib/auth'
import { decryptApiKey, encryptApiKey } from '../../lib/crypto'
import { clearSavedLogin, clearSession, getSavedLogin, getResume, getSettings, saveCachedTier, saveSession, saveSettings, setSavedLogin } from '../../lib/storage'
import type { AIProvider, AppMode, AuthSession } from '../../types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type AuthStatus = 'idle' | 'loading'
type AuthView = 'signin' | 'signup'

const MASKED = '••••••••••••••••'

export default function SettingsPage() {
  const [mode, setMode] = useState<AppMode>('byok')

  // BYOK
  const [provider, setProvider] = useState<AIProvider>('claude')
  const [apiKey, setApiKey] = useState('')
  const [keyDirty, setKeyDirty] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')

  // Hosted
  const [session, setSession] = useState<AuthSession | null>(null)
  const [tier, setTier] = useState<string>('hosted_free')
  const [authView, setAuthView] = useState<AuthView>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    Promise.all([getSettings(), ensureValidSession()]).then(async ([s, sess]) => {
      if (s) {
        setMode(s.mode ?? 'byok')
        setProvider(s.provider)
        if (s.apiKey) setApiKey(MASKED)
      }
      setSession(sess)
      if (sess) {
        const t = await fetchTier(sess.user.id, sess.access_token)
        setTier(t)
        await saveCachedTier(t)
      }
    })
  }, [])

  // Pre-fill remembered credentials whenever the sign-in form becomes visible
  // (initial mount with no session, or after sign-out)
  useEffect(() => {
    if (session !== null) return
    getSavedLogin().then(async (saved) => {
      if (!saved) return
      try {
        const decrypted = await decryptApiKey(saved.encryptedPassword)
        setEmail(saved.email)
        setPassword(decrypted)
        setRememberMe(true)
      } catch {
        clearSavedLogin()
      }
    })
  }, [session])

  async function handleSwitchMode(newMode: AppMode) {
    setMode(newMode)
    const existing = await getSettings()
    await saveSettings({
      provider: existing?.provider ?? 'claude',
      apiKey: existing?.apiKey ?? '',
      mode: newMode,
    })
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

  async function handleAuth() {
    setAuthStatus('loading')
    setAuthError('')
    try {
      const sess = authView === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password)
      await saveSession(sess)

      if (authView === 'signin') {
        if (rememberMe) {
          const encryptedPassword = await encryptApiKey(password)
          await setSavedLogin({ email, encryptedPassword })
        } else {
          await clearSavedLogin()
        }
      }

      setSession(sess)
      setEmail('')
      setPassword('')
      fetchTier(sess.user.id, sess.access_token).then(async (t) => {
        setTier(t)
        await saveCachedTier(t)
      })

      // Sync any existing local resume to the backend so the user doesn't have to re-upload
      const localResume = await getResume()
      if (localResume?.text) {
        uploadResumeToBackend(sess.access_token, localResume.text, localResume.filename).catch(() => {
          // Non-fatal — user can re-upload manually if sync fails
        })
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setAuthStatus('idle')
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
    setShowPassword(false)
    if (v === 'signup') {
      setEmail('')
      setPassword('')
      setRememberMe(false)
    }
  }

  const emailInitial = session?.user.email?.[0]?.toUpperCase() ?? '?'
  const isPro = tier === 'hosted_pro'

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Choose how to generate cover letters</p>
      </div>

      {/* ── Mode cards ──────────────────────────────────────────────────── */}
      <div className="mode-cards">
        <button
          className={`mode-card${mode === 'byok' ? ' active' : ''}`}
          onClick={() => handleSwitchMode('byok')}
        >
          <div className="mode-card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <div className="mode-card-title">My API Key</div>
          <div className="mode-card-desc">Claude or OpenAI — unlimited, private</div>
        </button>

        <button
          className={`mode-card${mode === 'hosted' ? ' active' : ''}`}
          onClick={() => handleSwitchMode('hosted')}
        >
          <div className="mode-card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="mode-card-title">Cover Me Account</div>
          <div className="mode-card-desc">
            {session && isPro ? 'Pro · Unlimited' : 'Free · 10 generations/day · no key needed'}
          </div>
        </button>
      </div>

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
                className="form-input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                placeholder={provider === 'claude' ? 'sk-ant-api03-…' : 'sk-proj-…'}
                style={{ paddingRight: 34 }}
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
            <p className="hint" style={{ marginTop: 7 }}>Encrypted locally — never sent to our servers.</p>
          </div>

          {saveStatus === 'error' && <div className="error-box">{saveError}</div>}

          <button className="btn btn-primary" onClick={saveBYOK} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓  Saved' : 'Save Settings'}
          </button>
        </>
      )}

      {/* ── Hosted ──────────────────────────────────────────────────────── */}

      {mode === 'hosted' && (
        <>
          {session ? (
            /* Signed-in state */
            <div className="account-card">
              <div className="account-row">
                <div className="account-avatar">{emailInitial}</div>
                <div className="account-info">
                  <div className="account-email">{session.user.email}</div>
                  <span className={isPro ? 'tier-badge tier-badge-pro' : 'tier-badge'}>
                    {isPro ? '★ Pro · Unlimited' : 'Free · 10 generations/day'}
                  </span>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            /* Auth form */
            <>
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
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={authView === 'signup' ? 'At least 6 characters' : '••••••••'}
                    value={password}
                    style={{ paddingRight: 34 }}
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

              {authView === 'signin' && (
                <div className="remember-row">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="remember-me">Remember me <span className="hint">(password saved encrypted on this device)</span></label>
                </div>
              )}

              {authError && <div className="error-box">{authError}</div>}

              <button
                className="btn btn-primary"
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
        </>
      )}
    </div>
  )
}
