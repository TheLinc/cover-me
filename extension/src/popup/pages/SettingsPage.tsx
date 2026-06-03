import { useEffect, useState } from 'react'
import { encryptApiKey } from '../../lib/crypto'
import { getSettings, saveSettings } from '../../lib/storage'
import type { AIProvider } from '../../types'

type Status = 'idle' | 'saving' | 'saved' | 'error'

const MASKED = '••••••••••••••••'

export default function SettingsPage() {
  const [provider, setProvider] = useState<AIProvider>('claude')
  const [apiKey, setApiKey] = useState('')
  const [keyDirty, setKeyDirty] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    getSettings().then((s) => {
      if (s) {
        setProvider(s.provider)
        setApiKey(MASKED)
      }
    })
  }, [])

  async function save() {
    setStatus('saving')
    setError('')
    try {
      const existing = await getSettings()

      // If the key field wasn't touched, keep the existing encrypted key
      const encryptedKey = keyDirty
        ? await encryptApiKey(apiKey.trim())
        : (existing?.apiKey ?? '')

      if (!encryptedKey) {
        setError('Please enter your API key.')
        setStatus('error')
        return
      }

      await saveSettings({ provider, apiKey: encryptedKey })
      if (keyDirty) {
        setApiKey(MASKED)
        setKeyDirty(false)
      }
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
      setStatus('error')
    }
  }

  const placeholder = provider === 'claude' ? 'sk-ant-api03-…' : 'sk-proj-…'

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your AI provider</p>
      </div>

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
            placeholder={placeholder}
            style={{ paddingRight: 34 }}
            onChange={(e) => { setApiKey(e.target.value); setKeyDirty(true) }}
            onFocus={() => { if (!keyDirty && apiKey === MASKED) { setApiKey(''); setKeyDirty(true) } }}
          />
          <button className="input-eye-btn" onClick={() => setShowKey((v) => !v)} title={showKey ? 'Hide' : 'Show'}>
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
        <p className="hint" style={{ marginTop: 7 }}>
          Encrypted locally — never sent to our servers.
        </p>
      </div>

      {status === 'error' && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" onClick={save} disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓  Saved' : 'Save Settings'}
      </button>
    </div>
  )
}
