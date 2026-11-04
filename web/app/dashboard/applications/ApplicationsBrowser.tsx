'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsDownUpIcon, CaretDownIcon, CheckIcon, KanbanIcon, ListBulletsIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react/dist/ssr'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { dayRange, PAGE_LIMIT, SORT_LABEL, SORTS, sortApplications, STAGE_LABEL, STAGES, type ApplicationSummary, type ApplicationsPage, type ApplicationsQuery, type Sort, type Stage, type StageState } from '@/lib/applications'
import { GONE, GONE_MESSAGE, setStage } from '@/lib/application-actions'
import { createLatestSearch } from '@/lib/latest-search'
import { ApplicationCard } from './ApplicationCard'
import { ApplicationsBoard } from './ApplicationsBoard'
import { TileSkeletons } from './TileSkeletons'
import { DateField } from './DateField'

type Status = 'loading' | 'ready' | 'error'
type View = 'board' | 'list'

// The view and sort are remembered on this device; search and filters aren't.
const VIEW_KEY = 'cover-me:applications-view'
const SORT_KEY = 'cover-me:applications-sort'
// Private windows can refuse storage: the page then just doesn't remember.
const stored = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const store = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* not remembered */ } }

const CHIP = 'h-9 gap-1.5 rounded-full border-line bg-surface px-3.5 text-[13px] font-normal text-ink-2 hover:bg-surface hover:text-ink data-[state=on]:border-[color-mix(in_srgb,var(--brand-strong)_40%,transparent)] data-[state=on]:bg-brand-tint data-[state=on]:font-medium data-[state=on]:text-brand-ink'

const VIEW_ITEM = 'h-8 gap-1.5 rounded-full px-3 text-[13px] font-normal text-ink-2 hover:bg-transparent hover:text-ink data-[state=on]:bg-brand-tint data-[state=on]:font-medium data-[state=on]:text-brand-ink'

async function load(query: ApplicationsQuery, signal: AbortSignal): Promise<ApplicationsPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, String(value))
  const res = await fetch(`/api/applications?${params}`, { signal })
  // Signed out, or no longer Pro: a retry can't fix either. The promise never
  // settles, so the page doesn't flash an error on its way out.
  const leaveTo = res.status === 401 ? '/auth?next=/dashboard/applications' : res.status === 403 ? '/dashboard' : null
  if (leaveTo) { window.location.assign(leaveTo); return new Promise(() => {}) }
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

