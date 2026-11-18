// Proof for #268: node proof.mjs <beforeUrl> <afterUrl> [slug...]
// Captures every guide at 1440 and 390 on both versions and asserts the ticket's
// acceptance criteria on "after" (and their absence on "before").
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const [BEFORE, AFTER, ...only] = process.argv.slice(2)
const SLUGS = only.length ? only : [
  'what-is-an-ats-score', 'cover-me-vs-chatgpt', 'tailor-resume-to-job-description', 'cover-me-vs-aiapply',
  'cover-me-vs-jobscan', 'cover-me-vs-teal', 'use-your-own-api-key-for-cover-letters', 'ats-friendly-resume-format',
  'cover-me-vs-rezi', 'tailor-resume-in-word', 'free-jobscan-alternatives',
]
mkdirSync('shots', { recursive: true })

const ldJson = async (base, slug) => {
  const html = await (await fetch(`${base}/guides/${slug}`)).text()
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => m[1])
}

// WCAG relative luminance contrast of two rgb() strings.
const lum = (rgb) => {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const norm = (s) => s.replace(/\s+/g, ' ').trim()
const browser = await chromium.launch()
const results = []
let failed = 0

for (const slug of SLUGS) {
  const r = { slug, errors: [] }
  const check = (cond, msg) => { if (!cond) r.errors.push(msg) }
  try {
    // JSON-LD byte for byte.
    const [ldB, ldA] = await Promise.all([ldJson(BEFORE, slug), ldJson(AFTER, slug)])
    check(ldB.length >= 3 && JSON.stringify(ldB) === JSON.stringify(ldA), 'JSON-LD differs from master')

    const texts = {}
    for (const [label, base] of [['before', BEFORE], ['after', AFTER]]) {
      for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 900 : 844 } })
        await page.goto(`${base}/guides/${slug}`, { waitUntil: 'networkidle' })
        await page.screenshot({ path: `shots/${label}-${slug}-${width}.png` })
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
        if (label === 'after') check(overflow <= 0, `${width}px: page overflows sideways by ${overflow}px`)

        if (width === 1440) {
          texts[label] = await page.locator('main').innerText()
          const state = await page.evaluate(() => ({
            sticky: document.querySelector('nav[aria-label=Contents]')?.closest('aside') && getComputedStyle(document.querySelector('aside nav[aria-label=Contents]')).position,
            h2NoId: [...document.querySelectorAll('main h2')].filter((h) => !h.id).map((h) => h.textContent),
            tocIds: [...document.querySelectorAll('aside nav[aria-label=Contents] a')].map((a) => a.getAttribute('href').slice(1)),
            figures: document.querySelectorAll('.guide-prose section figure figcaption').length,
            body: getComputedStyle(document.querySelector('.guide-prose section p') ?? document.querySelector('article p')).color,
            bg: getComputedStyle(document.body).backgroundColor,
            bodySize: parseFloat(getComputedStyle(document.querySelector('.guide-prose section p') ?? document.querySelector('article p')).fontSize),
            oldClass: !!document.querySelector('.text-\\[15\\.5px\\].text-muted-foreground'),
          }))
          if (label === 'before') {
            check(!state.sticky && state.oldClass, 'before: expected the old layout')
          } else {
            check(state.sticky === 'sticky', 'no sticky contents list at 1440')
            check(state.h2NoId.length === 0, `H2s without id: ${state.h2NoId.join(' | ')}`)
            check(state.tocIds.length >= 3, `contents list has ${state.tocIds.length} entries`)
            check(state.figures >= 1, 'no captioned figure inside a section')
            check(contrast(state.body, state.bg) >= 4.5, `body contrast ${contrast(state.body, state.bg).toFixed(2)} below AA`)
            check(state.bodySize >= 17, `body text ${state.bodySize}px`)
            check(!state.oldClass, 'old article classes still present')
            // Every contents entry points at an H2, and scrolling to it marks it current.
            for (const id of state.tocIds) {
              const ok = await page.evaluate((i) => document.getElementById(i)?.tagName === 'H2', id)
              check(ok, `contents link #${id} has no H2`)
            }
            const target = state.tocIds[Math.min(2, state.tocIds.length - 2)]
            await page.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: 'instant' }), target)
            await page.waitForTimeout(500)
            const current = await page.locator('aside [aria-current=location]').getAttribute('href').catch(() => null)
            check(current === `#${target}`, `scrolled to #${target}, contents marks ${current}`)
            await page.screenshot({ path: `shots/after-${slug}-1440-section.png` })
            // Deep link lands below the 64px sticky nav.
            const deep = await browser.newPage({ viewport: { width, height: 900 } })
            await deep.goto(`${base}/guides/${slug}#${state.tocIds[0]}`, { waitUntil: 'networkidle' })
            await deep.waitForTimeout(1500)
            const top = await deep.evaluate((i) => document.getElementById(i).getBoundingClientRect().top, state.tocIds[0])
            await deep.close()
            check(top >= 64 && top < 160, `#${state.tocIds[0]} lands at ${Math.round(top)}px`)
          }
        } else if (label === 'after') {
          const phone = await page.evaluate(() => ({
            stickyShown: !!document.querySelector('aside')?.checkVisibility(),
            trigger: [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Contents' && b.checkVisibility()),
          }))
          check(!phone.stickyShown && phone.trigger, '390px: expected the collapsed contents list, not the sticky one')
          const fig = page.locator('.guide-prose section figure').first()
          await fig.scrollIntoViewIfNeeded()
          await page.waitForTimeout(300)
          await page.screenshot({ path: `shots/after-${slug}-390-figure.png` })
        }
        await page.close()
      }
    }

    // No words lost: every line of master's main text is still on the page.
    const after = norm(texts.after)
    const skip = /^(Updated|Published) .* · Lincoln Laylor$/
    const missing = texts.before.split('\n').map(norm).filter((l) => l && !skip.test(l) && !after.includes(l))
    check(missing.length === 0, `text missing from after:\n    ${missing.join('\n    ')}`)
  } catch (e) {
    r.errors.push(String(e))
  }
  failed += r.errors.length ? 1 : 0
  results.push(r)
  console.log(`${r.errors.length ? 'FAIL' : 'ok  '} ${slug}${r.errors.map((e) => `\n  - ${e}`).join('')}`)
}

await browser.close()
writeFileSync('results.json', JSON.stringify(results, null, 2))
assert.equal(failed, 0, `${failed} guide(s) failed`)
