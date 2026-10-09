import { describe, expect, it } from 'vitest'
import { describeAllowance } from './limits'

const base = { used: 0, remaining: 0, allowed: true, pro_daily: 25 }

describe('describeAllowance', () => {
  it('starter: counts toward the first 10, no reset', () => {
    expect(describeAllowance({ ...base, kind: 'starter', limit: 10, used: 3, resets_at: null }))
      .toEqual({ label: 'Free generations to start', used: 3, limit: 10, resets: 'Then 5 a week' })
  })
  it('weekly: resets Monday', () => {
    expect(describeAllowance({ ...base, kind: 'weekly', limit: 5, used: 2, resets_at: '2026-10-12T00:00:00Z' }))
      .toEqual({ label: 'Free generations this week', used: 2, limit: 5, resets: 'Monday, 00:00 UTC' })
  })
  it('daily: Pro fair use resets at midnight', () => {
    expect(describeAllowance({ ...base, kind: 'daily', limit: 25, used: 7, resets_at: '2026-10-10T00:00:00Z' }))
      .toEqual({ label: 'Generations today', used: 7, limit: 25, resets: 'Midnight UTC' })
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