// Every application matching the search and dates loads at once (up to
// PAGE_LIMIT), so the page sorts them and filters by stage itself.
export function ApplicationsBrowser() {
  const [text, setText] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applications, setApplications] = useState<ApplicationSummary[]>([])
  // Stage filters for the list; any number can be on. None on is every stage.
  // The board's columns are the stages, so it shows them all.
  const [stages, setStages] = useState<Stage[]>([])
  // More match than loaded: the page shows the newest PAGE_LIMIT.
  const [capped, setCapped] = useState(false)
  const [status, setStatus] = useState<Status>('loading')
  // null until read from this device after mount, so the server render and
  // the first client render agree.
  const [view, setView] = useState<View | null>(null)
  const [chosenSort, setChosenSort] = useState<Sort | null>(null)

  useEffect(() => {
    const v = stored(VIEW_KEY)
    setView(v === 'board' || v === 'list' ? v : window.matchMedia('(min-width: 768px)').matches ? 'board' : 'list')
    const s = stored(SORT_KEY)
    if (SORTS.includes(s as Sort)) setChosenSort(s as Sort)
  }, [])
  const sort: Sort = chosenSort ?? (view === 'board' ? 'moved' : 'newest')
  function chooseView(v: View) { setView(v); store(VIEW_KEY, v) }
  function chooseSort(s: Sort) { setChosenSort(s); store(SORT_KEY, s) }

  // Deleted here: a search that was already in flight mustn't bring them back.
  const deleted = useRef(new Set<string>())
  // Stages saved here win over a search that started before the save.
  const staged = useRef(new Map<string, StageState>())
  const search = useMemo(() => createLatestSearch<ApplicationsQuery, ApplicationsPage>(load, (_query, result) => {
    if (!result.ok) {
      setApplications([])
      setCapped(false)
      setStatus('error')
      return
    }
    setApplications(result.value.applications
      .filter((a) => !deleted.current.has(a.id))
      .map((a) => ({ ...a, ...staged.current.get(a.id) })))
    setCapped(result.value.hasMore)
    setStatus('ready')
  }), [])
  useEffect(() => () => search.cancel(), [search])

  const range = dayRange(from, to)
  const query: ApplicationsQuery | null = range ? { q: text.trim(), ...range } : null
  const searched = Boolean(text.trim() || from || to)
  const stageFiltered = view === 'list' && stages.length > 0
  const filtered = searched || stageFiltered

  // The first load runs at once; after that, changes wait for a short pause
  // (typing sends one search per pause, not per keystroke).
  const loaded = useRef(false)
  useEffect(() => {
    if (!query) { search.cancel(); return }
    setStatus('loading')
    if (loaded.current) search.schedule(query)
    else { loaded.current = true; search.now(query) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, from, to])

  function retry() {
    if (!query) return
    setStatus('loading')
    search.now(query)
  }

  const sorted = useMemo(() => sortApplications(applications, sort), [applications, sort])
  const listed = stageFiltered ? sorted.filter((a) => stages.includes(a.stage)) : sorted

  function patch(id: string, state: StageState) {
    setApplications((list) => list.map((a) => (a.id === id ? { ...a, ...state } : a)))
  }

  // A stage changed from a card's menu or drawer, already saved.
  function stageSaved(id: string, state: StageState) {
    staged.current.set(id, state)
    patch(id, state)
  }

  // A card leaves the page: deleted here or found deleted elsewhere.
  function removed(id: string) {
    deleted.current.add(id)
    setApplications((list) => list.filter((a) => a.id !== id))
  }

  // A card dropped in another column moves at once, then saves. If the save
  // fails it goes back. Only the latest move of a card applies its answer.
  const moves = useRef(new Map<string, number>())
  async function move(app: ApplicationSummary, stage: Stage) {
    if (app.stage === stage) return
    const n = (moves.current.get(app.id) ?? 0) + 1
    moves.current.set(app.id, n)
    const was: StageState = { stage: app.stage, stageChangedAt: app.stageChangedAt }
    // Kept as staged at once, so a search landing mid-save doesn't pull it back.
    stageSaved(app.id, { stage, stageChangedAt: new Date().toISOString() })
    try {
      const saved = await setStage(app.id, stage)
      if (moves.current.get(app.id) === n) stageSaved(app.id, saved)
    } catch (e) {
      if (e instanceof Error && e.message === GONE) {
        removed(app.id)
        toast.success(GONE_MESSAGE)
        return
      }
      if (moves.current.get(app.id) !== n) return
      stageSaved(app.id, was)
      toast.error(`Couldn't move it to ${STAGE_LABEL[stage]}, so it's back in ${STAGE_LABEL[was.stage]}. Try again.`)
    }
  }

  const shownCount = view === 'list' ? listed.length : applications.length
  // The server caps after searching: with a search on, it's the newest matches.
  const pool = searched ? `the newest ${PAGE_LIMIT} matches` : `your newest ${PAGE_LIMIT}`
  const statusText = !range
    ? 'The From date is after the To date.'
    : status === 'error'
      ? "Couldn't load your applications."
      : status === 'loading'
        ? 'Loading applications'
        : shownCount === 0
          ? (filtered ? 'No applications match' : 'No applications yet')
          : capped
            ? (stageFiltered ? `${shownCount} ${shownCount === 1 ? 'matches' : 'match'}, from ${pool}` : `Showing ${pool}`)
            : filtered
              ? `${shownCount} ${shownCount === 1 ? 'matches' : 'match'}`
              : `${shownCount} application${shownCount === 1 ? '' : 's'}`
  // Stays visible while a search loads (its text says so), so the bar keeps its height.
  const counted = range && status !== 'error' && shownCount > 0

  function clearFilters() {
    setText('')
    setFrom('')
    setTo('')
    // The board hides the stage filters, so its Clear leaves them for the list.
    if (view === 'list') setStages([])
  }

  const dimmed = status === 'loading'

  return (
    <div className="flex flex-col gap-6">
      {/* Find first: the search leads and the filters are chips under it. It
          sticks under the site header (h-16) from md up; on phones it would
          fill the screen. */}
      <div className="z-10 -mx-5 flex flex-col gap-3 bg-background px-5 pb-3 pt-2 md:sticky md:top-16">
        <div className="relative">
          <MagnifyingGlassIcon size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            id="app-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100}
            placeholder="Search company or job title"
            aria-label="Search applications by company or job title"
            className="h-14 rounded-full border-line bg-surface pl-14 pr-5 text-[16px] text-ink shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-18px_rgba(30,27,75,0.25)] placeholder:text-subtle focus-visible:ring-brand"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateField id="app-from" label="From" value={from} onChange={setFrom} invalid={!range} describedBy={range ? undefined : 'app-range-error'} />
          <DateField id="app-to" label="To" value={to} onChange={setTo} invalid={!range} describedBy={range ? undefined : 'app-range-error'} />
          {view === 'list' && (
            <div role="group" aria-label="Filter by stage" className="flex flex-wrap items-center gap-2">
              {STAGES.map((stage) => {
                const on = stages.includes(stage)
                return (
                  <Toggle
                    key={stage}
                    pressed={on}
                    onPressedChange={(pressed) => setStages((list) => STAGES.filter((s) => (s === stage ? pressed : list.includes(s))))}
                    variant="outline"
                    size="sm"
                    className={CHIP}
                  >
                    {on && <CheckIcon size={13} weight="bold" aria-hidden />}
                    {STAGE_LABEL[stage]}
                  </Toggle>
                )
              })}
            </div>
          )}
          {filtered && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 rounded-full px-3 text-[13px] text-ink-2" onClick={clearFilters}>
              <XIcon size={12} aria-hidden />Clear
            </Button>
          )}
          {view && (
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full border-line bg-surface px-3.5 text-[13px] font-normal text-ink-2 hover:text-ink">
                    <ArrowsDownUpIcon size={14} aria-hidden />
                    <span className="sr-only">Sort: </span>{SORT_LABEL[sort]}
                    <CaretDownIcon size={12} aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-[12.5px] font-medium text-ink-2">Sort</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={sort} onValueChange={(value) => chooseSort(value as Sort)}>
                    {SORTS.map((s) => <DropdownMenuRadioItem key={s} value={s}>{SORT_LABEL[s]}</DropdownMenuRadioItem>)}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <ToggleGroup
                type="single"
                aria-label="View"
                value={view}
                // Clicking the pressed one would leave neither on: ignored.
                onValueChange={(value) => { if (value) chooseView(value as View) }}
                size="sm"
                className="gap-1 rounded-full border border-line bg-surface p-0.5"
              >
                <ToggleGroupItem value="board" className={VIEW_ITEM}><KanbanIcon size={15} aria-hidden />Board</ToggleGroupItem>
                <ToggleGroupItem value="list" className={VIEW_ITEM}><ListBulletsIcon size={15} aria-hidden />List</ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
        </div>
        {/* What the page below shows: visible as a count, otherwise announced only. */}
        <p aria-live="polite" className={counted ? 'px-1 text-[13px] tabular-nums text-subtle' : 'sr-only'}>{statusText}</p>
      </div>

      <div className="empty:hidden">
        {!range ? (
          <p id="app-range-error" className="text-[13px] text-destructive">The From date is after the To date.</p>
        ) : status === 'error' ? (
          <p className="text-[13.5px] text-ink-2">
            Couldn&apos;t load your applications.{' '}
            <Button variant="link" size="sm" className="h-auto p-0 text-[13.5px]" onClick={retry}>Try again</Button>
          </p>
        ) : !view || (status === 'loading' && shownCount === 0) ? (
          <TileSkeletons count={4} label="Loading applications" />
        ) : shownCount === 0 ? (
          filtered ? (
            <div className="flex flex-col items-start gap-2 rounded-[20px] border border-dashed border-line px-6 py-8">
              <p className="text-[15px] font-semibold text-ink">No applications match</p>
              <p className="text-[13.5px] text-ink-2">Try another company or title, or widen the dates{view === 'list' ? ' or stages' : ''}.</p>
              <Button variant="outline" size="sm" className="mt-2 rounded-full" onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-[20px] border border-dashed border-line px-6 py-8">
              <p className="text-[15px] font-semibold text-ink">No applications yet</p>
              <p className="max-w-[46ch] text-[13.5px] text-ink-2">Letters and tailored resumes you make in the extension appear here, on every device.</p>
            </div>
          )
        ) : null}
      </div>

      {range && view && status !== 'error' && shownCount > 0 && (
        // The old results, dimmed and out of reach until the new ones replace them.
        <div inert={dimmed} className={dimmed ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {view === 'board' ? (
            <ApplicationsBoard applications={sorted} onMove={move} onDeleted={removed} onStageChange={stageSaved} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {listed.map((app) => (
                <ApplicationCard key={app.id} app={app} onDeleted={removed} onStageChange={stageSaved} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
