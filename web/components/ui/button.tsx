import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:     'bg-brand-strong text-white hover:bg-brand-deep shadow-[0_10px_30px_-12px_rgba(79,70,229,0.6)]',
        secondary:   'bg-panel text-ink hover:bg-line',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        outline:     'border border-line bg-white text-ink hover:border-ink-2',
        ghost:       'text-ink hover:bg-panel',
        link:        'text-brand-strong underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm:      'h-9 px-4 text-[13px]',
        lg:      'h-12 px-6 text-[15px]',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
