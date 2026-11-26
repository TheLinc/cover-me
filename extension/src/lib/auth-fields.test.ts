import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Without X-Resume-Fields these functions fold the new resume fields into the
// old ones, so a call that forgets it gets a parse the renderers misread (#190).
test('every call to the resume, tailor and applications functions asks for the new fields', () => {
  const source = readFileSync(new URL('./auth.ts', import.meta.url), 'utf8')
  const calls = [...source.matchAll(/fetch\(`\$\{SUPABASE_URL\}\/functions\/v1\/(?:resume|tailor|applications)\b[\s\S]*?\n {2}\}\)/g)].map((m) => m[0])
  expect(calls.length).toBeGreaterThanOrEqual(10)
  for (const call of calls) expect(call, call.split('\n')[0]).toContain('...RESUME_FIELDS')
})
