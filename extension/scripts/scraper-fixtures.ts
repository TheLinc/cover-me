// Saves one live posting per job board as a scraper test fixture.
//
//   pnpm fixtures:save            all boards
//   pnpm fixtures:save lever      one board
//
// Each board starts from a listing page that stays up, follows the first
// posting link, and saves the rendered DOM to src/content/scrapers/fixtures/.
// The scraper tests read those files; the live smoke test (scrapers.test.ts)
// reuses BOARDS and fetchPosting() against today's pages.
//
// Indeed's bot check blocks headless browsers, and sends the second page load in
// a session to a sign-in page, but passes the first load in a visible Chrome
// window with a fresh profile. So each Indeed page opens in its own new window
// (Chrome must be installed). After a few visits it blocks the IP for a while
// regardless, so the live smoke test skips Indeed.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'

export interface Board {
  name: string
  listing: string
  // First href on the listing page that matches is the posting to save.
  // Omitted: save the listing itself (a split-pane search page).
  posting?: RegExp
  // Turns the matched link into the URL to open.
  rewrite?: (href: string) => string
  // Wait for this selector before saving (content that renders late).
  ready?: string
  // Needs a visible Chrome window (Cloudflare); skipped in CI.
  headed?: true
}

export const BOARDS: Board[] = [
  { name: 'greenhouse', listing: 'https://job-boards.greenhouse.io/anthropic', posting: /greenhouse\.io\/anthropic\/jobs\/\d+/ },
  { name: 'lever', listing: 'https://jobs.lever.co/palantir', posting: /jobs\.lever\.co\/palantir\/[0-9a-f-]{36}$/ },
  { name: 'ashby', listing: 'https://jobs.ashbyhq.com/openai', posting: /jobs\.ashbyhq\.com\/openai\/[0-9a-f-]{36}$/ },
  { name: 'workable', listing: 'https://apply.workable.com/huggingface/', posting: /apply\.workable\.com\/huggingface\/j\/[0-9A-F]+\/?$/ },
  { name: 'workday', listing: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', posting: /myworkdayjobs\.com\/(en-US\/)?NVIDIAExternalCareerSite\/job\// },
  { name: 'bamboohr', listing: 'https://pictonmahoney.bamboohr.com/careers', posting: /bamboohr\.com\/careers\/\d+/ },
  { name: 'linkedin', listing: 'https://www.linkedin.com/jobs/search?keywords=registered%20nurse&location=United%20States', posting: /linkedin\.com\/jobs\/view\/[^?]+/ },
  { name: 'indeed', listing: 'https://www.indeed.com/jobs?q=welder', posting: /indeed\.com\/rc\/clk\?jk=/,
    // The /rc/clk tracking redirect trips Cloudflare; the direct page doesn't.
    rewrite: (href) => `https://www.indeed.com/viewjob?jk=${new URL(href).searchParams.get('jk')}`, ready: '[data-testid="vj-job-description-heading"]', headed: true },
  // Search results with the first job open in the right-hand pane
  { name: 'indeed-search', listing: 'https://www.indeed.com/jobs?q=welder', ready: '[data-testid="vj-job-description-heading"]', headed: true },
]

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36'

// Returns the posting URL and its rendered HTML. Scripts other than JSON-LD,
// styles and media are dropped: the scrapers never read them and they are
// most of the bytes.
export async function fetchPosting(browser: Browsers, board: Board): Promise<{ url: string; html: string }> {
  const open = () => board.headed ? browser.headed() : browser.headless.newPage({ userAgent: UA })
  let page = await open()
  try {
    await load(page, board.listing)
    if (board.posting) {
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href))
      const url = hrefs.find((h) => board.posting!.test(h.split('#')[0]))
      if (!url) throw new Error(`${board.name}: no posting link on ${board.listing}`)
      if (board.headed) {
        await page.close()
        page = await open()
      }
      await load(page, board.rewrite ? board.rewrite(url) : url)
    }
    if (board.ready) await page.waitForSelector(board.ready, { timeout: 30_000 })
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

export interface Browsers {
  headless: Browser
  // A page in a new Chrome window with a fresh profile; closing the page closes the window.
  headed: () => Promise<Page>
  close: () => Promise<void>
}

export async function launchBrowsers(): Promise<Browsers> {
  const headless = await chromium.launch()
  return {
    headless,
    headed: async () => {
      const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cover-me-fixtures-')), { channel: 'chrome', headless: false })
      const page = ctx.pages()[0] ?? await ctx.newPage()
      page.on('close', () => void ctx.close())
      return page
    },
    close: () => headless.close(),
  }
}

async function main() {
  const only = process.argv[2]
  const boards = only ? BOARDS.filter((b) => b.name === only) : BOARDS
  if (!boards.length) throw new Error(`unknown board "${only}"`)
  const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/content/scrapers/fixtures')
  mkdirSync(dir, { recursive: true })
  const browser = await launchBrowsers()
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
