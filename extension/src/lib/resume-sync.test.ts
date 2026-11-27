import { afterEach, describe, expect, test, vi } from 'vitest'
import { syncResume } from './auth'

const session = { access_token: 'at', refresh_token: 'rt', expires_at: 2_000_000_000, user: { id: 'u1', email: 'a@b.co' } }

function setup(local: Record<string, unknown> | null, remote: Record<string, unknown> | null) {
  const data: Record<string, unknown> = local ? { resume: local } : {}
  const pick = (k: string | string[]) => Object.fromEntries([k].flat().filter((x) => x in data).map((x) => [x, data[x]]))
  vi.stubGlobal('chrome', { storage: { local: {
    get: async (k: string | string[]) => pick(k),
    set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
    remove: async (k: string | string[]) => { for (const x of [k].flat()) delete data[x] },
  } } })
  const uploads: unknown[] = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { uploads.push(JSON.parse(init.body as string)); return new Response('{}', { status: 200 }) }
    return remote ? new Response(JSON.stringify(remote), { status: 200 }) : new Response('{}', { status: 404 })
  }))
  return { data, uploads }
}

afterEach(() => vi.unstubAllGlobals())

describe('syncResume carries the reader version (#401)', () => {
  test('the same text keeps the higher readerVersion and uploads nothing', async () => {
    const { data, uploads } = setup(
      { text: 'same', filename: 'cv.pdf', updatedAt: '2026-10-05T00:00:00Z', readerVersion: 1 },
      { text: 'same', filename: 'cv.pdf', updated_at: '2026-10-01T00:00:00Z', reader_version: 2 },
    )
    await syncResume(session)
    expect(uploads).toEqual([])
    expect(data.resume).toMatchObject({ readerVersion: 2 })
  })

  test('a pulled-down resume carries reader_version and uploaded_at, and no stored file', async () => {
    const { data } = setup(
      { text: 'old local', filename: 'old.pdf', updatedAt: '2026-09-01T00:00:00Z', readerVersion: 1, file: { id: 'f', size: 3, type: 'pdf' } },
      { text: 'newer', filename: 'new.pdf', updated_at: '2026-10-01T00:00:00Z', reader_version: 2, uploaded_at: '2026-09-30T00:00:00Z' },
    )
    await syncResume(session)
    expect(data.resume).toEqual({ text: 'newer', filename: 'new.pdf', updatedAt: '2026-10-01T00:00:00Z', readerVersion: 2, uploadedAt: '2026-09-30T00:00:00Z', accountId: 'u1' })
  })

  test('a local resume that wins goes up with its readerVersion and uploadedAt', async () => {
    const { uploads } = setup(
      { text: 'newer local', filename: 'new.pdf', updatedAt: '2026-10-05T00:00:00Z', readerVersion: 2, uploadedAt: '2026-10-04T00:00:00Z' },
      { text: 'old account copy', filename: 'old.pdf', updated_at: '2026-10-01T00:00:00Z' },
    )
    await syncResume(session)
    expect(uploads).toEqual([{ text: 'newer local', filename: 'new.pdf', readerVersion: 2, uploadedAt: '2026-10-04T00:00:00Z' }])
  })
})
