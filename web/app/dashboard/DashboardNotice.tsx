'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { closeNotice, NOTICES, openNotice, type Notice } from '@/lib/notices'

export function DashboardNotice() {
  const [notice, setNotice] = useState<Notice | null>(null)
  // Where storage is refused a notice couldn't stay closed, so none shows (#176).
  useEffect(() => {
    try { setNotice(openNotice(NOTICES, new Date(), localStorage)) } catch {}
  }, [])
  if (!notice) return null

  const close = () => {
    setNotice(null)
    try { closeNotice(notice.id, localStorage) } catch {}
  }

  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-brand-tint py-2.5 pl-4 pr-2 text-[13.5px] text-brand-ink">
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{notice.label}:</span>{' '}
        <Link href={notice.href} className="font-medium text-brand-strong underline-offset-4 hover:underline">{notice.text}</Link>
      </p>
      <Button variant="ghost" size="icon" onClick={close} aria-label="Close" className="h-8 w-8 shrink-0 rounded-full text-brand-ink">
        <XIcon size={14} aria-hidden />
      </Button>
    </div>
  )
}
