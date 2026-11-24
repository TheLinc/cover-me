// Proof for #285: the guide sentence and llms.txt line on before (3102) and after (3101).
// Run from extension/ (Playwright lives there): node proof-285-web.mjs <outdir>
import { createRequire } from 'node:module'
const { chromium } = createRequire(`${process.cwd()}/package.json`)('playwright')
const out = process.argv[2]
const OLD = 'whose words aren’t already in your resume'
const NEW = 'doesn’t already name has to be backed by a line'
const browser = await chromium.launch({ channel: 'chrome' })
let fail = false
for (const [side, port] of [['before', 3102], ['after', 3101]]) {
  for (const [w, label] of [[1280, 'desktop'], [390, 'mobile']]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } })
    await page.goto(`http://localhost:${port}/guides/chatgpt-resume-prompts`, { waitUntil: 'networkidle', timeout: 180000 })
    const para = page.locator('p', { hasText: 'Part of prompt 4 is built in' })
    const text = await para.innerText()
    const ok = side === 'before' ? text.includes(OLD) : text.includes(NEW) && !text.includes(OLD)
    console.log(`${ok ? 'PASS' : 'FAIL'} ${side} ${label}: ${text.slice(0, 260)}`)
    fail ||= !ok
    await para.scrollIntoViewIfNeeded()
    await para.screenshot({ path: `${out}/${side}-${label}-guide.png` })
    await page.close()
  }
  const llms = await (await fetch(`http://localhost:${port}/llms.txt`)).text()
  const line = llms.split('\n').find((l) => l.startsWith('- No invented experience'))
  const ok = side === 'before' ? line.includes('every skill the AI adds must cite') : line.includes("doesn't already name must be backed")
  console.log(`${ok ? 'PASS' : 'FAIL'} ${side} llms.txt: ${line.slice(0, 230)}`)
  fail ||= !ok
}
await browser.close()
process.exit(fail ? 1 : 0)
