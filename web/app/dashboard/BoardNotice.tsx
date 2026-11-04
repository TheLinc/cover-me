'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

// Set when the line is closed or the applications page opens (ApplicationsBrowser).
export const BOARD_SEEN_KEY = 'cover-me:board-notice-seen'

// One line on the dashboard until it's closed or the board has been opened.
// Hidden until read from this device, and where storage is refused (it
// couldn't stay closed there).
export function BoardNotice() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try { setShow(!localStorage.getItem(BOARD_SEEN_KEY)) } catch { /* not shown */ }
  }, [])
  if (!show) return null

  function close() {
    setShow(false)
    try { localStorage.setItem(BOARD_SEEN_KEY, '1') } catch { /* gone for this visit */ }
  }

  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-brand-tint py-2.5 pl-4 pr-2 text-[13.5px] text-brand-ink">
      <p className="min-w-0 flex-1">
        <span className="font-semibold">New:</span>{' '}
        <Link href="/dashboard/applications" className="font-medium text-brand-strong underline-offset-4 hover:underline">track your applications on a board</Link>
      </p>
      <Button variant="ghost" size="icon" onClick={close} aria-label="Close" className="h-8 w-8 shrink-0 rounded-full text-brand-ink">
        <XIcon size={14} aria-hidden />
      </Button>
    </div>
  )
}
