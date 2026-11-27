// Makes single-use gift trial links: a free week of Pro each, no card (#112).
//
//   pnpm trial-links <n> [--note "<where it was shared>"] [--days 30] [--prod]
//
// --note is stored with each code in trial_codes, so a redemption traces back
// to its batch. --days is how long an unused link works. Without --prod it
// writes to the local stack and prints localhost links; --prod asks you to
// type "prod" first.
//
// To revoke an unused link, delete its row from trial_codes (#112).

import { randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { target } from './lib.mjs'

const USAGE = 'Usage: pnpm trial-links <n> [--note "<where it was shared>"] [--days 30] [--prod]'

let args
try {
  args = parseArgs({
    allowPositionals: true,
    options: { note: { type: 'string' }, days: { type: 'string', default: '30' }, prod: { type: 'boolean', default: false } },
  })
} catch (err) {
  console.error(`${err.message}\n${USAGE}`)
  process.exit(1)
}
const count = Number(args.positionals[0])
const days = Number(args.values.days)
if (args.positionals.length !== 1 || !Number.isInteger(count) || count < 1 || count > 500 || !(days > 0)) {
  console.error(USAGE)
  process.exit(1)
}

const { apiUrl, key, site } = await target(args.values.prod, `Make ${count} gift trial link(s)`)

const expires_at = new Date(Date.now() + days * 86_400_000).toISOString()
const rows = Array.from({ length: count }, () => ({
  code: randomBytes(12).toString('base64url'),
  note: args.values.note ?? null,
  expires_at,
}))

const db = createClient(apiUrl, key, { auth: { persistSession: false } })
const { error } = await db.from('trial_codes').insert(rows)
if (error) {
  console.error(`Could not save the codes: ${error.message}`)
  process.exit(1)
}

for (const { code } of rows) console.log(`${site}/redeem/${code}`)
console.error(`\n${count} link(s), unused ones expire ${expires_at.slice(0, 10)}.`)
