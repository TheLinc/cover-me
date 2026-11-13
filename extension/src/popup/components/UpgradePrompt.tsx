import { useState } from 'react'
import type { Plan } from '../../lib/auth'
import { OfferLine, openCheckout, useFirstMonthOffer } from './FirstMonthOffer'

// The two Pro plans. Prices match the dashboard's upgrade buttons. An open
// first-month offer (#213) shows below them, so its late arrival doesn't move
// the buttons under the pointer.
export default function UpgradePrompt() {
  const [error, setError] = useState('')
  const offer = useFirstMonthOffer()

  async function handleUpgrade(plan: Plan) {
    setError('')
    try {
      await openCheckout(plan)
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
      <p className="hint">Pro: up to 25 generations a day</p>
      {offer && <OfferLine offer={offer} />}
      {error && <div className="error-box" role="alert">{error}</div>}
    </div>
  )
}
