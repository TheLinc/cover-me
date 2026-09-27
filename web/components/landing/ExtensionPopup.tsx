import type { ReactNode } from 'react'
import Image from 'next/image'
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
