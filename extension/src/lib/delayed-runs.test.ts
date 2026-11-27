import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { delayedRuns } from './delayed-runs'

describe('delayedRuns', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs nothing before the delay, then runs and reports success', async () => {
    const done = vi.fn()
    const run = vi.fn().mockResolvedValue(undefined)
    const runs = delayedRuns(5000, done)
    runs.schedule('a', run)
    await vi.advanceTimersByTimeAsync(4999)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(run).toHaveBeenCalledOnce()
    expect(done).toHaveBeenCalledWith('a')
  })

  it('never runs a cancelled (undone) run', async () => {
    const done = vi.fn()
    const run = vi.fn().mockResolvedValue(undefined)
    const runs = delayedRuns(5000, done)
    runs.schedule('a', run)
    runs.cancel('a')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(run).not.toHaveBeenCalled()
    expect(done).not.toHaveBeenCalled()
  })

  it('runs every waiting run at once on flush, and only once', async () => {
    const done = vi.fn()
    const a = vi.fn().mockResolvedValue(undefined)
    const b = vi.fn().mockResolvedValue(undefined)
    const runs = delayedRuns(5000, done)
    runs.schedule('a', a)
    runs.schedule('b', b)
    runs.flush()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(a).toHaveBeenCalledOnce()
    expect(b).toHaveBeenCalledOnce()
    expect(done).toHaveBeenCalledTimes(2)
  })

  it('reports a failed run with its message', async () => {
    const done = vi.fn()
    const runs = delayedRuns(5000, done)
    runs.schedule('a', () => Promise.reject(new Error('Failed to delete application')))
    await vi.advanceTimersByTimeAsync(5000)
    expect(done).toHaveBeenCalledWith('a', 'Failed to delete application')
  })
  it('runs one at a time, since each delete rewrites the whole stored list', async () => {
    let release!: () => void
    const a = vi.fn(() => new Promise<void>((r) => { release = r }))
    const b = vi.fn().mockResolvedValue(undefined)
    const runs = delayedRuns(5000, vi.fn())
    runs.schedule('a', a)
    runs.schedule('b', b)
    runs.flush()
    await vi.advanceTimersByTimeAsync(0)
    expect(a).toHaveBeenCalledOnce()
    expect(b).not.toHaveBeenCalled()
    release()
    await vi.advanceTimersByTimeAsync(0)
    expect(b).toHaveBeenCalledOnce()
  })
})
