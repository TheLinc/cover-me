import { useEffect, useState, type ReactNode } from 'react'
import { ensureValidSession, fetchFirstMonthOffer, startBilling, type FirstMonthOffer, type Plan } from '../../lib/auth'
import { getCachedTier } from '../../lib/storage'
import { GiftIcon } from './icons'

// The open first-month offer (#213). Fetching it counts as showing it, which
// starts its 7 days on the server, so only use this where the line appears.
export function useFirstMonthOffer(enabled = true): FirstMonthOffer | null {
  const [offer, setOffer] = useState<FirstMonthOffer | null>(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    ensureValidSession()
      .then((session) => session && fetchFirstMonthOffer(session.access_token))
      .then((found) => { if (live && found) setOffer(found) }, () => {})
    return () => { live = false }
  }, [enabled])
  return offer
}

// Opens Stripe checkout for the plan in a new tab (payments live on the
// website, not in the extension). Throws a message to show on failure.
export async function openCheckout(plan: Plan): Promise<void> {
  const session = await ensureValidSession()
  if (!session) throw new Error('Sign in again in Settings to upgrade.')
  chrome.tabs.create({ url: await startBilling(session.access_token, 'checkout', plan) })
}

// The coupon's name comes from Stripe, so the repo holds no amount.
export function OfferLine({ offer, children }: { offer: FirstMonthOffer; children?: ReactNode }) {
  return (
    <p className="upgrade-offer">
      <span className="offer-tag"><GiftIcon />Offer</span>
      <strong>{offer.name ?? 'Your first month is discounted'}</strong> on the monthly plan, taken off at checkout.
      Ends {new Date(offer.endsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
      {children}
    </p>
  )
}

// On the Generate page, so a free account learns about the offer while it's
// using the extension, not only when it's out of generations or in Settings.
export function GenerateOffer({ hosted }: { hosted: boolean }) {
  const [free, setFree] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { getCachedTier().then((tier) => setFree(tier === 'hosted_free')) }, [])
  const offer = useFirstMonthOffer(hosted && free)
  if (!offer) return null
  return (
    <div className="generate-offer">
      <OfferLine offer={offer}>
        {' '}<button className="auth-link offer-action" onClick={() => {
          setError('')
          openCheckout('monthly').catch((err) => setError(err instanceof Error ? err.message : 'Could not start checkout.'))
        }}>Upgrade →</button>
      </OfferLine>
      {error && <div className="error-box" role="alert">{error}</div>}
    </div>
  )
}
