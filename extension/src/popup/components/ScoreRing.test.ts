import { describe, expect, it } from 'vitest'
import { gainLine } from './ScoreRing'

describe('gainLine', () => {
  it('names the original score when tailoring raised it', () => {
    expect(gainLine(84, 52)).toBe('Up from 52 before tailoring.')
  })

  it('says nothing when the score did not rise', () => {
    expect(gainLine(70, 70)).toBeNull()
    expect(gainLine(70, 75)).toBeNull()
  })

  it('says nothing without a before score, as from an older backend', () => {
    expect(gainLine(70, undefined)).toBeNull()
    expect(gainLine(undefined, 50)).toBeNull()
  })

  it('adds that the resume already matched well from 80 up', () => {
    expect(gainLine(88, 80)).toBe('Up from 80 before tailoring. Your resume already matched well.')
  })
})
