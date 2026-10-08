// Saves one live posting per job board as a scraper test fixture.
//
//   pnpm fixtures:save            all boards
//   pnpm fixtures:save lever      one board
//
// Each board starts from a listing page that stays up, follows the first
// posting link, and saves the rendered DOM to src/content/scrapers/fixtures/.
// The scraper tests read those files; the live smoke test (scraper.smoke.test.ts)
// reuses BOARDS and fetchPosting() against today's pages.
//
// Indeed is not here: Cloudflare blocks automated browsers, headed or not, before
// the description loads. Save fixtures/indeed.html by hand from a real browser
// (DevTools > Elements > <html> > Copy outerHTML) with the URL comment on line 1.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'

export interface Board {
  name: string
  listing: string
  // First href on the listing page that matches is the posting to save.
  posting: RegExp
}

export const BOARDS: Board[] = [
  { name: 'greenhouse', listing: 'https://job-boards.greenhouse.io/anthropic', posting: /greenhouse\.io\/anthropic\/jobs\/\d+/ },
  { name: 'lever', listing: 'https://jobs.lever.co/palantir', posting: /jobs\.lever\.co\/palantir\/[0-9a-f-]{36}$/ },
  { name: 'ashby', listing: 'https://jobs.ashbyhq.com/openai', posting: /jobs\.ashbyhq\.com\/openai\/[0-9a-f-]{36}$/ },
  { name: 'workable', listing: 'https://apply.workable.com/huggingface/', posting: /apply\.workable\.com\/huggingface\/j\/[0-9A-F]+\/?$/ },
  { name: 'workday', listing: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', posting: /myworkdayjobs\.com\/(en-US\/)?NVIDIAExternalCareerSite\/job\// },
  { name: 'bamboohr', listing: 'https://pictonmahoney.bamboohr.com/careers', posting: /bamboohr\.com\/careers\/\d+/ },
  { name: 'linkedin', listing: 'https://www.linkedin.com/jobs/search?keywords=registered%20nurse&location=United%20States', posting: /linkedin\.com\/jobs\/view\/[^?]+/ },
]

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36'

// Returns the posting URL and its rendered HTML. Scripts other than JSON-LD,
// styles and media are dropped: the scrapers never read them and they are
// most of the bytes.
export async function fetchPosting(browser: Browser, board: Board): Promise<{ url: string; html: string }> {
  const page = await browser.newPage({ userAgent: UA })
  try {
    await load(page, board.listing)
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href))
    const url = hrefs.find((h) => board.posting.test(h.split('#')[0]))
    if (!url) throw new Error(`${board.name}: no posting link on ${board.listing}`)
    await load(page, url)
    const html = await page.evaluate(() => {
      const doc = document.documentElement.cloneNode(true) as HTMLElement
      doc.querySelectorAll('script:not([type="application/ld+json"]), style, link, noscript, svg, img, picture, video, iframe')
        .forEach((el) => el.remove())
      return '<!doctype html>\n' + doc.outerHTML
    })
    return { url: page.url(), html }
  } finally {
    await page.close()
  }
}

// Some boards poll forever and never reach network idle; settle for whatever
// has rendered after 15 s.
async function load(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
}

async function main() {
  const only = process.argv[2]
  const boards = only ? BOARDS.filter((b) => b.name === only) : BOARDS
  if (!boards.length) throw new Error(`unknown board "${only}"`)
  const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/content/scrapers/fixtures')
  mkdirSync(dir, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const board of boards) {
      try {
        const { url, html } = await fetchPosting(browser, board)
        // First line records where and when the page came from.
        writeFileSync(join(dir, `${board.name}.html`), `<!-- ${url} saved ${new Date().toISOString().slice(0, 10)} -->\n${html}`)
        console.log(`saved ${board.name}: ${url} (${Math.round(html.length / 1024)} KB)`)
      } catch (err) {
        console.error(`FAILED ${board.name}: ${err instanceof Error ? err.message : err}`)
      }
    }
  } finally {
    await browser.close()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
