'use client'

import { useState } from 'react'
import { CopyIcon } from '@phosphor-icons/react/dist/ssr'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function CopyLetterButton({ letter, className }: { letter: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(letter)
    } catch {
      // Blocked clipboard (permission denied, page not focused).
      toast.error("Couldn't copy it. Select the text and copy it instead.")
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size="sm" className={className} onClick={copy}>
      <CopyIcon size={14} aria-hidden />
      {copied ? 'Copied' : 'Copy letter'}
    </Button>
  )
}
