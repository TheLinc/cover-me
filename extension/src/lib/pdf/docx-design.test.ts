import JSZip from 'jszip'
import { describe, expect, test } from 'vitest'
import { designUsable, tailorDesign } from './docx-design'
import type { TailoredResume } from './types'

// Made-up .docx fixtures: just enough of a Word package around a body.
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
async function docx(body: string): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr/></w:body></w:document>`)
  return zip.generateAsync({ type: 'uint8array' })
}
const p = (text: string, style = 'ListBullet') =>
  `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Garamond"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
const heading = (text: string) => p(text, 'Heading1')

async function bodyOf(bytes: Uint8Array): Promise<string> {
  return (await JSZip.loadAsync(bytes)).file('word/document.xml')!.async('string')
}
// The visible text of each paragraph, in order.
async function paragraphs(bytes: Uint8Array): Promise<string[]> {
  const xml = await bodyOf(bytes)
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) => [...m[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join(''))
}

const parsed = (bullets: string[][], extra: Partial<TailoredResume> = {}): TailoredResume => ({
  name: 'Ada Example', email: 'ada@example.com', phone: '', website: '',
  experience: bullets.map((b, i) => ({ title: `Role ${i}`, company: `Co ${i}`, location: '', dates: '2020', bullets: b })),
  education: [],
  ...extra,
})

const PLAIN = [
  heading('Experience'),
  p('Built the billing service in Go'),
  p('Cut page load time from 3s to 1s'),
  p('Mentored two junior engineers'),
].join('')

