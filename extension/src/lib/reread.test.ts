import { afterEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex, toBase64 } from './design'
import { needsUploadNote, refreshResume } from './reread'
import { fileId } from './resume-file'
import { READER_VERSION } from './resume-parser'
import type { ResumeData } from '../types'

const BYTES = new Uint8Array([37, 80, 68, 70])
const OLD_ID = 'a'.repeat(64)
const session = { access_token: 't', refresh_token: 'r', expires_at: 4_000_000_000, user: { id: 'me', email: 'pat@example.com' } }
const parse = { name: 'Pat', email: '', phone: '', website: '', experience: [], education: [] }

let local: Record<string, unknown> = {}
const sent: unknown[] = []
function fakeChrome(data: Record<string, unknown>) {
  local = data
  const pick = (k: string | string[]) => Object.fromEntries([k].flat().filter((x) => x in data).map((x) => [x, data[x]]))
  vi.stubGlobal('chrome', {
    storage: { local: {
      get: async (k: string | string[]) => pick(k),
      set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
      remove: async (k: string | string[]) => { for (const x of [k].flat()) delete data[x] },
    } },
    runtime: { sendMessage: async (m: unknown) => { sent.push(m) } },
  })
}

function fakeAccount(remotes: Array<Record<string, unknown> | null>, ...postStatuses: number[]) {
  const posts: Array<Record<string, unknown>> = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posts.push(JSON.parse(init.body as string))
      const postStatus = (postStatuses.length > 1 ? postStatuses.shift() : postStatuses[0]) ?? 200
      return new Response(postStatus === 409 ? '{"error":"Resume changed"}' : '{"success":true}', { status: postStatus })
    }
    const remote = remotes.length > 1 ? remotes.shift()! : remotes[0]
    return remote ? new Response(JSON.stringify(remote), { status: 200 }) : new Response('{}', { status: 404 })
  }))
  return posts
}

const pdf = (extra: Partial<ResumeData> = {}): ResumeData => ({
  text: 'Pat old text', filename: 'Pat.pdf', updatedAt: '2026-11-01T00:00:00.000Z', readerVersion: 1, parsed: parse,
  file: { id: OLD_ID, size: BYTES.length, type: 'pdf' }, ...extra,
})

function store(resume: ResumeData, extra: Record<string, unknown> = {}, id = resume.file?.id ?? resume.design?.hash ?? OLD_ID) {
  fakeChrome({
    settings: { provider: 'claude', apiKey: 'x', mode: 'byok' },
    resume,
    [`designFile:${id}`]: { data: toBase64(BYTES) },
    designFiles: [id],
    ...extra,
  })
}

const hosted = { settings: { provider: 'claude', apiKey: '', mode: 'hosted' }, session }
const reads = (text: string) => vi.fn(async (_f: File) => text)

afterEach(() => {
  vi.unstubAllGlobals()
  sent.length = 0
})

