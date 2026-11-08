import { useState } from 'react'
import { ensureValidSession, startBilling } from '../../lib/auth'

// Opens Stripe checkout for the chosen plan in a new tab (payments live on the
// website, not in the extension). Prices match the dashboard's upgrade buttons.
export default function UpgradeButton() {
  const [error, setError] = useState('')

  async function handleUpgrade(plan: 'monthly' | 'quarterly') {
    setError('')
    try {
      const session = await ensureValidSession()
      if (!session) {
        setError('Sign in again in Settings to upgrade.')
        return
      }
      chrome.tabs.create({ url: await startBilling(session.access_token, 'checkout', plan) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
    }
  }

  return (
    <div className="upgrade">
      <div className="upgrade-actions">
        <button className="btn btn-primary" onClick={() => handleUpgrade('monthly')}>Upgrade, $15/mo</button>
        <button className="btn btn-secondary" onClick={() => handleUpgrade('quarterly')}>$35 every 3 months</button>
      </div>
      <p className="hint">Pro: up to 25 a day</p>
      {error && <div className="error-box" role="alert">{error}</div>}
    </div>
  )
}
