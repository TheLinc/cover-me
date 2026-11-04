'use client'

import { useState, type ReactNode } from 'react'
import { DndContext, DragOverlay, MouseSensor, useDraggable, useDroppable, useSensor, useSensors, type Announcements } from '@dnd-kit/core'
import { STAGE_LABEL, STAGES, type ApplicationSummary, type Stage, type StageState } from '@/lib/applications'
import { cn } from '@/lib/utils'
import { ApplicationCard } from './ApplicationCard'

// What puts a card in each column, for when it's empty.
const EMPTY: Record<Stage, string> = {
  applied: 'New applications from the extension start here.',
  interviewing: 'Move a card here when you get an interview.',
  offer: 'Move a card here when you get an offer.',
  closed: 'Rejected, withdrawn or no reply. Move a card here to close it.',
}

const name = (app: ApplicationSummary) => `${app.title || 'Untitled role'}${app.company ? ` at ${app.company}` : ''}`
const dragged = (data: unknown) => data as ApplicationSummary
const toStage = (id: unknown) => (STAGES.includes(id as Stage) ? (id as Stage) : null)

// Read out by dnd-kit's live region as a card is dragged.
const announcements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${name(dragged(active.data.current))}.`,
  onDragOver: ({ over }) => (toStage(over?.id) ? `Over ${STAGE_LABEL[toStage(over?.id)!]}.` : undefined),
  onDragEnd: ({ active, over }) => {
    const app = dragged(active.data.current)
    const to = toStage(over?.id)
    return to && to !== app.stage ? `Moved ${name(app)} to ${STAGE_LABEL[to]}.` : `${name(app)} stays in ${STAGE_LABEL[app.stage]}.`
  },
  onDragCancel: ({ active }) => `${name(dragged(active.data.current))} stays in ${STAGE_LABEL[dragged(active.data.current).stage]}.`,
}

// A column for each stage. Dragging a card to another column moves it there
// (onMove); within a column the cards keep the page's sort. Mouse only: on a
// keyboard or touch screen the card opens the drawer, which has the stage menu.
export function ApplicationsBoard({ applications, onMove, onDeleted, onStageChange, filtered }: {
  applications: ApplicationSummary[] // sorted
  onMove: (app: ApplicationSummary, stage: Stage) => void
  onDeleted: (id: string) => void
  onStageChange: (id: string, state: StageState) => void
  filtered: boolean // a search or dates are on, so an empty column may just mean no matches
}) {
  // A few pixels before a drag starts, so a click still opens the drawer.
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }))
  const [active, setActive] = useState<ApplicationSummary | null>(null)

  return (
    <DndContext
      sensors={sensors}
      accessibility={{ announcements }}
      onDragStart={({ active }) => setActive(dragged(active.data.current))}
      onDragCancel={() => setActive(null)}
      onDragEnd={({ active, over }) => {
        setActive(null)
        const to = toStage(over?.id)
        if (to) onMove(dragged(active.data.current), to)
      }}
    >
      {/* All four columns fit from about 1000px wide; narrower screens scroll them sideways. */}
      <div className="-mx-5 grid auto-cols-[minmax(232px,1fr)] grid-flow-col gap-3 overflow-x-auto px-5 pb-2">
        {STAGES.map((stage) => {
          const cards = applications.filter((a) => a.stage === stage)
          return (
            <Column key={stage} stage={stage} count={cards.length}>
              {cards.length === 0 ? (
                <p className="rounded-[14px] border border-dashed border-line px-3 py-4 text-[13px] leading-snug text-ink-2">
                  {filtered ? 'None match here.' : EMPTY[stage]}
                </p>
              ) : cards.map((app) => (
                <Draggable key={app.id} app={app}>
                  <ApplicationCard app={app} compact onDeleted={onDeleted} onStageChange={onStageChange} />
                </Draggable>
              ))}
            </Column>
          )
        })}
      </div>
      {/* No drop animation: the card is already in its new column. */}
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="cursor-grabbing rounded-[16px] border border-line bg-surface p-3.5 shadow-[0_2px_4px_rgba(30,27,75,0.08),0_22px_40px_-16px_rgba(30,27,75,0.4)]">
            <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{active.title || 'Untitled role'}</p>
            <p className="truncate text-[12.5px] text-ink-2">{active.company || 'Unknown company'}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ stage, count, children }: { stage: Stage; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`stage-${stage}`}
      className={cn('flex min-h-[220px] flex-col gap-2.5 rounded-[20px] bg-panel p-2.5 transition-shadow', isOver && 'ring-2 ring-brand')}
    >
      <h2 id={`stage-${stage}`} className="flex items-baseline justify-between px-1.5 pt-1 text-[13px] font-semibold text-ink">
        {STAGE_LABEL[stage]}
        <span className="text-[12.5px] font-normal tabular-nums text-subtle">{count}</span>
      </h2>
      {children}
    </section>
  )
}

function Draggable({ app, children }: { app: ApplicationSummary; children: ReactNode }) {
  // No dnd-kit attributes: they'd make the card a focusable button around the
  // drawer's own. Keyboard users move cards from the drawer.
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: app.id, data: app })
  return (
    <div
      ref={setNodeRef}
      // The drawer and delete dialog are portals inside this card, and React
      // bubbles their events here: only a press on the card itself drags.
      onMouseDown={(e) => { if (e.currentTarget.contains(e.target as Node)) listeners?.onMouseDown?.(e) }}
      className={cn('cursor-grab', isDragging && 'opacity-40')}
    >
      {children}
    </div>
  )
}
