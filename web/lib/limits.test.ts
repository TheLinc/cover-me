import { describe, expect, it } from 'vitest'
import { describeAllowance, describeAnswers } from './limits'

const base = { used: 0, remaining: 0, allowed: true, pro_daily: 25 }

describe('describeAllowance', () => {
  it('starter: counts toward the first 10, no reset', () => {
    expect(describeAllowance({ ...base, kind: 'starter', limit: 10, used: 3, resets_at: null }))
      .toEqual({ label: 'Free generations to start', used: 3, limit: 10, resets: 'Then 5 a week' })
  })
  it('weekly: resets Monday', () => {
    expect(describeAllowance({ ...base, kind: 'weekly', limit: 5, used: 2, resets_at: '2026-10-12T00:00:00Z' }))
      .toEqual({ label: 'Free generations this week', used: 2, limit: 5, resets: 'Resets Monday, 00:00 UTC' })
  })
  it('daily: Pro fair use resets at midnight', () => {
    expect(describeAllowance({ ...base, kind: 'daily', limit: 25, used: 7, resets_at: '2026-10-10T00:00:00Z' }))
      .toEqual({ label: 'Generations today', used: 7, limit: 25, resets: 'Resets at midnight UTC' })
  })
  // Free users who used more than 5 under the old 5-a-day rules in the
  // deploy week would otherwise see "15 / 5" until Monday.
  it('never shows more used than the limit', () => {
    expect(describeAllowance({ ...base, kind: 'weekly', limit: 5, used: 15, resets_at: '2026-10-12T00:00:00Z' })?.used).toBe(5)
  })
})

describe('describeAllowance without data', () => {
  // The dashboard must render when my_generation_allowance returns nothing
  // (web deployed before migration 015, or a database hiccup).
  it('returns null instead of throwing', () => {
    expect(describeAllowance(null)).toBeNull()
  })
})

describe('describeAnswers', () => {
  it('words the answer allowance for each plan', () => {
    expect(describeAnswers({ ...base, kind: 'starter', limit: 5, remaining: 4, resets_at: null })).toBe('4 of 5 free left to start')
    expect(describeAnswers({ ...base, kind: 'weekly', limit: 5, remaining: 0, resets_at: '2026-11-23T00:00:00Z' })).toBe('0 of 5 free left this week')
    expect(describeAnswers({ ...base, kind: 'daily', limit: 50, remaining: 47, resets_at: '2026-11-17T00:00:00Z' })).toBe('47 of 50 left today')
  })
  it('leaves the line out when the allowance could not be read', () => {
    expect(describeAnswers(null)).toBeNull()
  })
})