describe('tailorDesign', () => {
  test('plain bullets: every bullet matches and takes the tailored text, formatting kept', async () => {
    const file = await docx(PLAIN)
    const original = parsed([['Built the billing service in Go', 'Cut page load time from 3s to 1s', 'Mentored two junior engineers']])
    const tailored = parsed([['Shipped a Go billing service', 'Reduced page load from 3s to 1s', 'Mentored two junior engineers through code reviews']])

    const { check, bytes } = await tailorDesign(file, original, tailored)

    expect(check).toMatchObject({ matched: 3, total: 3, unmatched: [] })
    expect(designUsable(check)).toBe(true)
    expect(await paragraphs(bytes!)).toEqual([
      'Experience',
      'Shipped a Go billing service',
      'Reduced page load from 3s to 1s',
      'Mentored two junior engineers through code reviews',
    ])
    expect(await bodyOf(bytes!)).toContain('<w:rFonts w:ascii="Garamond"/>')
  })

  test('a bold lead-in matches on the whole text, and the rewrite goes plain into the longest run', async () => {
    const bold = '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Billing:</w:t></w:r><w:r><w:t xml:space="preserve"> built the service in Go &amp; Postgres</w:t></w:r></w:p>'
    const file = await docx(heading('Experience') + bold)
    const { check, bytes } = await tailorDesign(file,
      parsed([['Billing: built the service in Go & Postgres']]),
      parsed([['Shipped a Go & Postgres billing service']]))

    expect(check.matched).toBe(1)
    expect(await paragraphs(bytes!)).toEqual(['Experience', 'Shipped a Go &amp; Postgres billing service'])
  })

  test('a soft line break inside a bullet reads as a space', async () => {
    const wrapped = '<w:p><w:r><w:t>Cut page load time</w:t><w:br/><w:t>from 3s to 1s</w:t></w:r></w:p>'
    const { check, bytes } = await tailorDesign(await docx(wrapped),
      parsed([['Cut page load time from 3s to 1s']]),
      parsed([['Reduced page load from 3s to 1s']]))

    expect(check.matched).toBe(1)
    expect(await paragraphs(bytes!)).toEqual(['Reduced page load from 3s to 1s'])
    expect(await bodyOf(bytes!)).not.toContain('<w:br/>')
  })

  test('a typed glyph in its own run stays in front of the tab', async () => {
    const glyphRun = '<w:p><w:r><w:t>•</w:t><w:tab/></w:r><w:r><w:t>Built the billing service in Go</w:t></w:r></w:p>'
    const { bytes } = await tailorDesign(await docx(glyphRun), parsed([['Built the billing service in Go']]), parsed([['Shipped a Go billing service']]))
    expect(await bodyOf(bytes!)).toContain('<w:t>•</w:t><w:tab/></w:r><w:r><w:t xml:space="preserve">Shipped a Go billing service</w:t>')
  })

  test('bullets in a two-column table are tailored, with the layout warning', async () => {
    const cell = (inner: string) => `<w:tc><w:tcPr/>${inner}</w:tc>`
    const table = `<w:tbl><w:tr>${cell(p('Ada Example') + p('Skills'))}${cell(p('Built the billing service in Go') + p('Mentored two junior engineers'))}</w:tr></w:tbl>`
    const { check, bytes } = await tailorDesign(await docx(table),
      parsed([['Built the billing service in Go', 'Mentored two junior engineers']]),
      parsed([['Shipped a Go billing service', 'Mentored two engineers']]))

    expect(check).toMatchObject({ matched: 2, total: 2, layoutWarning: 'columns' })
    expect(await paragraphs(bytes!)).toEqual(['Ada Example', 'Skills', 'Shipped a Go billing service', 'Mentored two engineers'])
  })

  test('bullets in text boxes are counted apart, and the file is left alone below 80%', async () => {
    const box = (inner: string) => `<w:p><w:r><w:drawing><wps:txbx><w:txbxContent>${inner}</w:txbxContent></wps:txbx></w:drawing></w:r></w:p>`
    const file = await docx(heading('Experience') + box(p('Built the billing service in Go') + p('Mentored two junior engineers')) + p('Cut page load time from 3s to 1s'))
    const bullets = [['Built the billing service in Go', 'Mentored two junior engineers', 'Cut page load time from 3s to 1s']]

    const { check, bytes } = await tailorDesign(file, parsed(bullets), parsed(bullets))

    expect(check).toMatchObject({ matched: 1, total: 3, textBoxBullets: 2, layoutWarning: 'textbox' })
    expect(check.unmatched).toEqual(['Built the billing service in Go', 'Mentored two junior engineers'])
    expect(designUsable(check)).toBe(false)
    expect(bytes).toBeUndefined()
  })

  test('a bullet the tailor dropped deletes its paragraph', async () => {
    const bullets = ['Built the billing service in Go', 'Cut page load time from 3s to 1s', 'Mentored two junior engineers']
    const { bytes } = await tailorDesign(await docx(PLAIN), parsed([bullets]), parsed([['Mentored two engineers', 'Shipped a Go billing service']]))

    expect(await paragraphs(bytes!)).toEqual(['Experience', 'Mentored two engineers', 'Shipped a Go billing service'])
  })

  const SUMMARY = 'Backend engineer who builds billing systems and payment services for small teams, with a focus on reliability.'
  const SKILLS = 'Go, Postgres, Kubernetes'

  test('the summary under its heading and a one-paragraph skills line are rewritten', async () => {
    const file = await docx(heading('Profile') + p(SUMMARY, 'Normal') + PLAIN + heading('Skills') + p(`Technical: ${SKILLS}`, 'Normal'))
    const bullets = [['Built the billing service in Go', 'Cut page load time from 3s to 1s', 'Mentored two junior engineers']]

    const { check, bytes } = await tailorDesign(file, parsed(bullets, { skills: SKILLS }),
      parsed(bullets, { skills: 'Postgres, Go', summary: 'Billing engineer for payment systems.' }))

    expect(check).toMatchObject({ summary: true, skills: 'reordered' })
    const out = await paragraphs(bytes!)
    expect(out[1]).toBe('Billing engineer for payment systems.')
    expect(out[out.length - 1]).toBe('Technical: Postgres, Go')
  })

  test('a skills label in its own run keeps its formatting', async () => {
    const line = `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Skills: </w:t></w:r><w:r><w:t>${SKILLS}</w:t></w:r></w:p>`
    const bullets = [['Built the billing service in Go']]
    const { bytes } = await tailorDesign(await docx(p('Built the billing service in Go') + line), parsed(bullets, { skills: SKILLS }), parsed(bullets, { skills: 'Postgres, Go' }))
    expect(await bodyOf(bytes!)).toContain('<w:b/></w:rPr><w:t xml:space="preserve">Skills: </w:t>')
    expect((await paragraphs(bytes!)).slice(-1)[0]).toBe('Skills: Postgres, Go')
  })

  test('a label run without its space keeps the label, and the space', async () => {
    const line = `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Skills:</w:t></w:r><w:r><w:t xml:space="preserve"> ${SKILLS}</w:t></w:r></w:p>`
    const bullets = [['Built the billing service in Go']]
    const { bytes } = await tailorDesign(await docx(p('Built the billing service in Go') + line), parsed(bullets, { skills: SKILLS }), parsed(bullets, { skills: 'Postgres, Go' }))
    expect(await bodyOf(bytes!)).toContain('<w:b/></w:rPr><w:t>Skills:</w:t>')
    expect((await paragraphs(bytes!)).slice(-1)[0]).toBe('Skills: Postgres, Go')
  })

  test('a summary heading over several lines is left alone', async () => {
    const file = await docx(heading('Summary') + p(SUMMARY, 'Normal') + p('Shipped payment systems for marketplaces, logistics firms and two banks.', 'Normal') + PLAIN)
    const bullets = [['Built the billing service in Go', 'Cut page load time from 3s to 1s', 'Mentored two junior engineers']]
    expect((await tailorDesign(file, parsed(bullets))).check.summary).toBe(false)
  })

  test('a non-breaking hyphen matches the parse, as mammoth reads it', async () => {
    const hyphen = '<w:p><w:r><w:t>Ran e</w:t><w:noBreakHyphen/><w:t>commerce checkout</w:t></w:r></w:p>'
    const { check } = await tailorDesign(await docx(hyphen), parsed([['Ran e‑commerce checkout']]))
    expect(check.matched).toBe(1)
  })

  test('no summary in the file is never added, and skills split over lines are kept', async () => {
    const file = await docx(PLAIN + heading('Skills') + p('Go, Postgres', 'Normal') + p('Kubernetes', 'Normal'))
    const bullets = [['Built the billing service in Go', 'Cut page load time from 3s to 1s', 'Mentored two junior engineers']]

    const { check, bytes } = await tailorDesign(file, parsed(bullets, { skills: SKILLS }),
      parsed(bullets, { skills: 'Kubernetes, Go', summary: 'Added summary.' }))

    expect(check).toMatchObject({ summary: false, skills: 'split' })
    const out = await paragraphs(bytes!)
    expect(out).not.toContain('Added summary.')
    expect(out.slice(-2)).toEqual(['Go, Postgres', 'Kubernetes'])
  })

  test('a summary heading over bullets is not a summary, even with prose further down', async () => {
    const file = await docx(heading('Summary') + PLAIN.replace(heading('Experience'), '') + p(SUMMARY, 'Normal'))
    const bullets = [['Built the billing service in Go', 'Cut page load time from 3s to 1s', 'Mentored two junior engineers']]
    const { check } = await tailorDesign(file, parsed(bullets))
    expect(check.summary).toBe(false)
  })

  test('a long skills line above the bullets is skills, not a summary, and the file stays whole', async () => {
    const many = Array.from({ length: 26 }, (_, i) => `Skill${i}`).join(', ')
    const file = await docx(p(`Skills: ${many}`, 'Normal') + PLAIN)
    const bullets = [['Built the billing service in Go', 'Cut page load time from 3s to 1s', 'Mentored two junior engineers']]
    const { check, bytes } = await tailorDesign(file, parsed(bullets, { skills: many }), parsed(bullets, { skills: 'Skill3, Skill1', summary: 'A summary.' }))
    expect(check).toMatchObject({ summary: false, skills: 'reordered' })
    expect((await paragraphs(bytes!))[0]).toBe('Skills: Skill3, Skill1')
  })

  test('long prose further down the page is not taken for a summary', async () => {
    const coursework = 'Relevant coursework: ' + Array.from({ length: 30 }, (_, i) => `Course ${i}`).join(', ')
    const file = await docx(p('Ada Example', 'Title') + p('ada@example.com', 'Normal') + heading('Education') + p('State University', 'Normal') + p('BSc Computer Science', 'Normal') + p(coursework, 'Normal') + PLAIN)
    const bullets = [['Built the billing service in Go', 'Cut page load time from 3s to 1s', 'Mentored two junior engineers']]
    expect((await tailorDesign(file, parsed(bullets))).check.summary).toBe(false)
  })

  test('dropping every bullet in a table cell leaves the cell a paragraph', async () => {
    const table = `<w:tbl><w:tr><w:tc>${p('Built the billing service in Go') + p('Mentored two junior engineers')}</w:tc></w:tr></w:tbl>`
    const { bytes } = await tailorDesign(await docx(p('Cut page load time from 3s to 1s') + table),
      parsed([['Cut page load time from 3s to 1s', 'Built the billing service in Go', 'Mentored two junior engineers']]),
      parsed([['Reduced page load from 3s to 1s']]))
    expect(await bodyOf(bytes!)).toMatch(/<w:tc>\s*<w:p[ >]/)
  })

  test('a tailored resume from a different parse is not placed', async () => {
    const bullets = [['Built the billing service in Go', 'Cut page load time from 3s to 1s', 'Mentored two junior engineers']]
    const { check, bytes } = await tailorDesign(await docx(PLAIN), parsed(bullets), parsed([...bullets, ['Another role']]))

    expect(designUsable(check)).toBe(false)
    expect(bytes).toBeUndefined()
  })
})
