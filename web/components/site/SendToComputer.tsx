'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { DeviceMobileIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { capture } from '@/lib/analytics'
import { phoneSendUrl, sentFrom } from '@/lib/phone-send'
import { storeUrl } from '@/lib/utils'

// A Chrome extension can't be installed from a phone, so phones get this in place of the store link (#332).
export function SendToComputer({ placement, className, children }: { placement: string; className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => send(placement)}>
      {children}
    </button>
  )
}

function send(placement: string) {
  capture('phone_send', { placement })
  const url = phoneSendUrl(window.location.origin + window.location.pathname, placement)
  const mail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent('Install Cover Me on my computer')}&body=${encodeURIComponent(url)}`
  }
  if (!navigator.share) return mail()
  navigator.share({ title: 'Cover Me', text: 'Install Cover Me on my computer', url }).catch((err: Error) => {
    if (err.name !== 'AbortError') mail()
  })
}

export function PhoneReturnBanner() {
  const [campaign, setCampaign] = useState<string | null>(null)
  useEffect(() => {
    setCampaign(window.matchMedia('(pointer: coarse)').matches ? null : sentFrom(window.location.search))
  }, [])
  if (!campaign) return null

  return (
    <div className="container pt-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-white px-4 py-3 text-[14px] text-body">
        <DeviceMobileIcon size={18} aria-hidden className="text-brand" />
        <span className="flex-1">
          {campaign === 'ats-phone-send'
            ? 'Sent from your phone? Install Cover Me, then paste the posting again or open it on LinkedIn or Indeed.'
            : 'Sent from your phone? Install Cover Me, then open a job posting and click its icon.'}
        </span>
        <Button asChild size="sm">
          <a href={storeUrl(campaign)} target="_blank" rel="noreferrer">Install Cover Me free</a>
        </Button>
      </div>
    </div>
  )
}
