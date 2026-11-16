import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLAN_LIMITS } from './limits'

// The site's plan copy reads PLAN_LIMITS. The database decides the real
// numbers in generation_limits(), so the two must not drift apart.
const MIGRATIONS = join(__dirname, '../../backend/supabase/migrations')

function latestGenerationLimits(): Record<string, number> {
  const defining = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
    .filter((sql) => /function public\.generation_limits\(\)/.test(sql))
  const sql = defining.at(-1)
  const json = sql?.match(/generation_limits\(\)[\s\S]*?select '(\{[^']+\})'::jsonb/)?.[1]
  if (!json) throw new Error('no generation_limits() found in the migrations')
  return JSON.parse(json)
}

describe('PLAN_LIMITS', () => {
  it('matches the latest generation_limits() in the migrations', () => {
    expect(PLAN_LIMITS).toEqual(latestGenerationLimits())
  })

  // llms.txt is a static file, so it can't read PLAN_LIMITS. Its Pricing line
  // has to be edited by hand when the numbers change.
  it('matches the Pricing line in public/llms.txt', () => {
    const pricing = readFileSync(join(__dirname, '../public/llms.txt'), 'utf8').match(/^- Pricing: .*$/m)?.[0]
    const L = PLAN_LIMITS
    expect(pricing).toContain(`${L.free_starter} AI generations to start, then ${L.free_weekly} a week`)
    expect(pricing).toContain(`${L.answer_starter} answers to application questions to start, then ${L.answer_weekly} a week`)
    expect(pricing).toContain(`up to ${L.pro_daily} generations and up to ${L.answer_pro_daily} answers a day`)
  })

  it('matches the answers key fact in public/llms.txt', () => {
    const fact = readFileSync(join(__dirname, '../public/llms.txt'), 'utf8').match(/^- Answers to application questions: .*$/m)?.[0]
    const L = PLAN_LIMITS
    expect(fact).toContain(`Free accounts get ${L.answer_starter} answers to start, then ${L.answer_weekly} a week; Pro up to ${L.answer_pro_daily} a day`)
  })
})
