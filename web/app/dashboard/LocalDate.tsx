'use client'

import { useEffect, useState } from 'react'

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
