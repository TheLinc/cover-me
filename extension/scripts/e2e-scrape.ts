// Scrapes a live posting through the built extension in a real Chrome window:
// content script snapshot -> scrape Edge Function -> bundled fallback, the path
// the unit tests can't reach.
//
//   pnpm build:local   (extension pointed at the local stack)
//   pnpm e2e:scrape https://jobs.lever.co/palantir/<id>
//
// With the local functions served, the result comes from the scrape function;
// stop them (docker stop supabase_edge_runtime_cover-me) to check the fallback.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const url = process.argv[2]
if (!url) throw new Error('Usage: pnpm e2e:scrape <posting url>')
const dist = resolve('dist')
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cover-me-e2e-')), {
  channel: 'chromium', headless: false, args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
})
try {
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
  const job = ctx.pages()[0] ?? await ctx.newPage()
  await job.goto(url, { waitUntil: 'networkidle' })
  const ext = await ctx.newPage()
  await ext.goto(`chrome-extension://${new URL(sw.url()).host}/src/popup/index.html`)
  // The worker scrapes the active tab of the focused window, so move the job
  // into its own focused window before asking, as the popup would.
  const { ms, r } = await ext.evaluate(async (jobUrl) => {
    const [tab] = await chrome.tabs.query({ url: jobUrl.split('#')[0] + '*' })
    await chrome.windows.create({ tabId: tab.id, focused: true })
    const t0 = performance.now()
    const r = await chrome.runtime.sendMessage({ type: 'SCRAPE_TAB' })
    return { ms: Math.round(performance.now() - t0), r }
  }, job.url())
  console.log(JSON.stringify({ ms, success: r.success, title: r.job?.title, company: r.job?.company, chars: r.job?.description?.length, error: r.error }))
} finally {
  await ctx.close()
}
