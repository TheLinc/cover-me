// Emails everyone who ticked "Email me when Cover Me reads this site" for a
// host, then deletes their requests (#195).
//
//   pnpm notify-site <host> [--prod]
//
// Run it once the store build that reads the site is live. Without --prod it
// calls the local stack (`pnpm functions:serve` must be running); --prod asks
// you to type "prod" first. A send Resend refused stays for the next run.

import { parseArgs } from 'node:util'
import { target } from './lib.mjs'

const USAGE = 'Usage: pnpm notify-site <host> [--prod]'

const args = parseArgs({ allowPositionals: true, options: { prod: { type: 'boolean', default: false } } })
// Requests are stored the way the popup sends them: bare hostname, no www. (#195).
const host = args.positionals[0]?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]
if (args.positionals.length !== 1) {
  console.error(USAGE)
  process.exit(1)
}

const { apiUrl, key } = await target(args.values.prod, `Email everyone waiting on ${host}`)
const res = await fetch(`${apiUrl}/functions/v1/site-watch`, {
  method: 'POST',
  headers: { apikey: key, 'X-Service-Key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ host }),
})
const body = await res.json().catch(() => ({}))
if (!res.ok) {
  console.error(`site-watch answered ${res.status}: ${body.error ?? 'no details'}`)
  process.exit(1)
}
console.log(body.sent + body.failed ? `${host}: sent ${body.sent}, failed ${body.failed}.` : `Nobody is waiting on ${host}. Check the spelling, or that no one asked.`)
if (body.failed) process.exit(1)
