import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const captureMessage = vi.fn()
vi.mock('@sentry/nextjs', () => ({ captureMessage }))

const event = {
  id: 'evt_1',
  type: 'customer.subscription.updated',
  data: { object: { id: 'sub_1', customer: 'cus_secret', status: 'active' } },
}
vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: () => event }
    subscriptions = { list: async () => ({ data: [{ status: 'active' }] }) }
  },
}))

const rpcError = { value: null as { message: string } | null }
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: async () => ({ error: rpcError.value }) }),
}))

const { POST } = await import('./route')
const post = () =>
  POST(new NextRequest('http://localhost/api/stripe-webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'sig' } }))

beforeEach(() => {
  captureMessage.mockClear()
  rpcError.value = null
})

describe('/api/stripe-webhook', () => {
  it('a failed plan update reports to Sentry with the event type and no customer data', async () => {
    rpcError.value = { message: 'db down' }
    expect((await post()).status).toBe(500)
    expect(captureMessage).toHaveBeenCalledWith('stripe-webhook update failed', {
      level: 'error',
      tags: { stripe_event_type: 'customer.subscription.updated' },
      extra: { stripe_event_id: 'evt_1' },
    })
    expect(JSON.stringify(captureMessage.mock.calls)).not.toContain('cus_secret')
  })

  it('a successful update reports nothing', async () => {
    expect((await post()).status).toBe(200)
    expect(captureMessage).not.toHaveBeenCalled()
  })
})
