// Gathers a site's real look before any design work: screenshots, fonts, colors, tokens, copy, logo candidates.
//   node capture-site.mjs https://example.com [more urls...]  → assets/site/<host-path>/ (PNGs + site.json)
// Desktop slices are desktop-00.png (the top) onward, at most 12 screens down the page.
// Read site.json and LOOK at the screenshots, then write docs/brand_notes.md from both.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const urls = process.argv.slice(2)
if (!urls.length) throw new Error('usage: node capture-site.mjs <url> [url...]')
const browser = await chromium.launch()

try {
  for (const url of urls) {
    const slug = new URL(url).host.replace(/:/g, "_") + new URL(url).pathname.replace(/\/+$/, '').replace(/[^\w.-]+/g, '_')
    const dir = join('assets', 'site', slug)
    mkdirSync(dir, { recursive: true })

    const desk = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    await desk.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    await desk.evaluate(() => document.fonts.ready)
    // Viewport slices, scrolling as a visitor would, so scroll-triggered content (count-ups, reveals) has run.
    // A single full-page shot is too tall to read.
    for (let i = 0; i < 12; i++) {
      // behavior 'instant' overrides scroll-behavior: smooth, which would leave scrollY behind.
      const more = await desk.evaluate((i) => {
        const top = i * innerHeight * 0.9
        scrollTo({ top, behavior: 'instant' })
        return top < document.documentElement.scrollHeight - innerHeight * 0.5
      }, i)
      if (!more) break
      await desk.waitForTimeout(1200)
      await desk.screenshot({ path: join(dir, `desktop-${String(i).padStart(2, '0')}.png`) })
    }
    await desk.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))

    const data = await desk.evaluate(() => {
      const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
      const text = (sel, n) => [...document.querySelectorAll(sel)].filter(visible).map((e) => e.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, n)
      const style = (sel) => {
        const e = [...document.querySelectorAll(sel)].find(visible)
        if (!e) return null
        const c = getComputedStyle(e)
        return { fontFamily: c.fontFamily, fontSize: c.fontSize, fontWeight: c.fontWeight, letterSpacing: c.letterSpacing,
          lineHeight: c.lineHeight, color: c.color, background: c.backgroundColor, borderRadius: c.borderRadius }
      }
      // Colors weighted by painted area, so the palette reflects what a viewer actually sees.
      const area = {}
      for (const e of document.querySelectorAll('body *')) {
        if (!visible(e)) continue
        const r = e.getBoundingClientRect(), c = getComputedStyle(e)
        const a = Math.min(r.width * r.height, 1440 * 900)
        if (c.backgroundColor !== 'rgba(0, 0, 0, 0)') area[c.backgroundColor] = (area[c.backgroundColor] ?? 0) + a
        if (e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) area['text ' + c.color] = (area['text ' + c.color] ?? 0) + a / 4
      }
      const tokens = {}
      for (const sheet of document.styleSheets) {
        let rules
        try { rules = sheet.cssRules } catch { continue } // cross-origin sheet
        for (const r of rules) if (r.selectorText === ':root' || r.selectorText === 'html') {
          for (const p of r.style) if (p.startsWith('--')) tokens[p] = r.style.getPropertyValue(p).trim()
        }
      }
      const fontFaces = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`)
      const logos = [...document.querySelectorAll('header img, header svg, a[href="/"] img, a[href="/"] svg, [class*="logo" i], [alt*="logo" i], link[rel*="icon"]')]
        .slice(0, 12).map((e) => e.outerHTML.slice(0, 400))
      const meta = (n) => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.content ?? null
      return {
        url: location.href, title: document.title, description: meta('description'), ogImage: meta('og:image'),
        headings: { h1: text('h1', 5), h2: text('h2', 20), h3: text('h3', 30) },
        ctas: text('a[class*="button" i], a[class*="btn" i], button', 20),
        type: { h1: style('h1'), h2: style('h2'), body: style('p'), button: style('button, a[class*="button" i]') },
        palette: Object.entries(area).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([c, a]) => ({ color: c, weight: Math.round(a) })),
        tokens, fontFaces, logos,
      }
    })
    writeFileSync(join(dir, 'site.json'), JSON.stringify(data, null, 1))
    await desk.close()

    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true })
    await phone.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    await phone.screenshot({ path: join(dir, 'phone-top.png') })
    await phone.close()
    console.log(`${url} → ${dir}`)
  }
} finally {
  await browser.close()
}
