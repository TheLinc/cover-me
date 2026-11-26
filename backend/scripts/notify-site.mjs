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
const host = args.positionals[0]?.toLowerCase()
if (args.positionals.length !== 1) {
  console.error(USAGE)
  process.exit(1)
}

const { apiUrl, key } = await target(args.values.prod, `Email everyone waiting on ${host}`)
const res = await fetch(`${apiUrl}/functions/v1/site-watch`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ host }),
})
const body = await res.json().catch(() => ({}))
if (!res.ok) {
  console.error(`site-watch answered ${res.status}: ${body.error ?? 'no details'}`)
  process.exit(1)
}
console.log(`${host}: sent ${body.sent}, failed ${body.failed}.`)
if (body.failed) process.exit(1)
