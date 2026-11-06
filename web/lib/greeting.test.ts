import { describe, expect, it } from 'vitest'
import { greetingFor } from './greeting'

describe('greetingFor', () => {
  it('keeps one greeting for the whole UTC day', () => {
    expect(greetingFor(new Date('2026-11-06T00:00:00Z'))).toBe(greetingFor(new Date('2026-11-06T23:59:59Z')))
  })

  it('goes through all five, in order, on five days in a row', () => {
    const days = [6, 7, 8, 9, 10].map((d) => greetingFor(new Date(`2026-11-${String(d).padStart(2, '0')}T12:00:00Z`)))
    const order = ['Good to see you.', "Let's get applying.", 'Welcome back.', 'Hello again.', 'Hi there.']
    const start = order.indexOf(days[0])
    expect(days).toEqual([0, 1, 2, 3, 4].map((i) => order[(start + i) % 5]))
  })
})
