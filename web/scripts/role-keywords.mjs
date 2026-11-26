// Counts resume keywords over public Greenhouse and Lever postings for each role on
// /resume-keywords and writes lib/role-keywords.json. Run by hand, not at build time (#299):
//
//   node scripts/role-keywords.mjs

import { writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'

// Node runs lib/*.ts as-is, but those files import each other without the .ts extension (#299).
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context)
    } catch (error) {
      if (!specifier.startsWith('.')) throw error
      return next(`${specifier}.ts`, context)
    }
  },
})
const { MIN_POSTINGS, ROLE_SLUGS, countKeywords, greenhouseText, leverText, roleOf } = await import('../lib/role-keywords.ts')

const GREENHOUSE = [
  'airbnb', 'stripe', 'doordashusa', 'lyft', 'pinterest', 'dropbox', 'reddit', 'robinhood', 'coinbase', 'gitlab', 'datadog',
  'cloudflare', 'twilio', 'squarespace', 'peloton', 'gusto', 'brex', 'figma', 'discord', 'duolingo', 'instacart', 'affirm',
  'chime', 'sofi', 'samsara', 'okta', 'mongodb', 'elastic', 'asana', 'glossier', 'renttherunway', 'everlane', 'seatgeek',
  'oscar', 'flatironhealth', 'ziprecruiter', 'betterment', 'klaviyo', 'zocdoc', 'salesloft', 'flexport', 'faire', 'carta',
  'justworks', 'pagerduty', 'newrelic', 'toast', 'spacex', 'flyzipline', 'misfitsmarket', 'thrivemarket', 'weee', 'shipmonk',
  'nuro', 'redwoodmaterials', 'relativity', 'astranis', 'rocketlab', 'formlabs', 'lucidmotors', 'quince', 'anthropic',
  'scaleai', 'mercury', 'gemini', 'databricks', 'epicgames', 'point72', 'purestorage', 'roblox', 'rubrik', 'verkada', 'braze',
  'celonis', 'andurilindustries',
]
const LEVER = ['spotify', 'palantir', 'zoox', 'ro', 'sysdig', 'hive', 'metabase', 'swile', 'tala']

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json()
}

async function greenhouse(company) {
  const { jobs } = await getJson(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`)
  return jobs.map((j) => ({ company, source: 'Greenhouse', title: j.title, text: greenhouseText(j.content ?? '') }))
}

async function lever(company) {
  const postings = await getJson(`https://api.lever.co/v0/postings/${company}?mode=json`)
  return postings.map((p) => ({ company, source: 'Lever', title: p.text, text: leverText(p) }))
}

const boards = await Promise.allSettled([...GREENHOUSE.map(greenhouse), ...LEVER.map(lever)])
for (const b of boards) if (b.status === 'rejected') console.warn(`skipped: ${b.reason.message}`)
const postings = boards.flatMap((b) => (b.status === 'fulfilled' ? b.value : []))

const roles = Object.fromEntries(ROLE_SLUGS.map((slug) => [slug, countKeywords(postings.filter((p) => roleOf(p.title) === slug))]))
for (const [slug, r] of Object.entries(roles)) console.log(`${slug}: ${r.postings} postings from ${r.companies} companies, ${r.keywords.length} keywords`)
const short = Object.entries(roles).filter(([, r]) => r.postings < MIN_POSTINGS)
if (short.length) {
  console.error(`Not written: under ${MIN_POSTINGS} postings for ${short.map(([slug]) => slug).join(', ')}`)
  process.exit(1)
}

const data = { fetched: new Date().toISOString().slice(0, 10), roles }
writeFileSync(new URL('../lib/role-keywords.json', import.meta.url), `${JSON.stringify(data, null, 2)}\n`)
