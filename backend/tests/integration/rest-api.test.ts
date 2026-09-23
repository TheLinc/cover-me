import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { admin, API_URL, createUser, deleteUser, quotaUsedToday, setQuotaUsedToday, type TestUser } from './helpers'

// What a signed-in user can do with their own JWT straight against PostgREST,
// bypassing the Edge Functions. Mirrors rls.test.sql through the real API.
describe('REST API as a signed-in free user', () => {
  let user: TestUser
  let db: ReturnType<typeof createClient>

  beforeAll(async () => {
    user = await createUser()
    db = createClient(API_URL, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${user.token}` } },
    })
  })
  afterAll(() => deleteUser(user))

  it('can read own tier (extension + dashboard)', async () => {
    const { data, error } = await db.from('users').select('tier').eq('id', user.id).single()
    expect(error).toBeNull()
    expect(data?.tier).toBe('hosted_free')
  })

  it('can read own usage count (dashboard)', async () => {
    await setQuotaUsedToday(user.id, 3)
    const { data, error } = await db.from('rate_limits').select('count')
    expect(error).toBeNull()
    expect(data).toEqual([{ count: 3 }])
  })

  it('cannot upgrade own tier to hosted_pro', async () => {
    await db.from('users').update({ tier: 'hosted_pro' }).eq('id', user.id)
    const { data } = await admin.from('users').select('tier').eq('id', user.id).single()
    expect(data?.tier).toBe('hosted_free')
  })

  it('cannot reset own daily quota', async () => {
    await setQuotaUsedToday(user.id, 5)
    await db.from('rate_limits').delete().eq('user_id', user.id)
    await db.from('rate_limits').update({ count: 0 }).eq('user_id', user.id)
    expect(await quotaUsedToday(user.id)).toBe(5)
  })

  it('cannot call the rate limit RPCs', async () => {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await db.rpc('decrement_rate_limit', { p_user_id: user.id, p_date: today })
    expect(error).not.toBeNull()
  })
})
