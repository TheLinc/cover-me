// Usage: node proof-297.cjs <before|after> <baseUrl> <outDir>
const { chromium } = require('F:/personal-projects/cover-me/extension/node_modules/playwright')
const assert = require('node:assert/strict')
const path = require('node:path')

const [side, base, out] = process.argv.slice(2)
const after = side === 'after'
const SLUG = '/guides/jobright-review'
const shot = (page, n, name, opts = {}) => page.screenshot({ path: path.join(out, `${side}-${n}-${name}.png`), ...opts })

;(async () => {
  const browser = await chromium.launch()
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const log = []

  const res = await desktop.goto(base + SLUG, { waitUntil: 'networkidle' })
  log.push(`${SLUG} -> ${res.status()}`)
  if (!after) {
    assert.equal(res.status(), 404)
    await shot(desktop, 1, 'jobright-review')
  } else {
    assert.equal(res.status(), 200)
    const title = await desktop.title()
    const h1 = (await desktop.locator('h1').first().innerText()).trim()
    log.push(`title: ${title}`, `h1: ${h1}`)
    assert.match(title, /^Jobright Review/)
    assert.notEqual(title.toLowerCase(), h1.toLowerCase())
    const h2s = await desktop.locator('h2').allInnerTexts()
    log.push(`h2: ${h2s.join(' | ')}`)
    for (const want of ['What does Jobright do?', 'How much does Jobright cost?', 'Does Jobright work?', 'Is Jobright legit?', 'Jobright vs Simplify', 'Who is Jobright for?', 'Cover Me as a Jobright alternative']) {
      assert.ok(h2s.some((h) => h.includes(want)), `missing section ${want}`)
    }
    const ld = await desktop.locator('script[type="application/ld+json"]').allTextContents()
    const faq = ld.map((t) => JSON.parse(t)).find((j) => j['@type'] === 'FAQPage')
    const questions = faq.mainEntity.map((q) => q.name)
    log.push(`FAQPage: ${questions.join(' | ')}`)
    for (const q of ['Is Jobright legit?', 'How much does Jobright cost?', 'Is Jobright free?']) assert.ok(questions.includes(q))
    await shot(desktop, 1, 'jobright-review')
    await desktop.locator('h2', { hasText: 'How much does Jobright cost?' }).evaluate((el) => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 90) })
    await desktop.waitForTimeout(300)
    await shot(desktop, 2, 'cost')
    const table = desktop.locator('figure', { hasText: 'Simplify+' })
    await table.scrollIntoViewIfNeeded()
    await table.screenshot({ path: path.join(out, `${side}-3-vs-simplify.png`) })
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await mobile.goto(base + SLUG, { waitUntil: 'networkidle' })
    await shot(mobile, 4, 'mobile')
    await mobile.close()
  }

  await desktop.goto(base + '/guides', { waitUntil: 'networkidle' })
  const card = desktop.locator(`a[href="${SLUG}"]`)
  log.push(`/guides card: ${await card.count()}`)
  assert.equal(await card.count() > 0, after)
  await shot(desktop, 5, 'guides-index')

  for (const from of ['/guides/aiapply-review', '/guides/free-jobscan-alternatives']) {
    await desktop.goto(base + from, { waitUntil: 'networkidle' })
    const n = await desktop.locator(`a[href="${SLUG}"]`).count()
    log.push(`${from} links to it: ${n}`)
    assert.equal(n > 0, after)
  }

  const sitemap = await (await desktop.request.get(base + '/sitemap.xml')).text()
  const llms = await (await desktop.request.get(base + '/llms.txt')).text()
  log.push(`sitemap has it: ${sitemap.includes(SLUG)}`, `llms.txt has it: ${llms.includes(SLUG)}`)
  assert.equal(sitemap.includes(SLUG), after)
  assert.equal(llms.includes(SLUG), after)

  console.log(log.join('\n'))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
