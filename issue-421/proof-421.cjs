// Usage: node proof-421.cjs <before|after> <base url> <out dir>
const { chromium } = require(process.env.PLAYWRIGHT ?? 'playwright')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

const [mode, url, out] = process.argv.slice(2)
const after = mode === 'after'
const ORG_ID = 'https://www.cover-me.dev/#organization'
const lines = []
const log = (s) => { lines.push(s); console.log(s) }

const jsonLd = (page) => page.$$eval('script[type="application/ld+json"]', (els) => els.flatMap((e) => [].concat(JSON.parse(e.textContent))))
const byType = (all, type) => all.find((x) => x['@type'] === type)
const firstSentence = (s) => s.split('. ')[0]

;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  await page.goto(`${url}/`, { waitUntil: 'domcontentloaded' })
  const home = await jsonLd(page)
  const org = byType(home, 'Organization')
  const site = byType(home, 'WebSite')
  const app = byType(home, 'SoftwareApplication')
  log(`Organization @id: ${org['@id'] ?? '(none)'}`)
  log(`WebSite publisher: ${JSON.stringify(site.publisher ?? null)}`)
  log(`WebSite description: ${site.description}`)
  log(`SoftwareApplication publisher: ${JSON.stringify(app.publisher ?? null)}`)
  log(`SoftwareApplication description: ${app.description}`)
  log(`keywords: ${await page.getAttribute('meta[name="keywords"]', 'content')}`)

  await page.goto(`${url}/about`, { waitUntil: 'domcontentloaded' })
  const aboutTitle = await page.title()
  const aboutIntro = await page.locator('main p').nth(1).innerText()
  log(`/about title: ${aboutTitle}`)
  log(`/about intro: ${aboutIntro}`)
  await page.locator('main > div').first().screenshot({ path: path.join(out, `${mode}-1-about-intro.png`) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('main > div').first().screenshot({ path: path.join(out, `${mode}-2-about-intro-mobile.png`) })
  await page.setViewportSize({ width: 1280, height: 900 })

  await page.goto(`${url}/guides/cover-me-vs-chatgpt`, { waitUntil: 'domcontentloaded' })
  const article = byType(await jsonLd(page), 'Article')
  log(`guide Article publisher @id: ${article.publisher['@id'] ?? '(none)'}`)

  const llms = await (await page.request.get(`${url}/llms.txt`)).text()
  const stray = llms.slice(llms.indexOf('\n## ')).split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('## ') && !l.startsWith('- ['))
  log(`llms.txt non-link lines under H2 headings: ${stray.length}`)
  const facts = llms.split(/\r?\n/).filter((l) => l.startsWith('- ') && !l.startsWith('- ['))
  log(`llms.txt last key fact: ${facts.at(-1).slice(0, 80)}`)

  await browser.close()
  fs.writeFileSync(path.join(out, `${mode}.txt`), lines.join('\n') + '\n')

  if (after) {
    assert.equal(org['@id'], ORG_ID)
    assert.equal(site.publisher['@id'], ORG_ID)
    assert.equal(app.publisher['@id'], ORG_ID)
    assert.equal(article.publisher['@id'], ORG_ID)
    for (const d of [site.description, app.description]) assert.doesNotMatch(firstSentence(d), /open.source|api key/i)
    assert.ok(!aboutTitle.startsWith('About Cover Me: Open-Source'))
    assert.doesNotMatch(firstSentence(aboutIntro), /open.source/i)
    assert.equal(stray.length, 0)
  } else {
    assert.equal(org['@id'], undefined)
    assert.match(firstSentence(site.description), /open-source/)
    assert.ok(aboutTitle.startsWith('About Cover Me: Open-Source'))
    assert.ok(stray.length > 0)
  }
  console.log(`${mode}: all assertions passed`)
})().catch((e) => { console.error(e); process.exit(1) })
