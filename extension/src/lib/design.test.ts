import JSZip from 'jszip'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { designForTailor, finishDesign, toBase64 } from './design'

function fakeLocal(data: Record<string, unknown> = {}) {
  const pick = (k: string | string[]) => Object.fromEntries((Array.isArray(k) ? k : [k]).filter((x) => x in data).map((x) => [x, data[x]]))
  vi.stubGlobal('chrome', { storage: { local: {
    get: async (k: string | string[]) => pick(k),
    set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
    remove: async (k: string | string[]) => { for (const x of Array.isArray(k) ? k : [k]) delete data[x] },
  } } })
}
afterEach(() => vi.unstubAllGlobals())

const bullets = ['Built the billing service in Go', 'Mentored two junior engineers']
const resume = (b = bullets) => ({
  name: 'Ada Example', email: '', phone: '', website: '', education: [],
  experience: [{ title: 'Engineer', company: 'Northwind', location: '', dates: '2022', bullets: b }],
})
const hash = 'c'.repeat(64)
const check = { matched: 2, total: 2, unmatched: [], textBoxBullets: 0, summary: false, skills: 'none' as const }

async function store({ layout, withFile = true }: { layout?: 'yours' | 'cover-me'; withFile?: boolean } = {}) {
  const zip = new JSZip()
  const body = bullets.map((b) => `<w:p><w:r><w:t>${b}</w:t></w:r></w:p>`).join('')
  zip.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`)
  const data = toBase64(await zip.generateAsync({ type: 'uint8array' }))
  fakeLocal({
    resume: { text: 'Ada', filename: 'ada.docx', updatedAt: '2026-11-01T00:00:00Z', design: { hash, size: 100, status: 'done', check }, ...(layout ? { layout } : {}) },
    ...(withFile ? { [`designFile:${hash}`]: { data, parsed: resume() }, designFiles: [hash] } : {}),
  })
}

describe('the layout of a tailor', () => {
  test('"Your design" sends the file hash, turns the summary off for a file without one, and marks the result', async () => {
    await store()
    const d = await designForTailor()
    expect(d.design).toEqual({ layout: 'yours', fellBack: false, sourceHash: hash })
    expect(d.summary).toBe(false)
    const done = await finishDesign({ ...resume(['Shipped a Go billing service', 'Mentored two engineers']), summary: '' }, d)
    expect(done.sourceHash).toBe(hash)
    expect(done.designFellBack).toBeUndefined()
  })

  test('a result that can\'t be placed in the file falls back to the Cover Me layout', async () => {
    await store()
    const d = await designForTailor()
    const other = { ...resume(), experience: [...resume().experience, { title: 'Intern', company: 'Contoso', location: '', dates: '2020', bullets: ['Wrote tests'] }] }
    const done = await finishDesign(other, d)
    expect(done).toMatchObject({ designFellBack: true })
    expect(done.sourceHash).toBeUndefined()
  })

  test('a missing file falls back, and is counted as a fallback', async () => {
    await store({ withFile: false })
    const d = await designForTailor()
    expect(d.design).toEqual({ layout: 'yours', fellBack: true })
    expect(await finishDesign(resume(), d)).toMatchObject({ designFellBack: true })
  })

  test('the Cover Me layout drops a hash a revised result carried over', async () => {
    await store({ layout: 'cover-me' })
    const d = await designForTailor()
    expect(d.design).toEqual({ layout: 'cover-me', fellBack: false })
    expect(await finishDesign({ ...resume(), sourceHash: hash }, d)).not.toHaveProperty('sourceHash')
  })
})
