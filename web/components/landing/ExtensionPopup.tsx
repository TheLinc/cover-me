import type { ReactNode } from 'react'
import Image from 'next/image'
import { CheckIcon } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

// The real extension popup's frame, in the extension's own dark palette
// (--ext-* tokens), so product visuals on the site match what users install.
export function ExtensionPopup({
  status,
  children,
  footer,
  className,
}: {
  status?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[18px] border border-ext-border bg-ext-bg text-ext-text shadow-[0_30px_70px_-20px_rgba(15,14,40,0.55)]',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-ext-elevated px-3.5 py-3 text-[13px] font-semibold">
        <Image src="/logo.png" width={18} height={18} alt="" className="rounded-[5px]" />
        Cover Me
        {status && <span className="ml-auto text-[11px] font-medium text-ext-soft">{status}</span>}
      </div>
      {children}
      {footer && <div className="flex gap-2 border-t border-ext-elevated px-3.5 py-3">{footer}</div>}
    </div>
  )
}

export type StepState = 'done' | 'active' | 'todo'

// One line of the popup's tailoring progress list. tone="light" draws the same
// row on the site's paper palette (the /auth waiting view).
export function ProgressStep({
  state,
  children,
  tone = 'dark',
}: {
  state: StepState
  children: ReactNode
  tone?: 'dark' | 'light'
}) {
  const light = tone === 'light'
  return (
    <li
      className={cn(
        'flex items-center gap-2.5',
        light ? 'text-[13px]' : 'text-[12px]',
        state === 'done' && (light ? 'text-ink-2' : 'text-ext-soft'),
        state === 'active' && (light ? 'font-medium text-ink' : 'font-medium text-ext-text'),
        state === 'todo' && (light ? 'text-subtle' : 'text-ext-muted'),
      )}
    >
      {state === 'done' && (
        <span
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-[5px]',
            light ? 'bg-brand-tint text-brand-ink' : 'bg-[rgba(99,102,241,0.28)] text-ext-soft',
          )}
        >
          <CheckIcon size={10} weight="bold" />
        </span>
      )}
      {state === 'active' && (
        <svg className="size-4 shrink-0 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="6" stroke={light ? 'var(--line)' : 'var(--ext-border)'} strokeWidth="2" />
          <path d="M8 2a6 6 0 0 1 6 6" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {state === 'todo' && (
        <span
          className={cn(
            'size-4 shrink-0 rounded-[5px] border border-dashed',
            light ? 'border-current opacity-50' : 'border-ext-border',
          )}
        />
      )}
      <span>
        <span className="sr-only">{state === 'done' ? 'Done: ' : state === 'active' ? 'In progress: ' : 'Next: '}</span>
        {children}
      </span>
    </li>
  )
}

export function PopupButton({ children, primary }: { children: ReactNode; primary?: boolean }) {
  return (
    <span
      className={cn(
        'flex-1 rounded-[10px] px-2 py-2.5 text-center text-[12px] font-semibold',
        primary ? 'bg-brand text-white' : 'bg-ext-elevated text-ext-text',
      )}
    >
      {children}
    </span>
  )
}
