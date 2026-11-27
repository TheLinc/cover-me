import { afterEach, describe, expect, test, vi } from 'vitest'
import { toBase64 } from './design'
import { downloadStoredFile, fileId, fileType, fromLine, resumeSource, saveUpload, usingLine } from './resume-file'
import { saveDesignFile } from './storage'

const saveFileMock = vi.hoisted(() => vi.fn())
vi.mock('./pdf/file-name', async (importOriginal) => ({ ...(await importOriginal<object>()), saveFile: saveFileMock }))

function fakeLocal(data: Record<string, unknown> = {}) {
  const pick = (k: string | string[]) => Object.fromEntries([k].flat().filter((x) => x in data).map((x) => [x, data[x]]))
  vi.stubGlobal('chrome', { storage: { local: {
    get: async (k: string | string[]) => pick(k),
    set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
    remove: async (k: string | string[]) => { for (const x of [k].flat()) delete data[x] },
  } } })
  return data
}

afterEach(() => vi.unstubAllGlobals())

describe('stored resume files (#401)', () => {
  test('fileId changes with the reader version, not between calls', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    expect(await fileId(bytes, 2)).toBe(await fileId(bytes, 2))
    expect(await fileId(bytes, 2)).not.toBe(await fileId(bytes, 3))
    expect(await fileId(bytes, 2)).toMatch(/^[0-9a-f]{64}$/)
  })

  test('fileType reads pdf and docx only', () => {
    expect(fileType('A.PDF')).toBe('pdf')
    expect(fileType('a.docx')).toBe('docx')
    expect(fileType('a.txt')).toBeNull()
  })

  test('a PDF upload keeps its bytes, and another upload replaces them', async () => {
    const local = fakeLocal()
    const first = new Uint8Array([37, 80, 68, 70, 1])
    const { resume } = await saveUpload(new File([first], 'Pat.pdf'), 'Pat text')
    const id = await fileId(first)
    expect(resume).toMatchObject({ text: 'Pat text', filename: 'Pat.pdf', file: { id, size: 5, type: 'pdf' } })
    expect(resume.uploadedAt).toBe(resume.updatedAt)
    expect(resume.design).toBeUndefined()
    expect(local[`designFile:${id}`]).toEqual({ data: toBase64(first) })

    const { resume: next } = await saveUpload(new File([new Uint8Array([37, 80, 68, 70, 2])], 'Pat 2.pdf'), 'Pat text 2')
    expect(local[`designFile:${id}`]).toBeUndefined()
    expect(local[`designFile:${next.file!.id}`]).toBeDefined()
  })

  test('a Word upload uses the file id as its design hash', async () => {
    fakeLocal()
    const { resume, word } = await saveUpload(new File([new Uint8Array([80, 75])], 'Pat.docx'), 'Pat text')
    expect(word).toBe(resume.file!.id)
    expect(resume.design).toMatchObject({ hash: resume.file!.id, size: 2, status: 'checking' })
  })

  test('a TXT upload keeps no file', async () => {
    const local = fakeLocal()
    const { resume } = await saveUpload(new File(['Pat text'], 'Pat.txt'), 'Pat text')
    expect(resume.file).toBeUndefined()
    expect(Object.keys(local).filter((k) => k.startsWith('designFile:'))).toEqual([])
  })
})

describe('the uploaded file, seen (#401)', () => {
  test('downloads the stored bytes under the original name', async () => {
    fakeLocal()
    const bytes = new Uint8Array([37, 80, 68, 70, 9])
    await saveDesignFile('p', { data: toBase64(bytes) })
    saveFileMock.mockClear()
    expect(await downloadStoredFile('p', 'Pat Resume.pdf')).toBe(true)
    const [blob, name] = saveFileMock.mock.calls[0] as [Blob, string]
    expect(name).toBe('Pat Resume.pdf')
    expect(blob.type).toBe('application/pdf')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes)
  })

  test('a Word file downloads as Word', async () => {
    fakeLocal()
    await saveDesignFile('w', { data: toBase64(new Uint8Array([80, 75])) })
    saveFileMock.mockClear()
    await downloadStoredFile('w', 'Pat.docx')
    expect((saveFileMock.mock.calls[0]![0] as Blob).type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  })

  test('returns false with no stored file', async () => {
    fakeLocal()
    saveFileMock.mockClear()
    expect(await downloadStoredFile('gone', 'Pat.pdf')).toBe(false)
    expect(saveFileMock).not.toHaveBeenCalled()
  })

  test('usingLine names the file and its upload date, with the year only when it is not this year', () => {
    const year = new Date().getFullYear()
    const base = { text: 'x', filename: 'Pat.pdf', updatedAt: `${year}-11-20T12:00:00Z` }
    expect(usingLine({ ...base, uploadedAt: `${year}-11-12T12:00:00Z` })).toBe('Using Pat.pdf, uploaded Nov 12')
    expect(usingLine(base)).toBe('Using Pat.pdf, uploaded Nov 20')
    expect(usingLine({ ...base, uploadedAt: `${year - 1}-03-05T12:00:00Z` })).toBe(`Using Pat.pdf, uploaded Mar 5, ${year - 1}`)
  })

  test('fromLine names the source file and its upload date', () => {
    const year = new Date().getFullYear()
    expect(fromLine({ filename: 'Pat.pdf', uploadedAt: `${year}-02-03T12:00:00Z` })).toBe('From Pat.pdf, uploaded Feb 3')
  })

  test('resumeSource names the file and falls back to updatedAt', () => {
    expect(resumeSource({ text: 'x', filename: 'Pat.pdf', updatedAt: 'U', uploadedAt: 'A', file: { id: 'f', size: 1, type: 'pdf' } })).toEqual({ filename: 'Pat.pdf', uploadedAt: 'A', fileId: 'f' })
    expect(resumeSource({ text: 'x', filename: 'Pat.txt', updatedAt: 'U' })).toEqual({ filename: 'Pat.txt', uploadedAt: 'U' })
  })
})
