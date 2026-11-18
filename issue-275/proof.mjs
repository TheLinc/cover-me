// Proof for #275: run against master (BEFORE) and the branch (AFTER), both `next build` + `next start`.
// node proof.mjs http://localhost:3176 http://localhost:3177 <outdir>
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(process.env.PW_FROM ?? import.meta.url)
const { chromium } = require('playwright')

const [BEFORE, AFTER, OUT = '.'] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'chrome' })

async function shoot(base, label, width, height) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(`${base}/guides`, { waitUntil: 'load' })
  await page.evaluate(() => Promise.all([...document.images].filter((i) => i.loading !== 'lazy').map((i) => i.decode().catch(() => {}))))
  await page.screenshot({ path: `${OUT}/${label}-${width}.png` })
  const info = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    imgs: [...document.querySelectorAll('main img')].map((i) => ({ alt: i.alt, href: i.closest('a')?.getAttribute('href') })),
    titles: [...document.querySelectorAll('main h2')].map((h) => h.textContent),
    h1Font: getComputedStyle(document.querySelector('main h1')).fontFamily,
    h2Font: getComputedStyle(document.querySelector('main h2')).fontFamily,
  }))
  await page.close()
  return info
}

const jsonLd = async (url) => {
  const html = await (await fetch(url)).text()
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => m[1])
}

const before = await shoot(BEFORE, 'before', 1440, 900)
const after = await shoot(AFTER, 'after', 1440, 900)
const after390 = await shoot(AFTER, 'after', 390, 844)
await shoot(BEFORE, 'before', 390, 844)

// Before: the plain text list, oldest first, no images.
assert.equal(before.imgs.length, 0)
assert.equal(before.titles[0], 'What is an ATS score?')

// After: a card with a hero image for every guide, serif titles, newest first.
assert.equal(after.titles.length, 11)
assert.equal(after.imgs.length, 11)
assert.equal(after.titles[0], 'Free Jobscan alternatives: 6 resume checkers compared')
assert.ok(after.titles.slice(-3).includes('What is an ATS score?'))
assert.match(after.h1Font, /Source Serif 4/)
assert.match(after.h2Font, /Source Serif 4/)
assert.deepEqual([...after.titles].sort(), [...before.titles].sort())
console.log('order after:', after.titles)

// 390 px: nothing overflows sideways.
assert.ok(after390.scrollWidth <= after390.innerWidth, `overflow ${after390.scrollWidth} > ${after390.innerWidth}`)
console.log(`390px scrollWidth ${after390.scrollWidth} <= innerWidth ${after390.innerWidth}`)

// BreadcrumbList JSON-LD on /guides is byte-identical.
const [bIndex, aIndex] = [await jsonLd(`${BEFORE}/guides`), await jsonLd(`${AFTER}/guides`)]
assert.deepEqual(aIndex, bIndex)
assert.ok(aIndex.some((s) => s.includes(`"@type":"BreadcrumbList"`)))
console.log('/guides JSON-LD identical:', aIndex.length, 'block(s)')

// Each guide page: every JSON-LD block byte-identical, and the card's alt matches the page hero's alt.
for (const { href, alt } of after.imgs) {
  const [b, a] = [await jsonLd(`${BEFORE}${href}`), await jsonLd(`${AFTER}${href}`)]
  assert.deepEqual(a, b, `${href} JSON-LD differs`)
  assert.ok(a.some((s) => s.includes('"@type":"Article"')), `${href} has no Article JSON-LD`)
  const guidePage = await browser.newPage()
  await guidePage.goto(`${BEFORE}${href}`, { waitUntil: 'load' })
  const heroAlt = await guidePage.locator('article > img').first().getAttribute('alt')
  await guidePage.close()
  assert.equal(alt, heroAlt, `${href} alt differs from the master hero alt`)
  console.log(`${href}: ${a.length} JSON-LD blocks identical, alt matches master hero`)
}

await browser.close()
console.log('PROOF PASSED')
