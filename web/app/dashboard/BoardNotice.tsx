'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { XIcon } from '@phosphor-icons/react'

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
    <div className="flex items-center gap-3 rounded-[16px] bg-brand-tint py-2.5 pl-4 pr-2 text-[13.5px] text-brand-ink">
      <p className="min-w-0 flex-1">
        <span className="font-semibold">New:</span>{' '}
        <Link href="/dashboard/applications" className="underline underline-offset-4 hover:text-brand-strong">track your applications on a board</Link>
      </p>
      <button type="button" onClick={close} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <XIcon size={14} aria-hidden />
      </button>
    </div>
  )
}
