'use client'

import { useState } from 'react'
import { CopyIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'

export function CopyLetterButton({ letter }: { letter: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      <CopyIcon size={14} aria-hidden />
      {copied ? 'Copied' : 'Copy letter'}
    </Button>
  )
}
