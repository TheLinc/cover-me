import { useState } from 'react'
import { ensureValidSession, startBilling } from '../../lib/auth'

// Opens Stripe checkout in a new tab (payments live on the website, not in
// the extension).
export default function UpgradeButton({ label }: { label: string }) {
  const [error, setError] = useState('')

  async function handleUpgrade() {
    setError('')
    try {
      const session = await ensureValidSession()
      if (!session) {
        setError('Sign in again in Settings to upgrade.')
        return
      }
      chrome.tabs.create({ url: await startBilling(session.access_token, 'checkout') })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={handleUpgrade}>{label}</button>
      {error && <div className="error-box">{error}</div>}
    </>
  )
}
