import { describe, expect, test } from 'vitest'
import { checkTailored } from './checks'
import { CASES } from './fixtures'
import type { TailoredResume } from '../src/types'

// Default mode cut a long skills list to about half with no cutting option on (#400).
describe('the skills list in default mode (#400)', () => {
  const c = CASES.find((x) => x.id === 'vp-operations-to-coo')!
  const all = c.parsed.skills!
  const out = (skills: string) => ({ ...c.parsed, skills }) as TailoredResume
  const skillFailures = (r: { failures: string[] }) => r.failures.filter((f) => /skill/i.test(f))

  test('passes a list over 18 that keeps every skill, reworded ones included', () => {
    expect(skillFailures(checkTailored(out(all.replace('Oracle ERP', 'Oracle ERP (ERP)')), c))).toEqual([])
  })

  test('fails one that drops a skill', () => {
    expect(skillFailures(checkTailored(out(all.replace('Kaizen', '').replace(/, $/, '')), c))).toEqual(['default mode dropped a resume skill: "Kaizen"'])
  })

  test('still holds trim mode to the cap', () => {
    expect(skillFailures(checkTailored(out(all), { ...c, mode: 'trim' }))).toEqual(['skills list has 21 items (hard cap 18)'])
  })
})
