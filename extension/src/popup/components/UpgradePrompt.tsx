import { useEffect, useState } from 'react'
import { ensureValidSession, fetchFirstMonthOffer, startBilling, type FirstMonthOffer, type Plan } from '../../lib/auth'
import { GiftIcon } from './icons'

// Opens Stripe checkout for the chosen plan in a new tab (payments live on the
// website, not in the extension). Prices match the dashboard's upgrade buttons.
// An open first-month offer (#213) shows below them, so its late arrival
// doesn't move the buttons under the pointer.
export default function UpgradePrompt() {
  const [error, setError] = useState('')
  const [offer, setOffer] = useState<FirstMonthOffer | null>(null)

  useEffect(() => {
    let live = true
    ensureValidSession()
      .then((session) => session && fetchFirstMonthOffer(session.access_token))
      .then((found) => { if (live && found) setOffer(found) }, () => {})
    return () => { live = false }
  }, [])

  async function handleUpgrade(plan: Plan) {
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
    <div className="upgrade-prompt">
      <div className="upgrade-actions">
        <button className="btn btn-primary" onClick={() => handleUpgrade('monthly')}>Upgrade, $15/mo</button>
        <button className="btn btn-secondary" onClick={() => handleUpgrade('quarterly')}>$35 every 3 months</button>
      </div>
      <p className="hint">Pro: up to 25 a day</p>
      {offer && (
        <p className="upgrade-offer">
          <span className="offer-tag"><GiftIcon />Offer</span>
          <strong>{offer.name ?? 'Your first month is discounted'}</strong> on the monthly plan, taken off at checkout.
          Ends {new Date(offer.endsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
        </p>
      )}
      {error && <div className="error-box" role="alert">{error}</div>}
    </div>
  )
}
