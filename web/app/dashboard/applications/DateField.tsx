'use client'

import { useState } from 'react'
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fromDay, toDay } from '@/lib/applications'

// shadcn's Date Picker as a filter chip: a Popover holding a Calendar. value
// is the local YYYY-MM-DD the filters use, or '' for any date.
export function DateField({ id, label, value, onChange, invalid, describedBy }: {
  id: string
  label: string
  value: string
  onChange: (day: string) => void
  invalid?: boolean
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const date = fromDay(value)
  const shown = date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Any date'
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          size="sm"
          className={cn('h-9 gap-1.5 rounded-full border-line bg-surface px-3.5 text-[13px] font-normal', date && 'border-brand-strong/40 bg-brand-tint hover:border-brand-strong')}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-label={`${label}: ${shown}`}
        >
          <CalendarBlankIcon size={14} className={date ? 'text-brand-ink' : 'text-subtle'} aria-hidden />
          <span className={date ? 'text-brand-ink' : 'text-subtle'}>{label}</span>
          <span className={cn('font-medium', date ? 'text-brand-ink' : 'text-ink')}>{shown}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} defaultMonth={date} onSelect={(d: Date | undefined) => { onChange(toDay(d)); setOpen(false) }} autoFocus />
        {value && (
          <div className="border-t border-border p-2">
            <Button variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false) }}>Clear</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
