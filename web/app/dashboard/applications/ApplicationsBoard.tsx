'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
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
export function ApplicationsBoard({ applications, onMove, onDeleted, onStageChange }: {
  applications: ApplicationSummary[] // sorted
  onMove: (app: ApplicationSummary, stage: Stage) => void
  onDeleted: (id: string) => void
  onStageChange: (id: string, state: StageState) => void
}) {
  // A few pixels before a drag starts, so a click still opens the drawer.
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }))
  const [active, setActive] = useState<ApplicationSummary | null>(null)

  // A stage changed from the drawer reaches the board as it closes, and the
  // card remounts in its new column: focus follows it there instead of
  // dropping to the page.
  const refocus = useRef<string | null>(null)
  useEffect(() => {
    if (!refocus.current) return
    document.querySelector<HTMLElement>(`[data-card="${refocus.current}"]`)?.focus()
    refocus.current = null
  })
  function stageChanged(id: string, state: StageState) {
    refocus.current = id
    onStageChange(id, state)
  }

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
      {/* All four columns fit from about 1000px wide; narrower screens scroll
          them sideways. The scroller clips, so its padding leaves room for the
          outlines and the tile shadows. */}
      <div className="-mx-5 -mb-8 -mt-2 grid auto-cols-[minmax(224px,1fr)] grid-flow-col gap-5 overflow-x-auto px-5 pb-8 pt-2">
        {STAGES.map((stage) => {
          const cards = applications.filter((a) => a.stage === stage)
          return (
            <Column key={stage} stage={stage} count={cards.length} dragging={active !== null}>
              {cards.length === 0 ? (
                <p className="rounded-[20px] border border-dashed border-line px-4 py-5 text-[13px] leading-snug text-ink-2">{EMPTY[stage]}</p>
              ) : cards.map((app) => (
                <Draggable key={app.id} app={app}>
                  <ApplicationCard app={app} compact onDeleted={onDeleted} onStageChange={stageChanged} />
                </Draggable>
              ))}
            </Column>
          )
        })}
      </div>
      {/* No drop animation: the card is already in its new column. */}
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="cursor-grabbing rounded-[20px] border border-line/80 bg-surface p-4 shadow-[0_1px_2px_rgba(30,27,75,0.06),0_16px_36px_-16px_rgba(30,27,75,0.32)]">
            <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{active.title || 'Untitled role'}</p>
            <p className="truncate text-[12.5px] text-ink-2">{active.company || 'Unknown company'}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// Tiles sit on paper (DESIGN.md's Floating Tile Rule). While a card is
// dragged, each column shows a dashed outline as a place it can go, and the
// one under the pointer turns Cover Me Indigo.
function Column({ stage, count, dragging, children }: { stage: Stage; count: number; dragging: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`stage-${stage}`}
      className={cn(
        '-m-2 flex min-h-[220px] flex-col gap-3 rounded-[20px] border border-dashed border-transparent p-2 transition-colors',
        dragging && 'border-line',
        isOver && 'border-brand-strong',
      )}
    >
      <h2 id={`stage-${stage}`} className="flex items-baseline justify-between px-1 text-[13px] font-semibold text-ink">
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
      className={cn(isDragging && 'opacity-40')}
    >
      {children}
    </div>
  )
}
