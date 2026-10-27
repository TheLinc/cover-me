// Tells Bing (and the other IndexNow engines) which pages changed, so ChatGPT
// search, which reads Bing's index, sees new content within days.
// Runs from .github/workflows/indexnow.yml after each production deploy.
//
//   node scripts/indexnow.mjs          pages whose sitemap lastmod is in the last 7 days
//   node scripts/indexnow.mjs --all    every page in the sitemap
//
// The key is public by design: engines confirm it by fetching /<key>.txt.

import { pathToFileURL } from 'node:url'

const SITE = process.env.SITE_URL ?? 'https://www.cover-me.dev'
const KEY = 'c33bab843e1cd208dba82da4c2cd4073'
const WINDOW_DAYS = 7

// ponytail: no record of what was sent last time, so a page edited this week is
// resubmitted on every deploy for 7 days. Engines accept repeats; keep state if that changes.
export function changedUrls(xml, { all = false, now = new Date() } = {}) {
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10)
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(([, entry]) => ({
      loc: entry.match(/<loc>(.*?)<\/loc>/)?.[1],
      lastmod: entry.match(/<lastmod>(.*?)<\/lastmod>/)?.[1] ?? '',
    }))
    .filter((u) => u.loc && (all || u.lastmod.slice(0, 10) >= since))
    .map((u) => u.loc)
}

async function main() {
  const res = await fetch(`${SITE}/sitemap.xml`)
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`)
  const urlList = changedUrls(await res.text(), { all: process.argv.includes('--all') })
  if (!urlList.length) return console.log('No pages changed in the last 7 days, nothing to submit.')

  const submit = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
  })
  // 200 and 202 both mean accepted; 202 is returned while the key is still being checked.
  if (submit.status !== 200 && submit.status !== 202) {
    throw new Error(`IndexNow rejected the submission: ${submit.status} ${await submit.text()}`)
  }
  console.log(`Submitted ${urlList.length} URL(s) to IndexNow (${submit.status}):\n${urlList.join('\n')}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
