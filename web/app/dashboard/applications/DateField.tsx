'use client'

import { useState } from 'react'
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fromDay, toDay } from '@/lib/applications'

// shadcn's Date Picker: a Popover holding a Calendar. value is the local
// YYYY-MM-DD the filters use, or '' for any date.
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
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} variant="outline" className="w-[170px] justify-start font-normal" aria-invalid={invalid || undefined} aria-describedby={describedBy}>
            <CalendarBlankIcon size={15} aria-hidden />
            {date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Any date'}
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
    </div>
  )
}
