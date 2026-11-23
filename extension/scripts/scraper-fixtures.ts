//   pnpm fixtures:save            all boards
//   pnpm fixtures:save lever      one board
//
// Each board starts from a listing page that stays up, since postings close (#2).
//
// Indeed's bot check blocks headless browsers, and sends the second page load in
// a session to a sign-in page, but passes the first load in a visible Chrome
// window with a fresh profile. So each Indeed page opens in its own new window
// (Chrome must be installed). After a few visits it blocks the IP for a while
// regardless, so the live smoke test skips Indeed (#2).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'
import { transformWithEsbuild } from 'vite'
import type { PageSnapshot } from '../src/content/snapshot.ts'

export interface Board {
  name: string
  listing: string
  posting?: RegExp
  rewrite?: (href: string) => string
  ready?: string
  // Needs a visible Chrome window (Cloudflare); skipped in CI (#2)
  headed?: true
}

export const BOARDS: Board[] = [
  { name: 'greenhouse', listing: 'https://job-boards.greenhouse.io/anthropic', posting: /greenhouse\.io\/anthropic\/jobs\/\d+/ },
  { name: 'lever', listing: 'https://jobs.lever.co/palantir', posting: /jobs\.lever\.co\/palantir\/[0-9a-f-]{36}$/ },
  { name: 'lever-apply', listing: 'https://jobs.lever.co/palantir', posting: /jobs\.lever\.co\/palantir\/[0-9a-f-]{36}$/, rewrite: (href) => `${href}/apply` },
  { name: 'ashby', listing: 'https://jobs.ashbyhq.com/openai', posting: /jobs\.ashbyhq\.com\/openai\/[0-9a-f-]{36}$/ },
  { name: 'workable', listing: 'https://apply.workable.com/huggingface/', posting: /apply\.workable\.com\/huggingface\/j\/[0-9A-F]+\/?$/ },
  { name: 'workday', listing: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', posting: /myworkdayjobs\.com\/(en-US\/)?NVIDIAExternalCareerSite\/job\// },
  { name: 'bamboohr', listing: 'https://pictonmahoney.bamboohr.com/careers', posting: /bamboohr\.com\/careers\/\d+/ },
  { name: 'linkedin', listing: 'https://www.linkedin.com/jobs/search?keywords=registered%20nurse&location=United%20States', posting: /linkedin\.com\/jobs\/view\/[^?]+/ },
  // Terminal's public posting pages: its app's job list is behind sign-in (#5)
  { name: 'terminal', listing: 'https://www.terminal.io/engineers/job-openings/canada', posting: /terminal\.io\/engineers\/job-openings\/canada\/[a-z]+\/[^/]+\/\d+\// },
  // No dedicated scraper: the generic one covers SmartRecruiters from its microdata (#5)
  { name: 'smartrecruiters', listing: 'https://jobs.smartrecruiters.com/Equinox', posting: /jobs\.smartrecruiters\.com\/Equinox\/\d+-/ },
  { name: 'indeed', listing: 'https://www.indeed.com/jobs?q=welder', posting: /indeed\.com\/rc\/clk\?jk=/,
    // The /rc/clk tracking redirect trips Cloudflare; the direct page doesn't (#2)
    rewrite: (href) => `https://www.indeed.com/viewjob?jk=${new URL(href).searchParams.get('jk')}`, ready: '[data-testid="vj-job-description-heading"]', headed: true },
  { name: 'indeed-search', listing: 'https://www.indeed.com/jobs?q=welder', ready: '[data-testid="vj-job-description-heading"]', headed: true },
  // Company career sites that name the employer only in the tab title (#200)
  { name: 'apple', listing: 'https://jobs.apple.com/en-us/search?location=united-states-USA', posting: /jobs\.apple\.com\/en-us\/details\/\d+/ },
  { name: 'amazon', listing: 'https://www.amazon.jobs/en/search?base_query=software+engineer', posting: /amazon\.jobs\/en\/jobs\/\d+/ },
  { name: 'google-careers', listing: 'https://www.google.com/about/careers/applications/jobs/results/', posting: /careers\/applications\/jobs\/results\/\d+-/ },
  // A jobs-count banner <h1> ("20 jobs on the Python Job Board") above the posting's own (#73)
  { name: 'python', listing: 'https://www.python.org/jobs/', posting: /python\.org\/jobs\/\d+\/$/ },
  { name: 'phenom', listing: 'https://careers.humana.com/us/en/search-results', posting: /careers\.humana\.com\/us\/en\/job\// },
]

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36'

// The content script's own code, compiled so it runs in the page exactly as
// the extension does (#2, #325).
const compile = async (file: string, globalName: string) => (await transformWithEsbuild(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/content', file), 'utf8'),
  file,
  { format: 'iife', globalName },
)).code
const SNAPSHOT_JS = await compile('snapshot.ts', '__coverMeSnapshot')
const LEVER_APPLY_JS = await compile('lever-apply.ts', '__coverMeLeverApply')

export async function takeSnapshot(page: Page): Promise<PageSnapshot> {
  // A string, not a function: evaluate runs it over CDP, so page CSP doesn't apply (#2)
  await page.evaluate(`${LEVER_APPLY_JS}; __coverMeLeverApply.addLeverPostingJsonLd()`)
  const snapshot = await page.evaluate(`${SNAPSHOT_JS}; __coverMeSnapshot.snapshotPage()`) as PageSnapshot | null
  if (!snapshot) throw new Error(`snapshotPage() returned null on ${page.url()} (page too large?)`)
  return snapshot
}

export async function fetchPosting(browser: Browsers, board: Board): Promise<PageSnapshot> {
  // bypassCSP: takeSnapshot runs in the page's own world, where Google's
  // careers page enforces Trusted Types and blocks the snapshot's parser (#2).
  const open = () => board.headed ? browser.headed() : browser.headless.newPage({ userAgent: UA, bypassCSP: true })
  let page = await open()
  try {
    await load(page, board.listing)
    if (board.posting) {
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href))
      const url = hrefs.find((h) => board.posting!.test(h.split('#')[0]))
      if (!url) throw new Error(`${board.name}: no posting link on ${board.listing} (landed on ${page.url()}, title "${await page.title().catch(() => '?')}", ${hrefs.length} links)`)
      if (board.headed) {
        await page.close()
        page = await open()
      }
      await load(page, board.rewrite ? board.rewrite(url) : url)
    }
    if (board.ready) await page.waitForSelector(board.ready, { timeout: 30_000 })
    return await takeSnapshot(page)
  } finally {
    await page.close()
  }
}

// Some boards poll forever and never reach network idle; settle for whatever
// has rendered after 15 s. LinkedIn answers a share of signed-out loads at
// random with a 429 (an empty page) or a redirect to /authwall; loading the
// page again after a pause usually gets through (#2).
async function load(page: Page, url: string) {
  for (let attempt = 1; ; attempt++) {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    const blocked = res?.status() === 429 || new URL(page.url()).pathname.startsWith('/authwall')
    if (!blocked) return
    if (attempt === 4) throw new Error(`blocked (HTTP ${res?.status()}) at ${page.url()} after 4 loads`)
    await page.waitForTimeout(2_000 * attempt)
  }
}

export interface Browsers {
  headless: Browser
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
