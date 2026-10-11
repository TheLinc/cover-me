import { afterEach, describe, expect, test, vi } from 'vitest'
import { resolveMode, takeGoogleSignInError, watchSession } from './storage'

afterEach(() => vi.unstubAllGlobals())

describe('takeGoogleSignInError', () => {
  test('returns a saved Google sign-in error once, then forgets it', async () => {
    const data: Record<string, unknown> = { googleSignInError: 'Unsupported provider' }
    vi.stubGlobal('chrome', { storage: { local: {
      get: async (k: string) => (k in data ? { [k]: data[k] } : {}),
      remove: async (k: string) => { delete data[k] },
    } } })
    expect(await takeGoogleSignInError()).toBe('Unsupported provider')
    expect(await takeGoogleSignInError()).toBe('')
  })
})

describe('watchSession', () => {
  function fakeOnChanged() {
    const listeners = new Set<(changes: Record<string, { newValue?: unknown }>, area: string) => void>()
    vi.stubGlobal('chrome', { storage: { onChanged: {
      addListener: (l: never) => listeners.add(l),
      removeListener: (l: never) => listeners.delete(l),
    } } })
    return { fire: (changes: Record<string, { newValue?: unknown }>, area = 'local') => listeners.forEach((l) => l(changes, area)), listeners }
  }

  test('reports a session saved elsewhere (the worker finishing Google sign-in)', () => {
    const on = fakeOnChanged()
    const seen: unknown[] = []
    watchSession((s) => seen.push(s))
    on.fire({ session: { newValue: { access_token: 'at' } } })
    on.fire({ session: {} }) // removed: signed out
    expect(seen).toEqual([{ access_token: 'at' }, null])
  })

  test('ignores other keys and other storage areas, and stops when unsubscribed', () => {
    const on = fakeOnChanged()
    const seen: unknown[] = []
    const stop = watchSession((s) => seen.push(s))
    on.fire({ settings: { newValue: {} } })
    on.fire({ session: { newValue: { access_token: 'x' } } }, 'sync')
    stop()
    on.fire({ session: { newValue: { access_token: 'y' } } })
    expect(seen).toEqual([])
    expect(on.listeners.size).toBe(0)
  })
})

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
