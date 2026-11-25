// Usage: tsx proof-374.mts <checkout> <before|after>
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
const [root, side] = process.argv.slice(2)
const { mixedTenseLines } = await import(pathToFileURL(`${root}/extension/src/lib/ai/resume-grounding.ts`).href)
const bullets = ['Built the weekly pipeline report', 'Manage the vendor list for 12 suppliers', 'Led onboarding for new hires']
const resume = { experience: [
  { title: 'Program Lead', company: 'Foundry Labs', dates: '03/22 – Present', bullets: ['Ran diagnostic workshops', 'Run a 12-week accelerator'] },
  { title: 'Analyst', company: 'Northwind', dates: '06/20 – 06/22', bullets },
  { title: 'Associate', company: 'Contoso', dates: "Mar '18 – Mar '20", bullets },
  { title: 'Intern', company: 'Fabrikam', dates: '2017-18', bullets },
] }
const flags = mixedTenseLines(resume)
console.log(`${side}: ${flags.size} flag(s)`)
resume.experience.forEach((r, i) => {
  const ids = [...flags.keys()].filter((k) => k.startsWith(`e${i}b`))
  console.log(`  ${r.dates.padEnd(18)} ${r.title.padEnd(13)} ${ids.length ? ids.map((k) => `"${r.bullets[+k.split('b')[1]]}"`).join(', ') : '(nothing flagged)'}`)
})
const expected = side === 'after' ? ['e1b1', 'e2b1', 'e3b1'] : []
assert.deepEqual([...flags.keys()], expected)
console.log(`  assert ${side}: flags = ${JSON.stringify(expected)} ✓`)