describe('refreshResume (#401)', () => {
  test('nothing happens for a current readerVersion', async () => {
    store(pdf({ readerVersion: READER_VERSION }))
    const posts = fakeAccount([null])
    const read = reads('x')
    expect(await refreshResume({ read })).toBe('none')
    expect(read).not.toHaveBeenCalled()
    expect(posts).toEqual([])
  })

  test('same text only records the version', async () => {
    store(pdf())
    expect(await refreshResume({ read: reads('Pat old text') })).toBe('same')
    expect(local.resume).toEqual({ ...pdf(), readerVersion: READER_VERSION })
  })

  test('changed text saves it under a new file id and clears the parse', async () => {
    store(pdf())
    const read = reads('Pat new text')
    expect(await refreshResume({ read })).toBe('changed')
    expect((read.mock.calls[0]![0] as File).name).toBe('Pat.pdf')
    const id = await fileId(BYTES)
    const resume = local.resume as ResumeData
    expect(resume).toMatchObject({ text: 'Pat new text', readerVersion: READER_VERSION, file: { id, size: BYTES.length, type: 'pdf' } })
    expect(resume.parsed).toBeUndefined()
    expect(resume.updatedAt).toBe(pdf().updatedAt)
    expect(local[`designFile:${id}`]).toEqual({ data: toBase64(BYTES) })
    expect(local[`designFile:${OLD_ID}`]).toBeUndefined()
    expect(sent).toEqual([])
  })

  test('a Word file stored before this change is read again, and gets a file', async () => {
    const word = (): ResumeData => ({ text: 'Pat old text', filename: 'Pat.docx', updatedAt: '2026-11-01T00:00:00.000Z', design: { hash: 'h', size: 3, status: 'done' } })
    store(word())
    expect(await refreshResume({ read: reads('Pat old text') })).toBe('same')
    expect(local.resume).toMatchObject({ file: { id: 'h', size: 3, type: 'docx' }, readerVersion: READER_VERSION, design: { hash: 'h' } })

    store(word())
    expect(await refreshResume({ read: reads('Pat new text') })).toBe('changed')
    const id = await fileId(BYTES)
    expect(local.resume).toMatchObject({ text: 'Pat new text', file: { id, type: 'docx' }, readerVersion: READER_VERSION, design: { hash: id, status: 'checking' } })
    expect(sent).toEqual([{ type: 'CHECK_DESIGN', hash: id }])
  })

  test('a Word re-read leaves the old entry and its parse for History', async () => {
    const word: ResumeData = { text: 'Pat old text', filename: 'Pat.docx', updatedAt: '2026-11-01T00:00:00.000Z', readerVersion: 1, file: { id: OLD_ID, size: 4, type: 'docx' }, design: { hash: OLD_ID, size: 4, status: 'done' } }
    store(word, { tailoredHistory: [{ id: 't', job: {}, resume: { ...parse, sourceHash: OLD_ID }, createdAt: '2026-11-02T00:00:00Z' }] })
    local[`designFile:${OLD_ID}`] = { data: toBase64(BYTES), parsed: parse }
    expect(await refreshResume({ read: reads('Pat new text') })).toBe('changed')
    expect(local[`designFile:${OLD_ID}`]).toEqual({ data: toBase64(BYTES), parsed: parse })
    expect((local.resume as ResumeData).design!.hash).toBe(await fileId(BYTES))
  })

  test('a newer account resume wins and nothing is read', async () => {
    store(pdf({ accountId: 'me' }), hosted)
    const posts = fakeAccount([{ text: 'Account text', filename: 'Other.pdf', updated_at: '2026-11-20T00:00:00.000Z' }])
    const read = reads('Pat new text')
    expect(await refreshResume({ read })).toBe('none')
    expect(read).not.toHaveBeenCalled()
    expect(posts).toEqual([])
    expect(local.resume).toMatchObject({ text: 'Account text' })
    expect((local.resume as ResumeData).file).toBeUndefined()
  })

  test("a 409 keeps the old copy, then takes the account's", async () => {
    store(pdf({ accountId: 'me' }), hosted)
    fakeAccount([
      { text: 'Pat old text', filename: 'Pat.pdf', updated_at: '2026-10-01T00:00:00.000Z' },
      { text: 'Account text', filename: 'Other.pdf', updated_at: '2026-11-20T00:00:00.000Z' },
    ], 409)
    expect(await refreshResume({ read: reads('Pat new text') })).toBe('account')
    expect(local.resume).toMatchObject({ text: 'Account text' })
  })

  test('a hosted re-read sends the version and the old text hash, and never parse:true', async () => {
    store(pdf({ accountId: 'me' }), hosted)
    const posts = fakeAccount([{ text: 'Pat old text', filename: 'Pat.pdf', updated_at: '2026-10-01T00:00:00.000Z' }])
    expect(await refreshResume({ read: reads('Pat new text') })).toBe('changed')
    expect(posts).toEqual([{
      text: 'Pat new text', filename: 'Pat.pdf', readerVersion: READER_VERSION, reread: true,
      baseTextHash: await sha256Hex(new TextEncoder().encode('Pat old text')),
    }])
    expect((local.resume as ResumeData).rereadFrom).toBeUndefined()
  })

  test('a re-read the account never confirmed is sent again on the next open, and the file stays', async () => {
    store(pdf({ accountId: 'me' }), hosted)
    const id = await fileId(BYTES)
    const posts = fakeAccount([
      { text: 'Pat old text', filename: 'Pat.pdf', updated_at: '2026-10-01T00:00:00.000Z' },
      { text: 'Pat new text', filename: 'Pat.pdf', updated_at: '2026-11-26T00:00:00.000Z', reader_version: READER_VERSION },
    ], 503, 200)
    expect(await refreshResume({ read: reads('Pat new text') })).toBe('failed')
    expect(local.resume).toMatchObject({ text: 'Pat new text', file: { id }, rereadFrom: await sha256Hex(new TextEncoder().encode('Pat old text')) })

    expect(await refreshResume({ read: reads('Pat new text') })).toBe('none')
    expect(posts).toHaveLength(2)
    expect(posts[1]).toMatchObject({ text: 'Pat new text', reread: true, baseTextHash: posts[0]!.baseTextHash })
    expect(local.resume).toMatchObject({ text: 'Pat new text', file: { id }, readerVersion: READER_VERSION })
    expect((local.resume as ResumeData).rereadFrom).toBeUndefined()
    expect(local[`designFile:${id}`]).toBeDefined()
  })

  test("a hosted same-text re-read records the version in the account", async () => {
    store(pdf({ accountId: 'me' }), hosted)
    const posts = fakeAccount([{ text: 'Pat old text', filename: 'Pat.pdf', updated_at: '2026-10-01T00:00:00.000Z' }])
    expect(await refreshResume({ read: reads('Pat old text') })).toBe('same')
    expect(posts).toMatchObject([{ text: 'Pat old text', readerVersion: READER_VERSION, reread: true }])
  })

  test('a copy added while signed out is read again here but never sent', async () => {
    store(pdf({ accountId: 'me', signedOutUpload: true }), hosted)
    const posts = fakeAccount([null])
    expect(await refreshResume({ read: reads('Pat new text') })).toBe('changed')
    expect(posts).toEqual([])
  })

  test("own-key mode marks a re-read of an account's resume for the next sign-in or hosted open", async () => {
    store(pdf({ accountId: 'me' }))
    const posts = fakeAccount([null])
    expect(await refreshResume({ read: reads('Pat new text') })).toBe('changed')
    expect(posts).toEqual([])
    expect(local.resume).toMatchObject({ text: 'Pat new text', rereadFrom: await sha256Hex(new TextEncoder().encode('Pat old text')) })
  })

  test("a hosted Word re-read leaves the account to the worker's design check, which sends the re-read first", async () => {
    const word: ResumeData = { text: 'Pat old text', filename: 'Pat.docx', updatedAt: '2026-11-01T00:00:00.000Z', accountId: 'me', file: { id: OLD_ID, size: 4, type: 'docx' }, design: { hash: OLD_ID, size: 4, status: 'done' } }
    store(word, hosted)
    const order: string[] = []
    const posts = fakeAccount([{ text: 'Pat old text', filename: 'Pat.docx', updated_at: '2026-10-01T00:00:00.000Z' }])
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    const inner = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => { if (init?.method === 'POST') order.push('post'); return inner(url, init) })
    ;(chrome.runtime as { sendMessage: unknown }).sendMessage = async () => { order.push('check') }
    expect(await refreshResume({ read: reads('Pat new text') })).toBe('changed')
    expect(posts).toEqual([])
    expect(order).toEqual(['check'])
    expect(local.resume).toMatchObject({ text: 'Pat new text', rereadFrom: await sha256Hex(new TextEncoder().encode('Pat old text')) })
  })

  test('a resume replaced during the read is not overwritten', async () => {
    store(pdf())
    const other = { text: 'Uploaded meanwhile', filename: 'New.pdf', updatedAt: '2026-11-25T00:00:00.000Z' }
    const read = vi.fn(async () => { local.resume = other; return 'Pat new text' })
    expect(await refreshResume({ read })).toBe('account')
    expect(local.resume).toEqual(other)
  })

  test('an unreadable file changes nothing', async () => {
    store(pdf())
    const read = vi.fn(async () => { throw new Error('bad PDF') })
    expect(await refreshResume({ read })).toBe('failed')
    expect(local.resume).toEqual(pdf())
  })
})

describe('needsUploadNote (#401)', () => {
  const old: ResumeData = { text: 'x', filename: 'a.pdf', updatedAt: '2026-11-01T00:00:00Z' }
  test('shows only with no stored file, an old reader, a pdf or docx name, and no dismissal', () => {
    expect(needsUploadNote(old, false)).toBe(true)
    expect(needsUploadNote({ ...old, filename: 'a.docx' }, false)).toBe(true)
    expect(needsUploadNote({ ...old, file: { id: 'f', size: 1, type: 'pdf' } }, false)).toBe(false)
    expect(needsUploadNote({ ...old, design: { hash: 'h', size: 1, status: 'done' } }, false)).toBe(false)
    expect(needsUploadNote({ ...old, readerVersion: READER_VERSION }, false)).toBe(false)
    expect(needsUploadNote({ ...old, filename: 'a.txt' }, false)).toBe(false)
    expect(needsUploadNote(old, true)).toBe(false)
    expect(needsUploadNote(null, false)).toBe(false)
  })
})
