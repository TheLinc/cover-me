import { CircleNotchIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// The span turns, not the svg: an HTML box always turns about its center,
// where some browsers turn an <svg> about another point. The icon is centered
// in it, since menus resize any svg inside them ([&_svg]:size-4).
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <span role="status" aria-label="Loading" className={cn('inline-flex size-4 shrink-0 animate-spin items-center justify-center', className)}>
      <CircleNotchIcon className="size-full" aria-hidden {...props} />
    </span>
  )
}

export { Spinner }
