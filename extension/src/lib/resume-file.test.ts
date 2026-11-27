import { afterEach, describe, expect, test, vi } from 'vitest'
import { toBase64 } from './design'
import { fileId, fileType, saveUpload } from './resume-file'

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
