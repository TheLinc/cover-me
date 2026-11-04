'use client'

import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { STAGE_LABEL, STAGES, type Stage } from '@/lib/applications'

// Where an application stands, and the menu that moves it. The card and the
// details drawer both show one. The card's toast announces a change.
export function StageMenu({ stage, onChange, busy, saving, align = 'end' }: {
  stage: Stage
  onChange: (stage: Stage) => void
  busy: boolean // something else on this application is in progress
  saving: boolean // this menu's own change is
  align?: 'start' | 'end'
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full border-line bg-surface px-3 text-[13px] font-medium text-ink" disabled={busy}>
          {saving && <Spinner className="size-3.5" />}
          <span className="sr-only">Stage: </span>{STAGE_LABEL[stage]}
          <CaretDownIcon size={12} className="text-ink-2" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel className="text-[12.5px] font-medium text-ink-2">Stage</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={stage} onValueChange={(value) => { if (value !== stage) onChange(value as Stage) }}>
          {STAGES.map((s) => <DropdownMenuRadioItem key={s} value={s}>{STAGE_LABEL[s]}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
