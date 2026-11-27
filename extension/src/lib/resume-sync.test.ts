import { afterEach, describe, expect, test, vi } from 'vitest'
import { syncResume } from './auth'
import { sha256Hex } from './design'

const session = { access_token: 'at', refresh_token: 'rt', expires_at: 2_000_000_000, user: { id: 'u1', email: 'a@b.co' } }
const hash = (text: string) => sha256Hex(new TextEncoder().encode(text))

function setup(local: Record<string, unknown> | null, remote: Record<string, unknown> | null, { later = remote, postStatus = 200 } = {}) {
  const data: Record<string, unknown> = local ? { resume: local, designFiles: ['f'], 'designFile:f': { data: 'cGRm' } } : {}
  const pick = (k: string | string[]) => Object.fromEntries([k].flat().filter((x) => x in data).map((x) => [x, data[x]]))
  vi.stubGlobal('chrome', { storage: { local: {
    get: async (k: string | string[]) => pick(k),
    set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
    remove: async (k: string | string[]) => { for (const x of [k].flat()) delete data[x] },
  } } })
  const uploads: Array<Record<string, unknown>> = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      uploads.push(JSON.parse(init.body as string))
      return new Response(postStatus === 409 ? '{"error":"Resume changed"}' : '{}', { status: postStatus })
    }
    const answer = uploads.length ? later : remote
    return answer ? new Response(JSON.stringify(answer), { status: 200 }) : new Response('{}', { status: 404 })
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

  test("the same text takes the account's upload date when this copy has none", async () => {
    const { data } = setup(
      { text: 'same', filename: 'cv.pdf', updatedAt: '2026-10-05T00:00:00Z' },
      { text: 'same', filename: 'cv.pdf', updated_at: '2026-10-01T00:00:00Z', uploaded_at: '2026-09-30T00:00:00Z' },
    )
    await syncResume(session)
    expect(data.resume).toMatchObject({ uploadedAt: '2026-09-30T00:00:00Z' })
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

describe('syncResume finishes a re-read the account never got (#401)', () => {
  const reread = async () => ({
    text: 'read again', filename: 'cv.pdf', updatedAt: '2026-10-01T00:00:00Z', readerVersion: 2, accountId: 'u1',
    file: { id: 'f', size: 3, type: 'pdf' }, rereadFrom: await hash('old reader'),
  })
  const account = { text: 'old reader', filename: 'cv.pdf', updated_at: '2026-10-01T00:00:05Z' }

  test('it goes up as a re-read, and the stored file stays', async () => {
    const { data, uploads } = setup(await reread(), account)
    await syncResume(session)
    expect(uploads).toEqual([{ text: 'read again', filename: 'cv.pdf', readerVersion: 2, reread: true, baseTextHash: await hash('old reader') }])
    expect(data.resume).toMatchObject({ text: 'read again', file: { id: 'f' } })
    expect(data.resume).not.toHaveProperty('rereadFrom')
    expect(data['designFile:f']).toBeDefined()
  })

  test('one the account already has only records the version', async () => {
    const { data, uploads } = setup(await reread(), { ...account, text: 'read again' })
    await syncResume(session)
    expect(uploads).toMatchObject([{ text: 'read again', reread: true }])
    expect(data.resume).not.toHaveProperty('rereadFrom')
  })

  test("refused because the account changed meanwhile, the account's copy wins", async () => {
    const { data } = setup(await reread(), account, { later: { text: 'from another computer', filename: 'b.pdf', updated_at: '2026-10-02T00:00:00Z' }, postStatus: 409 })
    await syncResume(session)
    expect(data.resume).toMatchObject({ text: 'from another computer' })
  })

  test('the account having another resume wins as before', async () => {
    const { data, uploads } = setup(await reread(), { text: 'from another computer', filename: 'b.pdf', updated_at: '2026-10-02T00:00:00Z' })
    await syncResume(session)
    expect(uploads).toEqual([])
    expect(data.resume).toMatchObject({ text: 'from another computer' })
  })
})
