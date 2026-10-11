import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const css = readFileSync(join(__dirname, 'index.css'), 'utf8')
const token = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

describe('popup tokens (Night)', () => {
  test('are the Night palette', () => {
    expect(token('bg')).toBe('#15132B')
    expect(token('accent-strong')).toBe('#4F46E5')
  })
  for (const fg of ['text', 'text-2', 'text-3', 'accent-h']) {
    for (const bg of ['bg', 'surface', 'elevated']) {
      test(`--${fg} on --${bg} is at least 4.5:1`, () => {
        expect(ratio(token(fg)!, token(bg)!)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
  test('white on --accent-strong (buttons) is at least 4.5:1', () => {
    expect(ratio('#FFFFFF', token('accent-strong')!)).toBeGreaterThanOrEqual(4.5)
  })
})
