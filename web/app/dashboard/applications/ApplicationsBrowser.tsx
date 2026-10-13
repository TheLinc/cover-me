'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { dayRange, type Application, type ApplicationsPage, type ApplicationsQuery } from '@/lib/applications'
import { createLatestSearch } from '@/lib/latest-search'
import { ApplicationList } from '../ApplicationList'

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
  const [applications, setApplications] = useState<Application[]>([])
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
    if (!result.ok) { failed.current = query; setStatus('error'); return }
    const { before, ...rest } = query
    shown.current = rest
    setApplications((prev) => (before ? [...prev, ...result.value.applications] : result.value.applications))
    setHasMore(result.value.hasMore)
    setStatus('ready')
  }), [])
  useEffect(() => () => search.cancel(), [search])

  const range = dayRange(from, to)
  const query: ApplicationsQuery | null = range ? { q: text.trim(), ...range } : null
  const filtered = Boolean(text.trim() || from || to)

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
  }, [text, from, to])

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
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
          <Label htmlFor="app-search">Company or job title</Label>
          <div className="relative">
            <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="app-search" type="search" value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder="Search" className="pl-9" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="app-from">From</Label>
          <Input id="app-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={!range} aria-describedby={range ? undefined : 'app-range-error'} className="w-[160px]" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="app-to">To</Label>
          <Input id="app-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={!range} aria-describedby={range ? undefined : 'app-range-error'} className="w-[160px]" />
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
        <div className={status === 'loading' && !loadingMore ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <ApplicationList applications={applications} />
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
