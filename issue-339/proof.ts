// Proof for #339: upload a Word-made PDF resume in the popup, read the text the
// extension stored, and look for the resume's section order in it.
// Usage: tsx zz-proof.ts <dist> <before|after> <pdf> <outDir>
import { strict as assert } from 'node:assert'
import { writeFileSync } from 'node:fs'
import { launchExtension } from './scripts/e2e'
import { sectionOrderFromText } from './src/lib/ai/resume-parse'
import { CASES } from './eval/fixtures'

const [dist, label, pdf, out] = process.argv.slice(2) as [string, 'before' | 'after', string, string]
const source = [...new Set(CASES.map((c) => c.resumeText))][1]!
const parsed = CASES.find((c) => c.resumeText === source)!.parsed

const { ctx, popupUrl } = await launchExtension({ dist, headless: true })
try {
  const popup = await ctx.newPage()
  await popup.setViewportSize({ width: 420, height: 640 })
  await popup.goto(popupUrl)
  await popup.getByRole('button', { name: /Resume/ }).first().click()
  await popup.locator('input[type="file"]').setInputFiles(pdf)
  await popup.getByText('resume.pdf').or(popup.getByText(/word01\.pdf/)).first().waitFor()
  await popup.screenshot({ path: `${out}/${label}-1-upload.png` })

  const text: string = await popup.evaluate(async () => (await chrome.storage.local.get('resume')).resume.text)
  const order = sectionOrderFromText(parsed, text)
  writeFileSync(`${out}/${label}-text.txt`, text)

  const view = await ctx.newPage()
  await view.setViewportSize({ width: 820, height: 900 })
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
  await view.setContent(`<body style="font:14px system-ui;margin:16px;background:#fff;color:#111">
    <h3 style="margin:0 0 4px">${label === 'before' ? 'Before (master)' : 'After (this branch)'}: text stored from word01.pdf</h3>
    <p style="margin:0 0 8px">Section order found: <b>${order ? esc(order.join(' → ')) : 'none (null): the parse model\'s order is kept'}</b></p>
    <pre style="white-space:pre-wrap;font:12px ui-monospace,monospace;border:1px solid #ccc;padding:8px;margin:0">${esc(text.slice(0, 1400))}</pre></body>`)
  await view.screenshot({ path: `${out}/${label}-2-stored-text.png` })
  console.log(label, 'lines:', text.split('\n').length, 'order:', order)

  if (label === 'after') {
    assert.deepEqual(order, sectionOrderFromText(parsed, source))
    assert.ok(text.includes('Medical-Surgical Unit') && text.includes('28-bed'))
  } else {
    assert.equal(order, null)
    assert.ok(text.includes('Medical - Surgical'))
  }
} finally {
  await ctx.close()
}
