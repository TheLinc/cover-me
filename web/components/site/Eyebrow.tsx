import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Small mono label above a section heading.
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-[12px] uppercase tracking-[0.1em] text-brand-strong', className)}>
      {children}
    </span>
  )
}
