'use client'

import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { STAGE_LABEL, STAGES, type Stage } from '@/lib/applications'

// Each stage's pill and dot, so a card's stage reads at a glance and doesn't
// look like the document chips beside it. Closed is sunken, with a hollow dot.
const STYLE: Record<Stage, { pill: string; dot: string }> = {
  applied: { pill: 'border-line bg-surface text-ink', dot: 'bg-subtle' },
  interviewing: { pill: 'border-transparent bg-brand-tint text-brand-ink hover:border-[color-mix(in_srgb,var(--brand-ink)_35%,transparent)]', dot: 'bg-brand' },
  offer: { pill: 'border-transparent bg-offer-tint text-offer-ink hover:border-[color-mix(in_srgb,var(--offer-ink)_35%,transparent)]', dot: 'bg-offer' },
  closed: { pill: 'border-transparent bg-panel text-ink-2 hover:border-line', dot: 'border border-subtle' },
}

// Where an application stands, and the menu that moves it. The card and the
// details drawer both show one. The card's toast announces a change.
export function StageMenu({ title, stage, onChange, busy, saving, align = 'end' }: {
  title: string // the job, so each card's button has its own name
  stage: Stage
  onChange: (stage: Stage) => void
  busy: boolean // something else on this application is in progress
  saving: boolean // this menu's own change is
  align?: 'start' | 'end'
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          // leading-5: text-[13px] drops the button's own line height, and an
          // inherited one put the label up to 1px off center.
          className={`h-8 gap-1 rounded-full px-2.5 text-[13px] leading-5 font-medium ${STYLE[stage].pill}`}
          // Not disabled during its own save: the closing menu puts focus back on
          // the trigger, and a disabled one can't take it. A pick then is ignored.
          disabled={busy && !saving}
        >
          {/* The spinner turns over the dot's spot, so the pill doesn't change width while saving. */}
          <span className="relative size-2">
            {saving
              // Offsets, not translate: animate-spin sets transform and would undo a translate.
              ? <Spinner className="absolute -left-0.5 -top-0.5 size-3" />
              : <span aria-hidden className={`block size-2 rounded-full ${STYLE[stage].dot}`} />}
          </span>
          <span className="cap-center"><span className="sr-only">Stage for {title}: </span>{STAGE_LABEL[stage]}</span>
          {/* Phosphor draws the caret 8/256 below its box's middle. */}
          <CaretDownIcon size={12} className="-translate-y-[3.125%] opacity-70" aria-hidden />
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
