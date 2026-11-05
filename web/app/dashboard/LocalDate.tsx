'use client'

import { useEffect, useState } from 'react'
import { daysLeftLabel } from '@/lib/stripe-tier'

// The server renders in UTC and the browser then switches to the reader's own
// time zone: identical text at hydration, the right day after it.
export function LocalDate({ iso, options }: { iso: string; options: Intl.DateTimeFormatOptions }) {
  const [text, setText] = useState(() => new Date(iso).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' }))
  useEffect(() => {
    setText(new Date(iso).toLocaleDateString('en-US', options))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso])
  return <>{text}</>
}

// " · 5 days left" for a trial ending at iso. The count depends on the
// reader's day, which the server can't know, so it appears once the browser renders.
export function DaysLeft({ iso }: { iso: string }) {
  const [text, setText] = useState('')
  useEffect(() => setText(` · ${daysLeftLabel(iso)}`), [iso])
  return <>{text}</>
}
