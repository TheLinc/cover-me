import { describe, expect, it } from 'vitest'
import { checkLines } from './line-check'
import { LINE_ROLES } from './line-pairs'

const SORRY = "Sorry, I can't help with that."
const target = LINE_ROLES[0]
const roleOf = (prompt: string) => LINE_ROLES.find((r) => prompt.includes(r.company))!
const perfect = (prompt: string) =>
  JSON.stringify({ flags: roleOf(prompt).flag.map((k) => ({ id: `e0b${k}`, reason: 'inflated' })) })

describe('checkLines', () => {
  it('warns instead of failing when one role never gets a readable reply', async () => {
    const asked: string[] = []
    const { result, total } = await checkLines(async (prompt) => {
      asked.push(roleOf(prompt).id)
      return roleOf(prompt) === target ? SORRY : perfect(prompt)
    }, 6)
    expect(result.failures).toEqual([])
    expect(result.warnings).toContain(`${target.id}: check reply could not be read, twice: ${JSON.stringify(SORRY)} then ${JSON.stringify(SORRY)}`)
    expect(asked.filter((id) => id === target.id)).toHaveLength(2)
    expect(total).toBe(LINE_ROLES.filter((r) => r !== target).reduce((n, r) => n + r.flag.length + r.ok.length, 0))
  })

  it('scores a role whose second reply is readable', async () => {
    let tries = 0
    const { result, correct, total } = await checkLines(async (prompt) => {
      if (roleOf(prompt) === target && tries++ === 0) return SORRY
      return perfect(prompt)
    }, 6)
    expect(result).toEqual({ failures: [], warnings: [] })
    expect(correct).toBe(total)
    expect(total).toBe(LINE_ROLES.reduce((n, r) => n + r.flag.length + r.ok.length, 0))
  })

  it('quotes each unreadable reply on one line, cut to 300 characters', async () => {
    let tries = 0
    const replies = ['x'.repeat(500), 'cut off\n{"flags": [']
    const { result } = await checkLines(async (prompt) => (roleOf(prompt) === target ? replies[tries++] : perfect(prompt)), 6)
    expect(result.warnings).toContain(`${target.id}: check reply could not be read, twice: "${'x'.repeat(300)}" then "cut off\\n{\\"flags\\": ["`)
  })

  it('fails when more than a quarter of the roles never get a readable reply', async () => {
    const broken = LINE_ROLES.slice(0, Math.floor(LINE_ROLES.length / 4) + 1)
    const { result } = await checkLines(async (prompt) => (broken.includes(roleOf(prompt)) ? SORRY : perfect(prompt)), 6)
    expect(result.failures).toEqual([`${broken.length} of ${LINE_ROLES.length} roles got no readable check reply`])
  })

  it('passes when exactly a quarter of the roles never get a readable reply', async () => {
    const broken = LINE_ROLES.slice(0, Math.floor(LINE_ROLES.length / 4))
    const { result } = await checkLines(async (prompt) => (broken.includes(roleOf(prompt)) ? SORRY : perfect(prompt)), 6)
    expect(result.failures).toEqual([])
  })

  it('still fails when readable replies miss most inflated lines', async () => {
    const { result } = await checkLines(async () => '{"flags":[]}', 6)
    expect(result.failures).toEqual([expect.stringMatching(/^line check accuracy \d+\/\d+ is below 80%$/)])
  })
})
