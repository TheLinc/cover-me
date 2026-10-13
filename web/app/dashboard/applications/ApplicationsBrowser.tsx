'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Toggle } from '@/components/ui/toggle'
import { Spinner } from '@/components/ui/spinner'
import { dayRange, type ApplicationSummary, type ApplicationsPage, type ApplicationsQuery } from '@/lib/applications'
import { createLatestSearch } from '@/lib/latest-search'
import { ApplicationCard } from './ApplicationCard'
import { DateField } from './DateField'

type Status = 'loading' | 'ready' | 'error'

async function load(query: ApplicationsQuery, signal: AbortSignal): Promise<ApplicationsPage> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, String(value))
  const res = await fetch(`/api/applications?${params}`, { signal })
  // Signed out, or no longer Pro: a retry can't fix either. The promise never
  // settles, so the page doesn't flash an error on its way out.
  const leaveTo = res.status === 401 ? '/auth' : res.status === 403 ? '/dashboard' : null
  if (leaveTo) { window.location.assign(leaveTo); return new Promise(() => {}) }
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

export function ApplicationsBrowser() {
  const [text, setText] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applications, setApplications] = useState<ApplicationSummary[]>([])
  const [interviewOnly, setInterviewOnly] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState<Status>('loading')
  const [loadingMore, setLoadingMore] = useState(false)

  // The query the list on screen came from: Load more pages that one, not
  // whatever is in the inputs now.
  const shown = useRef<ApplicationsQuery>({})
  // What Try again repeats: a failed Load more retries that page, not page 1.
  const failed = useRef<ApplicationsQuery | null>(null)
  const search = useMemo(() => createLatestSearch<ApplicationsQuery, ApplicationsPage>(load, (query, result) => {
    setLoadingMore(false)
    if (!result.ok) {
      failed.current = query
      // The rows on screen are for an older search; only a failed Load more
      // keeps them, since they still match.
      if (!query.before) { setApplications([]); setHasMore(false) }
      setStatus('error')
      return
    }
    const { before, ...rest } = query
    shown.current = rest
    setApplications((prev) => (before ? [...prev, ...result.value.applications] : result.value.applications))
    setHasMore(result.value.hasMore)
    setStatus('ready')
  }), [])
  useEffect(() => () => search.cancel(), [search])

  const range = dayRange(from, to)
  const query: ApplicationsQuery | null = range ? { q: text.trim(), ...range, ...(interviewOnly ? { interview: '1' as const } : {}) } : null
  const filtered = Boolean(text.trim() || from || to || interviewOnly)

  // The first load runs at once; after that, changes wait for a short pause
  // (typing sends one search per pause, not per keystroke).
  const loaded = useRef(false)
  useEffect(() => {
    // A new search cuts off any Load more in flight.
    setLoadingMore(false)
    if (!query) { search.cancel(); return }
    setStatus('loading')
    if (loaded.current) search.schedule(query)
    else { loaded.current = true; search.now(query) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, from, to, interviewOnly])

  function retry() {
    const q = failed.current ?? query
    if (!q) return
    setStatus('loading')
    setLoadingMore(Boolean(q.before))
    search.now(q)
  }

  function loadMore() {
    if (applications.length === 0) return
    setStatus('loading')
    setLoadingMore(true)
    search.now({ ...shown.current, before: applications[applications.length - 1].createdAt })
  }

  const statusText = !range
    ? 'The From date is after the To date.'
    : status === 'error'
      ? "Couldn't load your applications."
      : status === 'loading'
        ? 'Loading applications'
        : applications.length === 0
          ? (filtered ? 'No applications match' : 'No applications yet')
          : hasMore
            ? `${applications.length} shown`
            : filtered
              ? `${applications.length} ${applications.length === 1 ? 'matches' : 'match'}`
              : `${applications.length} application${applications.length === 1 ? '' : 's'}`
  const counted = range && status === 'ready' && applications.length > 0

  // A deleted card, or one unmarked under the interview filter, leaves the list.
  // If that empties a page with more behind it, the first page loads again.
  function drop(id: string) {
    const rest = applications.filter((a) => a.id !== id)
    setApplications(rest)
    if (rest.length === 0 && hasMore) {
      setStatus('loading')
      search.now(shown.current)
    }
  }

  function clearFilters() {
    setText('')
    setFrom('')
    setTo('')
    setInterviewOnly(false)
  }

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
          <Toggle
            pressed={interviewOnly}
            onPressedChange={setInterviewOnly}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-full border-line bg-surface px-3.5 text-[13px] font-normal text-ink-2 hover:bg-surface hover:text-ink data-[state=on]:border-brand-strong/40 data-[state=on]:bg-brand-tint data-[state=on]:font-medium data-[state=on]:text-brand-ink"
          >
            {interviewOnly && <CheckIcon size={13} weight="bold" aria-hidden />}
            Got an interview
          </Toggle>
          {filtered && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 rounded-full px-3 text-[13px] text-ink-2" onClick={clearFilters}>
              <XIcon size={12} aria-hidden />Clear
            </Button>
          )}
        </div>
        {/* What the list below shows: visible as a count, otherwise announced only. */}
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
        ) : status === 'loading' && applications.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Loading applications">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-4 rounded-[20px] border border-line/80 bg-surface p-5">
                <div className="flex gap-3">
                  <Skeleton className="size-10 rounded-[12px] bg-panel" />
                  <div className="flex flex-1 flex-col gap-2 pt-1">
                    <Skeleton className="h-3.5 w-2/3 bg-panel" />
                    <Skeleton className="h-3 w-1/2 bg-panel" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-28 rounded-full bg-panel" />
                  <Skeleton className="h-8 w-24 rounded-full bg-panel" />
                </div>
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          filtered ? (
            <div className="flex flex-col items-start gap-2 rounded-[20px] border border-dashed border-line px-6 py-8">
              <p className="text-[15px] font-semibold text-ink">No applications match</p>
              <p className="text-[13.5px] text-ink-2">Try another company or title, or widen the dates.</p>
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

      {range && applications.length > 0 && (
        <div className={status === 'loading' && !loadingMore ? 'grid grid-cols-1 gap-4 opacity-60 transition-opacity md:grid-cols-2' : 'grid grid-cols-1 gap-4 transition-opacity md:grid-cols-2'}>
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onDeleted={drop}
              onInterviewChange={(id, interviewAt) => { if (shown.current.interview && !interviewAt) drop(id) }}
            />
          ))}
        </div>
      )}

      {range && hasMore && status !== 'error' && (
        <Button variant="outline" size="sm" className="self-center rounded-full px-5" onClick={loadMore} disabled={status === 'loading'}>
          {loadingMore ? <><Spinner className="size-3.5" />Loading</> : 'Load more'}
        </Button>
      )}
    </div>
  )
}
