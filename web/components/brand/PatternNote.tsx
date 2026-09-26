import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// The printed annotation on a sewing pattern: "PIECE 2 OF 3", "CUT ON KEYWORD".
export function PatternNote({
  children,
  className,
  as: Tag = 'span',
}: {
  children: ReactNode
  className?: string
  as?: 'span' | 'p'
}) {
  return (
    <Tag className={cn('font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2', className)}>
      {children}
    </Tag>
  )
}
