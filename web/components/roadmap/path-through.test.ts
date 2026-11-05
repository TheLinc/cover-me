import { describe, expect, it } from 'vitest'
import { pathThrough } from './path-through'

describe('pathThrough', () => {
  it('draws S-curves with vertical tangents through every point', () => {
    expect(pathThrough([{ x: 10, y: 0 }, { x: 50, y: 100 }])).toBe('M 10 0 C 10 50, 50 50, 50 100')
  })

  it('is a straight line when every point shares one x (the mobile layout)', () => {
    const d = pathThrough([{ x: 12, y: 0 }, { x: 12, y: 80 }, { x: 12, y: 200 }])
    expect(new Set(d.match(/-?\d+(\.\d+)?/g)!.filter((_, i) => i % 2 === 0))).toEqual(new Set(['12']))
  })

  it('is empty with no points', () => {
    expect(pathThrough([])).toBe('')
  })
})
