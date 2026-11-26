import { parseHTML } from 'linkedom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthSession } from '../../types'

const state = vi.hoisted(() => ({ session: null as AuthSession | null, tier: null as string | null }))

vi.mock('../../lib/auth', () => ({
  EmailConfirmationRequiredError: class extends Error {},
  completeSignIn: vi.fn(),
  ensureValidSession: () => Promise.resolve(state.session),
  fetchTier: () => Promise.resolve(state.tier),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('../../lib/storage', () => ({
  clearSession: vi.fn(),
  getCachedTier: () => Promise.resolve(null),
  getMode: () => Promise.resolve('hosted'),
  getSettings: () => Promise.resolve(null),
  resolveMode: () => 'hosted',
  saveCachedTier: () => Promise.resolve(),
  saveSettings: () => Promise.resolve(),
  takeGoogleSignInError: () => Promise.resolve(''),
  watchGoogleSignInError: () => () => {},
  watchSession: () => () => {},
}))

vi.mock('./UpgradePrompt', () => ({ default: () => null }))

const { default: AccountPanel } = await import('./AccountPanel')

let container: HTMLElement
let unmount: () => void

beforeEach(() => {
  const { window, document } = parseHTML('<!doctype html><html><body><div id="root"></div></body></html>')
  Object.assign(globalThis, { window, document, IS_REACT_ACT_ENVIRONMENT: true })
  container = document.getElementById('root') as unknown as HTMLElement
})

afterEach(() => {
  act(() => unmount())
  state.session = null
  state.tier = null
})

async function render(props: { initialView?: 'signin' | 'signup'; links?: boolean } = {}) {
  const root = createRoot(container)
  unmount = () => root.unmount()
  await act(async () => { root.render(createElement(AccountPanel, props)) })
  return container
}

function signIn(tier: string) {
  state.session = {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_at: 0,
    user: { id: 'user-1', email: 'sam@example.com' },
  }
  state.tier = tier
}

function keyLink(el: HTMLElement) {
  return [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('I have an API key'))
}

describe('AccountPanel own-key link', () => {
  it('is hidden for a signed-in free account, which still sees Go Pro', async () => {
    signIn('hosted_free')
    const el = await render()
    expect(el.textContent).toContain('sam@example.com')
    expect(keyLink(el)).toBeUndefined()
    expect(el.textContent).toContain('Go Pro')
  })

  it('is hidden for a signed-in Pro account', async () => {
    signIn('hosted_pro')
    const el = await render()
    expect(el.textContent).toContain('★ Pro')
    expect(keyLink(el)).toBeUndefined()
  })

  it('is hidden on the welcome tab once signed in', async () => {
    signIn('hosted_free')
    const el = await render({ initialView: 'signup', links: false })
    expect(keyLink(el)).toBeUndefined()
  })

  it('shows signed out and opens the key form', async () => {
    const el = await render()
    const link = keyLink(el)
    expect(link).toBeDefined()
    await act(async () => { link!.click() })
    expect(el.textContent).toContain('API Key')
    expect(el.textContent).toContain('Use a free Cover Me account instead')
  })

  it('shows signed out on the welcome tab', async () => {
    const el = await render({ initialView: 'signup', links: false })
    expect(keyLink(el)).toBeDefined()
  })
})
