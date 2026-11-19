'use client'

import { useState } from 'react'
import { CheckIcon, CopyIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'

export function CopyPromptButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'blocked'>('idle')
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('blocked')
    }
    setTimeout(() => setState('idle'), 2500)
  }
  return (
    <Button variant="outline" size="sm" onClick={copy} aria-live="polite">
      {state === 'copied' ? <CheckIcon size={14} aria-hidden /> : <CopyIcon size={14} aria-hidden />}
      {state === 'copied' ? 'Copied' : state === 'blocked' ? "Couldn't copy, select it" : 'Copy prompt'}
    </Button>
  )
}
