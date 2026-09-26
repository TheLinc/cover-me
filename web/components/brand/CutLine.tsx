import { ScissorsIcon } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

// Dashed "cut here" rule. Replaces plain hairline section dividers.
export function CutLine({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex items-center gap-3 text-line', className)}>
      <ScissorsIcon size={18} className="shrink-0" />
      <span className="flex-1 border-t-[1.5px] border-dashed border-line" />
    </div>
  )
}
