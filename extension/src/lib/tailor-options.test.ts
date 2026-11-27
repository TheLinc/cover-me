import { describe, expect, it } from 'vitest'
import { tailorSummary } from './tailor-options'

const base = { compact: false, trim: false, includeSummary: false, yours: false, designSummary: false }

describe('tailorSummary', () => {
  it('names each option that is on, in the order they are listed', () => {
    expect(tailorSummary({ ...base, compact: true, trim: true, includeSummary: true })).toBe('One page · Trim bullets · Summary')
    expect(tailorSummary({ ...base, trim: true, includeSummary: true })).toBe('Trim bullets · Summary')
  })

  it('says none when nothing is on', () => {
    expect(tailorSummary(base)).toBe('None')
  })

  it("leaves out options the user's own design hides, and names the design", () => {
    expect(tailorSummary({ ...base, yours: true, compact: true, includeSummary: true })).toBe('Your design')
    expect(tailorSummary({ ...base, yours: true, designSummary: true, compact: true, includeSummary: true })).toBe('Your design · Summary')
  })
})
