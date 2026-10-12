import { describe, expect, it } from 'vitest'
import { nextLimit } from './GapChips'

// Simulates the popup: chips of the given widths wrap into a row of `width`,
// with the "+N more" button after the first `limit`. Returns each item's top.
function layout(widths: number[], limit: number, width = 230, button = 60): number[] {
  const items = limit < widths.length ? [...widths.slice(0, limit), button] : widths
  let x = 0, row = 0
  return items.map(w => {
    if (x > 0 && x + w > width) { row++; x = 0 }
    x += w + 6
    return row * 26
  })
}

function settle(widths: number[]): number {
  let limit = widths.length
  for (let i = 0; i < 50; i++) {
    const next = nextLimit(layout(widths, limit), limit)
    if (next === limit) return limit
    limit = next
  }
  throw new Error('did not settle')
}

describe('nextLimit', () => {
  it('shows everything when it fits in three rows', () => {
    expect(settle([90, 90, 90, 90, 90, 90])).toBe(6)
  })

  it('stops at three rows with room for the button', () => {
    const widths = Array(30).fill(90)
    const limit = settle(widths)
    const tops = layout(widths, limit)
    expect(new Set(tops).size).toBe(3)
    expect(limit).toBe(5) // 2 + 2 + 1 chip, then the button on row 3
  })

  it('handles one chip wider than a row', () => {
    const limit = settle([300, 300, 300, 300, 300])
    expect(new Set(layout([300, 300, 300, 300, 300], limit)).size).toBeLessThanOrEqual(3)
    expect(limit).toBe(2)
  })
})
