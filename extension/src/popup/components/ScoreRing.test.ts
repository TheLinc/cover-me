import { describe, expect, it } from 'vitest'
import { gainLine, scoreRose } from './ScoreRing'

describe('gainLine', () => {
  it('names the original score when tailoring raised it by 5 or more', () => {
    expect(gainLine(84, 52)).toBe('Up from 52 before tailoring.')
    expect(gainLine(57, 52)).toBe('Up from 52 before tailoring.')
  })

  it('adds that the resume already matched well when it rose from 80 up', () => {
    expect(gainLine(88, 80)).toBe('Up from 80 before tailoring. Your resume already matched well.')
  })

  it('says the resume already matched well when a score of 80 or more barely moved', () => {
    expect(gainLine(86, 86)).toBe('Your resume already matched this job well.')
    expect(gainLine(84, 81)).toBe('Your resume already matched this job well.')
  })

  it('points to the note box when a score under 80 barely moved', () => {
    const line = 'Your resume already used the keywords it can back up. Add real experience below to raise it.'
    expect(gainLine(61, 61)).toBe(line)
    expect(gainLine(55, 52)).toBe(line)
  })

  it('says nothing without a before score, as from an older backend', () => {
    expect(gainLine(70, undefined)).toBeNull()
    expect(gainLine(undefined, 50)).toBeNull()
  })
})

describe('scoreRose', () => {
  it('is true when tailoring raised the score by 5 or more', () => {
    expect(scoreRose(57, 52)).toBe(true)
    expect(scoreRose(56, 52)).toBe(false)
    expect(scoreRose(84, undefined)).toBe(false)
    expect(scoreRose(undefined, 52)).toBe(false)
  })
})
