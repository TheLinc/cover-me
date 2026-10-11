import { describe, expect, test } from 'vitest'
import { resolveMode } from './storage'

describe('resolveMode', () => {
  test('a fresh install defaults to the hosted account', () => {
    expect(resolveMode(null)).toBe('hosted')
    expect(resolveMode(undefined)).toBe('hosted')
  })
  test('a saved mode always wins', () => {
    expect(resolveMode({ provider: 'claude', apiKey: '', mode: 'byok' })).toBe('byok')
    expect(resolveMode({ provider: 'claude', apiKey: 'enc', mode: 'hosted' })).toBe('hosted')
  })
  // Settings saved before `mode` existed: a stored key means they chose BYOK.
  test('old settings with a key but no mode stay BYOK', () => {
    expect(resolveMode({ provider: 'openai', apiKey: 'enc' } as never)).toBe('byok')
  })
})
