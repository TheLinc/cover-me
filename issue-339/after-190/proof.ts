// Proof for #339 after #190: upload a PDF resume, show the stored lines that
// carry a link URL and the reader mark.
// Usage: tsx zz-proof.ts <dist> <before|after> <outDir> <pdf>
import { strict as assert } from 'node:assert'
import { launchExtension } from './scripts/e2e'

const [dist, label, out] = process.argv.slice(2) as [string, 'before' | 'after', string]

const pdf = process.argv[5]!

const { ctx, popupUrl } = await launchExtension({ dist, headless: true })
try {
  const popup = await ctx.newPage()
  await popup.setViewportSize({ width: 420, height: 640 })
  await popup.goto(popupUrl)
  await popup.getByRole('button', { name: /Resume/ }).first().click()
  await popup.locator('input[type="file"]').setInputFiles(pdf)
  await popup.getByText('resume.pdf').first().waitFor()
  await popup.screenshot({ path: `${out}/${label}-1-upload.png` })

  const resume: { text: string; readerVersion?: number } = await popup.evaluate(async () => (await chrome.storage.local.get('resume')).resume)
  const contact = resume.text.split('\n').filter((l) => l.includes('(http')).join('\n')

  const view = await ctx.newPage()
  await view.setViewportSize({ width: 720, height: 420 })
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
  await view.setContent(`<body style="font:14px system-ui;margin:16px;background:#fff;color:#111">
    <h3 style="margin:0 0 8px">${label === 'before' ? 'Before (master)' : 'After (this branch)'}: stored from Awesome-CV resume.pdf</h3>
    <p style="margin:0 0 4px">Contact line: <code style="background:#eee;padding:2px 4px">${esc(contact)}</code></p>
    <p style="margin:0 0 8px">readerVersion: <b>${resume.readerVersion ?? 'not set'}</b></p>
    <pre hidden style="white-space:pre-wrap;font:12px ui-monospace,monospace;border:1px solid #ccc;padding:8px;margin:0">${esc(resume.text)}</pre></body>`)
  await view.screenshot({ path: `${out}/${label}-2-stored-text.png` })
  console.log(label, JSON.stringify(contact), resume.readerVersion)

  if (label === 'after') {
    assert.ok(contact.includes('(https://github.com/posquit0) | LINKEDIN'))
    assert.equal(resume.readerVersion, 2)
  } else {
    assert.ok(contact.includes('(https://github.com/posquit0)| LINKEDIN'))
    assert.equal(resume.readerVersion, undefined)
  }
} finally {
  await ctx.close()
}
