import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLatestSearch } from './latest-search'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('createLatestSearch', () => {
  it('sends one request for a burst of typing, after the delay', async () => {
    const fetcher = vi.fn(async (q: string) => q)
    const onResult = vi.fn()
    const s = createLatestSearch(fetcher, onResult, 300)
    s.schedule('a'); s.schedule('ac'); s.schedule('acm')
    await vi.advanceTimersByTimeAsync(299)
    expect(fetcher).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toBe('acm')
    expect(onResult).toHaveBeenCalledWith('acm', { ok: true, value: 'acm' })
  })

  it('drops a stale response that arrives after a newer one, and aborts it', async () => {
    const calls: Array<{ q: string; signal: AbortSignal; d: ReturnType<typeof deferred<string>> }> = []
    const fetcher = (q: string, signal: AbortSignal) => { const d = deferred<string>(); calls.push({ q, signal, d }); return d.promise }
    const onResult = vi.fn()
    const s = createLatestSearch(fetcher, onResult, 300)
    s.now('old')
    s.now('')            // cleared the box
    expect(calls[0].signal.aborted).toBe(true)
    calls[1].d.resolve('all')
    calls[0].d.resolve('stale')
    await vi.runAllTimersAsync()
    expect(onResult.mock.calls).toEqual([['', { ok: true, value: 'all' }]])
  })

  it('a new search cancels a pending load-more', async () => {
    const calls: Array<{ q: { before?: string }; d: ReturnType<typeof deferred<string>> }> = []
    const fetcher = (q: { before?: string }) => { const d = deferred<string>(); calls.push({ q, d }); return d.promise }
    const onResult = vi.fn()
    const s = createLatestSearch(fetcher, onResult, 300)
    s.now({ before: 't1' })
    s.schedule({})
    await vi.advanceTimersByTimeAsync(300)
    calls[0].d.resolve('old page')
    calls[1].d.resolve('new results')
    await vi.runAllTimersAsync()
    expect(onResult.mock.calls).toEqual([[{}, { ok: true, value: 'new results' }]])
  })

  it('reports a failure of the latest request, not of an aborted one', async () => {
    const calls: Array<ReturnType<typeof deferred<string>>> = []
    const fetcher = () => { const d = deferred<string>(); calls.push(d); return d.promise }
    const onResult = vi.fn()
    const s = createLatestSearch(fetcher, onResult, 300)
    s.now('a')
    s.now('b')
    calls[0].reject(new DOMException('aborted', 'AbortError'))
    calls[1].reject(new Error('502'))
    await vi.runAllTimersAsync()
    expect(onResult.mock.calls).toEqual([['b', { ok: false }]])
  })

  it('cancel stops a scheduled search and aborts the current one', async () => {
    const fetcher = vi.fn((_q: string, signal: AbortSignal) => new Promise<string>(() => { void signal }))
    const s = createLatestSearch(fetcher, vi.fn(), 300)
    s.now('a')
    s.schedule('b')
    s.cancel()
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect((fetcher.mock.calls[0][1] as AbortSignal).aborted).toBe(true)
  })
})
