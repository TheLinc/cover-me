'use client'

import { useState } from 'react'

export function CopyLetterButton({ letter }: { letter: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button type="button" onClick={copy} className="mt-2 text-[12.5px] text-brand-light cursor-pointer bg-transparent border-none p-0 hover:underline">
      {copied ? 'Copied' : 'Copy letter'}
    </button>
  )
}
