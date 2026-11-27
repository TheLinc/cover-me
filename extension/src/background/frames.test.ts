import { afterEach, describe, expect, it, vi } from 'vitest'
import { previewTab, withServerRead } from './frames'
import type { FrameScrapeResponse, JobData } from '../types'

const TOP_JOB: JobData = { title: 'Platform Engineer', company: 'Fernbrook Analytics', description: 'Build the data platform.', url: 'https://www.linkedin.com/jobs/view/101' }
const FRAME_JOB: JobData = { title: 'Platform Engineer', company: 'Fernbrook Analytics', description: 'A longer copy of the posting from the embedded board.', url: 'https://boards.greenhouse.io/fernbrook/jobs/7' }

function stubTab(replies: Record<number, FrameScrapeResponse | Error>) {
  const frames = Object.keys(replies).map(Number)
  const sendMessage = vi.fn(async (_tabId: number, _message: unknown, { frameId }: { frameId: number }) => {
    const reply = replies[frameId]
    if (reply instanceof Error) throw reply
    return reply
  })
  vi.stubGlobal('chrome', {
    scripting: {
      executeScript: vi.fn(async ({ func }: { func?: () => string }) =>
        func ? frames.map((frameId) => ({ frameId, result: frameId === 0 ? TOP_JOB.url : FRAME_JOB.url })) : []),
    },
    tabs: { sendMessage, get: vi.fn(async () => ({ url: TOP_JOB.url })) },
  })
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  return { sendMessage, fetch }
}

afterEach(() => vi.unstubAllGlobals())

describe('previewTab', () => {
  it('reads every frame without a page copy and sends nothing to the server', async () => {
    const { sendMessage, fetch } = stubTab({
      0: { success: true, job: TOP_JOB, snapshot: null },
      4: { success: true, job: FRAME_JOB, snapshot: null },
    })

    expect(await previewTab(1)).toEqual(TOP_JOB)
    expect(sendMessage.mock.calls.map(([, message]) => message)).toEqual([
      { type: 'SCRAPE_JOB', snapshot: false },
      { type: 'SCRAPE_JOB', snapshot: false },
    ])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('takes an embedded board frame under the address the user sees', async () => {
    stubTab({
      0: { success: false, error: 'No posting here', snapshot: null },
      4: { success: true, job: FRAME_JOB, snapshot: null },
    })

    expect(await previewTab(1)).toEqual({ ...FRAME_JOB, url: TOP_JOB.url })
  })

  it('returns null when no frame finds a posting', async () => {
    const { fetch } = stubTab({ 0: new Error('Could not establish connection. Receiving end does not exist.') })

    expect(await previewTab(1)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('withServerRead', () => {
  it("takes the server's job and keeps the logo read on the device", () => {
    const local = { frameId: 0, ok: true as const, job: { ...TOP_JOB, logo: 'https://media.licdn.com/fernbrook.png' } }
    const server = { ok: true as const, job: { ...TOP_JOB, description: 'The full posting, read on the server.' } }

    expect(withServerRead(local, server)).toEqual({ frameId: 0, ok: true, job: { ...server.job, logo: 'https://media.licdn.com/fernbrook.png' } })
    expect(withServerRead(local, { ok: false, error: 'No posting' })).toBe(local)
  })
})
