// Makes single-use gift trial links: a free week of Pro each, no card (#112).
//
//   pnpm trial-links <n> [--note "<where it was shared>"] [--days 30] [--prod]
//
// --note is stored with each code and sent with PostHog's trial_redeemed
// event, so a redemption traces back to its batch. --days is how long an
// unused link works. Without --prod it writes to the local stack and prints
// localhost links; --prod asks you to type "prod" first.
//
// Revoke an unused link by deleting its row from trial_codes.

import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { localStatus, PROD_REF, serviceKey, supabase } from './lib.mjs'

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

let apiUrl, key, site
if (args.values.prod) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`Make ${count} gift trial link(s) in PRODUCTION (CoverMe, ${PROD_REF})? Type "prod" to continue: `)
  rl.close()
  if (answer.trim() !== 'prod') {
    console.log('Cancelled.')
    process.exit(1)
  }
  // Your `supabase login`, the same as deploy:prod. stdin 'ignore': see deploy.mjs.
  const res = supabase(['projects', 'api-keys', '--project-ref', PROD_REF, '--reveal', '-o', 'json'], { stdio: ['ignore', 'pipe', 'inherit'] })
  const secret = res.status === 0 ? JSON.parse(res.stdout).find((k) => k.type === 'secret') : null
  if (!secret) {
    console.error('Could not read the production secret key. Run `supabase login` and try again.')
    process.exit(1)
  }
  apiUrl = `https://${PROD_REF}.supabase.co`
  key = secret.api_key
  site = 'https://www.cover-me.dev'
} else {
  const status = localStatus()
  apiUrl = status.API_URL
  key = serviceKey(status)
  site = 'http://localhost:3100'
}

// 16 base64url characters, 96 random bits: not guessable.
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
