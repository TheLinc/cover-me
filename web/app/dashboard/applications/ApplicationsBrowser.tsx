'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { dayRange, type ApplicationSummary, type ApplicationsPage, type ApplicationsQuery } from '@/lib/applications'
import { createLatestSearch } from '@/lib/latest-search'
import { Checkbox } from '@/components/ui/checkbox'
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

  // The first load runs at once; after that, typing and dates wait for a
  // pause (a date field emits each keystroke of its year as a value).
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

  return (
    <div className="flex flex-col gap-5">
      {/* Sticks under the site header (h-16) while the cards scroll. */}
      <div className="sticky top-16 z-10 -mx-7 -mt-6 flex flex-wrap items-end gap-3 border-b border-border bg-surface px-7 pb-4 pt-6">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <Label htmlFor="app-search">Company or job title</Label>
          <div className="relative">
            <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="app-search" type="search" value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder="Search" className="pl-9" />
          </div>
        </div>
        <DateField id="app-from" label="From" value={from} onChange={setFrom} invalid={!range} describedBy={range ? undefined : 'app-range-error'} />
        <DateField id="app-to" label="To" value={to} onChange={setTo} invalid={!range} describedBy={range ? undefined : 'app-range-error'} />
        <div className="flex h-10 items-center gap-2">
          <Checkbox id="app-interview" checked={interviewOnly} onCheckedChange={(v) => setInterviewOnly(v === true)} />
          <Label htmlFor="app-interview" className="cursor-pointer">Got an interview</Label>
        </div>
      </div>

      <div aria-live="polite">
        {!range ? (
          <p id="app-range-error" className="text-[13px] text-destructive">The From date is after the To date.</p>
        ) : status === 'error' ? (
          <p className="text-[13px] text-muted-foreground">
            Couldn&apos;t load your applications.{' '}
            <button type="button" className="text-brand-light underline" onClick={retry}>Try again</button>
          </p>
        ) : status === 'loading' && applications.length === 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground"><Spinner className="size-3.5" />Loading</p>
        ) : applications.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            {filtered ? 'No applications match.' : 'Letters and tailored resumes you make in the extension appear here, on every device.'}
          </p>
        ) : status === 'ready' ? (
          <p className="sr-only">{applications.length} application{applications.length === 1 ? '' : 's'} shown</p>
        ) : null}
      </div>

      {range && applications.length > 0 && (
        <div className={status === 'loading' && !loadingMore ? 'grid gap-4 opacity-60 transition-opacity md:grid-cols-2' : 'grid gap-4 transition-opacity md:grid-cols-2'}>
          {applications.map((app) => <ApplicationCard key={app.id} app={app} />)}
        </div>
      )}

      {range && hasMore && status !== 'error' && (
        <Button variant="outline" size="sm" className="self-center" onClick={loadMore} disabled={status === 'loading'}>
          {loadingMore ? <><Spinner className="size-3.5" />Loading</> : 'Load more'}
        </Button>
      )}
    </div>
  )
}
