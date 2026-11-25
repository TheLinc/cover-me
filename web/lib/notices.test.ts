import { describe, expect, it } from 'vitest'
import { closeNotice, openNotice, type Notice } from './notices'

const notice = (id: string, until = '2027-01-01'): Notice => ({ id, label: 'Update', text: 'read what changed', href: '/privacy', until })

function memoryStore() {
  const items = new Map<string, string>()
  return { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => { items.set(k, v) } }
}

const now = new Date('2026-12-01T12:00:00Z')

describe('openNotice', () => {
  it('shows nothing when the list is empty', () => {
    expect(openNotice([], now, memoryStore())).toBeNull()
  })

  it('shows the newest entry, the last one in the list', () => {
    expect(openNotice([notice('a'), notice('b')], now, memoryStore())?.id).toBe('b')
  })

  it('stays hidden once closed, and a new ID shows again', () => {
    const store = memoryStore()
    closeNotice('a', store)
    expect(openNotice([notice('a')], now, store)).toBeNull()
    expect(openNotice([notice('a'), notice('b')], now, store)?.id).toBe('b')
  })

  it('falls back to an older entry when the newest is closed', () => {
    const store = memoryStore()
    closeNotice('b', store)
    expect(openNotice([notice('a'), notice('b')], now, store)?.id).toBe('a')
  })

  it('stops showing from its end date', () => {
    expect(openNotice([notice('a', '2026-12-02')], now, memoryStore())?.id).toBe('a')
    expect(openNotice([notice('a', '2026-12-01T12:00:00Z')], now, memoryStore())).toBeNull()
    expect(openNotice([notice('a', '2026-11-30')], now, memoryStore())).toBeNull()
  })
})
