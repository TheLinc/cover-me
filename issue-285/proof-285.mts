// Proof for #285: run the real groundSkills from one checkout on the made-up Alex Rivera resume.
// Usage: tsx proof-285.ts <checkout root> <before|after> <resume.txt> [--sonnet]
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [root, side, resumePath] = process.argv.slice(2)
const sonnet = process.argv.includes('--sonnet')
const { groundSkills } = await import(pathToFileURL(`${root}/extension/src/lib/ai/resume-grounding.ts`).href)
const resume = readFileSync(resumePath, 'utf8')
let fail = false
const expect = (ok: boolean, what: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) fail = true }

// 1. The ticket's repro: a stub model that approves nothing.
let calls = 0
const stub = async () => { calls++; return '' }
const r1 = await groundSkills([{ skill: 'Product marketing' }, { skill: 'Paid search' }, { skill: 'Webinars' }], resume, stub)
console.log(`\n[${side}] stub model that rejects every claim`)
console.log(JSON.stringify(r1), ` model calls: ${calls}`)
const kept1 = (r1.skills ?? '').split(', ')
if (side === 'before') expect(kept1.includes('Product marketing') && calls === 0, 'bug reproduces: "Product marketing" kept with no model check')
else expect(!kept1.includes('Product marketing') && calls === 1, '"Product marketing" goes to the check and is dropped')

// 2. The real checker the extension uses on Claude (Sonnet 5.5), via the eval's claude -p helper.
if (sonnet) {
  const { call } = await import(pathToFileURL(`${process.cwd()}/eval/model.ts`).href)
  const prompts: string[] = []
  const ask = async (p: string) => { prompts.push(p); return call([{ role: 'user', content: p }], { model: 'claude-sonnet-5-5', maxTokens: 1000, label: 'claim-check' }) }
  const r2 = await groundSkills([{ skill: 'Product marketing' }, { skill: 'Analytics (Google)' }, { skill: 'Campaign strategy' }], resume, ask)
  console.log(`\n[${side}] real Sonnet 5.5 claim check`)
  console.log(prompts.length ? prompts[0].slice(prompts[0].indexOf('PAIRS:')) : '(no model call)')
  console.log(JSON.stringify(r2))
  const kept2 = (r2.skills ?? '').split(', ')
  if (side === 'before') expect(kept2.includes('Product marketing'), 'bug reproduces: "Product marketing" kept')
  else expect(!kept2.includes('Product marketing') && kept2.includes('Analytics (Google)') && kept2.includes('Campaign strategy'), '"Product marketing" dropped; the reorder "Analytics (Google)" and verbatim "Campaign strategy" kept')
}
process.exit(fail ? 1 : 0)
