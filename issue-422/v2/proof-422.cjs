// Usage: node proof-422.cjs <before|after> <baseUrl> <outDir>
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright')
const assert = require('node:assert/strict')
const [label, base, out] = process.argv.slice(2)
const after = label === 'after'
const slug = '/guides/best-free-ats-resume-checkers'

;(async () => {
  const browser = await chromium.launch()
  const shot = (page, n, step, opts = {}) => page.screenshot({ path: `${out}/${label}-${n}-${step}.png`, ...opts })
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  const res = await desktop.goto(base + slug, { waitUntil: 'networkidle', timeout: 180_000 })
  await shot(desktop, 1, 'guide-top')
  if (after) {
    assert.equal(res.status(), 200)
    assert.match(await desktop.title(), /Free ATS Resume Checkers, Tested \(November 2026\)/)
    assert.equal(await desktop.locator('h1').innerText(), 'Best free ATS resume checkers (2026), compared')
    const results = desktop.locator('figure', { hasText: 'Real gaps found' })
    const limits = desktop.locator('figure', { hasText: 'Tool and source' })
    assert.equal(await results.locator('tbody tr').count(), 8)
    assert.match(await results.locator('tbody').innerText(), /Cover Me\s+63 out of 100\s+4/)
    const rows = limits.locator('tbody tr')
    assert.equal(await rows.count(), 11)
    for (let i = 0; i < 11; i++) assert.ok(await rows.nth(i).locator('a[href^="https://"]').count() > 0, `row ${i} cites a source`)
    assert.match(await limits.locator('figcaption').innerText(), /checked November 27, 2026/)
    const fit = await desktop.evaluate(() => Math.max(...[...document.querySelectorAll('table')].map((t) => t.scrollWidth - t.parentElement.clientWidth)))
    assert.ok(fit <= 0, `a table scrolls sideways on desktop by ${fit}px`)
    for (const file of ['test-resume.pdf', 'test-resume.txt', 'test-posting.txt']) {
      const r = await desktop.request.get(base + slug + '/' + file)
      assert.equal(r.status(), 200, file)
      assert.ok(await desktop.locator(`a[href="${slug}/${file}"]`).count() > 0, 'links ' + file)
    }
    assert.ok(await desktop.locator('article a[href="/ats-checker"]').count() > 0)
    await desktop.addStyleTag({ content: 'header { visibility: hidden !important }' })
    await results.screenshot({ path: `${out}/${label}-2-test-results.png` })
    await limits.screenshot({ path: `${out}/${label}-3-limits-table.png` })
  } else {
    assert.equal(res.status(), 404)
  }

  await desktop.goto(base + '/ats-checker', { waitUntil: 'networkidle', timeout: 180_000 })
  const heading = desktop.getByRole('heading', { name: 'How the checker scores a resume' })
  await heading.scrollIntoViewIfNeeded()
  await desktop.evaluate(() => window.scrollBy(0, 300))
  await shot(desktop, 4, 'ats-checker-links')
  assert.equal(await desktop.locator(`a[href="${slug}"]`).count(), after ? 1 : 0)

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 })
  await mobile.goto(base + slug, { waitUntil: 'networkidle', timeout: 180_000 })
  await shot(mobile, 5, 'guide-mobile')
  if (after) {
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px`)
  }

  const llms = await (await fetch(base + '/llms.txt')).text()
  const sitemap = await (await fetch(base + '/sitemap.xml')).text()
  const lines = [
    `llms.txt lists the guide: ${llms.includes(`https://www.cover-me.dev${slug})`)}`,
    `sitemap.xml lists the guide: ${sitemap.includes(`${slug}<`)}`,
  ]
  assert.equal(llms.includes(`https://www.cover-me.dev${slug})`), after)
  assert.equal(sitemap.includes(`${slug}<`), after)
  require('node:fs').writeFileSync(`${out}/${label}-6-llms-sitemap.txt`, lines.join('\n') + '\n')
  console.log(label, 'ok\n' + lines.join('\n'))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
