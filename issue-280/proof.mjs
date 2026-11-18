// Proof for #280: node proof.mjs <before|after> <baseUrl> <outDir>
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import zlib from 'node:zlib'
const require = createRequire('F:/worktrees/cover-me/t3-3184778e/extension/package.json')
const { chromium } = require('playwright')

const [mode, BASE, OUT] = process.argv.slice(2)
const CLEAN = 'https://chromewebstore.google.com/detail/cover-me-ai-resume-tailor/bpbnopjgjbimdjjdolhkgimllbgamgpi'
const PAGES = [
  ['/', ['hero', 'dock', 'pricing', 'closing', 'nav', 'footer']],
  ['/about', ['nav', 'about', 'footer']],
  ['/for/linkedin', ['nav', 'for-board', 'footer']],
  ['/guides/ats-friendly-resume-format', ['nav', 'guide', 'footer']],
  ['/uninstalled', ['uninstalled']],
]
const failures = []
const check = (ok, msg) => { if (!ok) failures.push(msg); console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`) }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' })
// PostHog drops events from browsers that look automated
await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); Object.defineProperty(navigator, 'userAgentData', { get: () => undefined }) })
await ctx.addInitScript(() => localStorage.setItem('uninstall-survey-sent-at', String(Date.now())))
await ctx.route('https://chromewebstore.google.com/**', (r) => r.fulfill({ body: '<title>store</title>', contentType: 'text/html' }))
const events = []
await ctx.route('**/relay/**', async (r) => {
  const req = r.request()
  const buf = req.postDataBuffer()
  if (buf?.length) {
    let text
    try { text = zlib.gunzipSync(buf).toString() } catch { text = buf.toString() }
    if (text.startsWith('data=')) text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString()
    try { const j = JSON.parse(text); events.push(...(Array.isArray(j) ? j : j.batch ?? [j])) } catch {}
  }
  r.fulfill({ status: 200, body: '{}', contentType: 'application/json' })
})

const page = await ctx.newPage()
const rows = []
const seen = new Map()
for (const [path, expected] of PAGES) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  const hrefs = await page.$$eval('a[href^="https://chromewebstore.google.com/"]', (as) => as.map((a) => a.getAttribute('href')))
  const campaigns = hrefs.map((h) => new URL(h).searchParams.get('utm_campaign'))
  for (const h of hrefs) rows.push(`${path}\t${h}`)
  if (mode === 'after') {
    for (const h of hrefs) {
      const p = new URL(h).searchParams
      check(h.startsWith(CLEAN + '?') && p.get('utm_source') === 'cover-me.dev' && p.get('utm_medium') === 'site' && p.get('utm_campaign'), `${path}: ${h} is tagged`)
    }
    check(JSON.stringify([...new Set(campaigns)].sort()) === JSON.stringify([...expected].sort()), `${path}: campaigns ${[...new Set(campaigns)]} = ${expected}`)
    for (const c of campaigns) { if (seen.has(c) && !['nav', 'footer'].includes(c) && seen.get(c) !== path) failures.push(`campaign ${c} reused on ${path}`); seen.set(c, path) }
  } else {
    check(hrefs.length > 0 && hrefs.every((h) => h === CLEAN), `${path}: ${hrefs.length} links, all untagged`)
  }
}
writeFileSync(`${OUT}/${mode}-links.tsv`, rows.join('\n') + '\n')

// JSON-LD keeps the clean URL
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
const ld = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => x.textContent).join('\n'))
const ldUrls = [...ld.matchAll(/https:\/\/chromewebstore\.google\.com[^"]*/g)].map((m) => m[0])
check(ldUrls.length >= 3 && ldUrls.every((u) => u === CLEAN), `JSON-LD store URLs are clean (${ldUrls.length})`)

// Screenshot the hero button with its href shown, as devtools would
const hero = page.locator('main a[href^="https://chromewebstore.google.com/"]').first()
await hero.evaluate((a) => {
  const tip = document.createElement('div')
  tip.textContent = a.getAttribute('href')
  Object.assign(tip.style, { position: 'absolute', zIndex: 9999, background: '#111', color: '#fff', font: '12px monospace', padding: '6px 8px', borderRadius: '4px', maxWidth: '560px', wordBreak: 'break-all' })
  const r = a.getBoundingClientRect()
  tip.style.left = `${r.left + scrollX}px`; tip.style.top = `${r.bottom + scrollY + 8}px`
  document.body.append(tip)
  a.style.outline = '3px solid #e11d48'
})
await page.screenshot({ path: `${OUT}/${mode}-1-hero-link.png` })

// Click the hero button; PostHog's store_link_clicked goes to /relay
await page.waitForFunction(() => window.posthog?.__loaded || document.readyState === 'complete')
await page.waitForTimeout(1500)
const [popup] = await Promise.all([ctx.waitForEvent('page'), hero.click()])
await popup.close()
await page.waitForTimeout(500)
await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
await page.goto('about:blank')
await page.waitForTimeout(500)
const click = events.find((e) => e.event === 'store_link_clicked')
const props = click ? { link_text: click.properties.link_text, campaign: click.properties.campaign } : null
writeFileSync(`${OUT}/${mode}-event.json`, JSON.stringify(props, null, 2) + '\n')
console.log('store_link_clicked:', JSON.stringify(props))
check(props?.link_text, 'store_link_clicked carries link_text')
check(mode === 'after' ? props?.campaign === 'hero' : props?.campaign === undefined, `campaign is ${mode === 'after' ? 'hero' : 'absent'}`)

// Signed in, no applications yet: the dashboard's two install links
await page.goto(BASE + '/auth', { waitUntil: 'networkidle' })
await page.locator('input[type=email]:visible').fill('proof-280@example.com')
await page.locator('input[type=password]:visible').fill('proof-280-pass')
await page.locator('input[type=password]:visible').press('Enter')
await page.waitForURL('**/dashboard**', { timeout: 60000 })
await page.waitForLoadState('networkidle')
const dashHrefs = await page.$$eval('a[href^="https://chromewebstore.google.com/"]', (as) => as.map((a) => a.getAttribute('href')))
for (const h of dashHrefs) rows.push(`/dashboard\t${h}`)
const dashCampaigns = [...new Set(dashHrefs.map((h) => new URL(h).searchParams.get('utm_campaign')))].sort()
if (mode === 'after') check(JSON.stringify(dashCampaigns) === '["dashboard","dashboard-empty"]' && dashHrefs.every((h) => h.includes('utm_source=cover-me.dev&utm_medium=site')), `/dashboard: campaigns ${dashCampaigns}`)
else check(dashHrefs.length === 2 && dashHrefs.every((h) => h === CLEAN), `/dashboard: ${dashHrefs.length} links, all untagged`)
await page.locator('a[href^="https://chromewebstore.google.com/"]').last().scrollIntoViewIfNeeded()
await page.screenshot({ path: `${OUT}/${mode}-2-dashboard.png` })
writeFileSync(`${OUT}/${mode}-links.tsv`, rows.join('\n') + '\n')

await browser.close()
console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASS')
process.exit(failures.length ? 1 : 0)
