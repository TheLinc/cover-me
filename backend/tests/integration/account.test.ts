import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, mockClaude, mockStripe, setUsage, type TestUser, uploadResume } from './helpers'

// Self-serve account deletion (#144).
describe('account', () => {
  let user: TestUser | undefined

  beforeEach(() => mockClaude.reset())
  afterEach(async () => {
    await deleteUser(user)
    user = undefined
  })

  const deleteAccount = (token?: string) => callFunction('account', { method: 'DELETE', token })
  const authUserExists = async (id: string) => !(await admin.auth.admin.getUserById(id)).error
  const rows = async (table: string, id: string) =>
    (await admin.from(table).select('*', { count: 'exact', head: true }).eq(table === 'users' ? 'id' : 'user_id', id)).count

  it('rejects requests without a token', async () => {
    expect((await deleteAccount()).status).toBe(401)
  })

  it('accepts only DELETE', async () => {
    user = await createUser()
    expect((await callFunction('account', { token: user.token, body: {} })).status).toBe(405)
    expect(await authUserExists(user.id)).toBe(true)
  })

  it('deletes a free account and all its rows, without calling Stripe', async () => {
    user = await createUser()
    await uploadResume(user)
    await setUsage(user.id, [{ daysAgo: 0, count: 2 }])
    await admin.from('job_applications').insert({ user_id: user.id, title: 'Engineer', company: 'Acme' })

    const res = await deleteAccount(user.token)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted: true })

    expect(await authUserExists(user.id)).toBe(false)
    for (const table of ['users', 'resumes', 'rate_limits', 'job_applications']) {
      expect(await rows(table, user.id), table).toBe(0)
    }
    expect(await mockStripe.calls()).toEqual([])
    // The old token no longer works anywhere.
    expect((await callFunction('resume', { token: user.token })).status).toBe(401)
  })

  it('deletes the Stripe customer before the account', async () => {
    user = await createUser('hosted_pro')
    await admin.from('users').update({ stripe_customer_id: 'cus_abc' }).eq('id', user.id)

    expect((await deleteAccount(user.token)).status).toBe(200)
    expect((await mockStripe.calls()).map((c) => c.path)).toEqual(['/v1/customers/cus_abc'])
    expect(await authUserExists(user.id)).toBe(false)
  })

  it('still deletes the account when the Stripe customer is already gone', async () => {
    user = await createUser()
    await admin.from('users').update({ stripe_customer_id: 'cus_gone' }).eq('id', user.id)
    await mockStripe.setState({ deleteCustomerError: { status: 404, code: 'resource_missing' } })

    expect((await deleteAccount(user.token)).status).toBe(200)
    expect(await authUserExists(user.id)).toBe(false)
  })

  it('keeps the account when Stripe fails, so nothing bills an account that is gone', async () => {
    user = await createUser('hosted_pro')
    await admin.from('users').update({ stripe_customer_id: 'cus_abc' }).eq('id', user.id)
    await mockStripe.setState({ deleteCustomerError: { status: 500, code: 'api_error' } })

    const res = await deleteAccount(user.token)
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/not deleted/)
    expect(await authUserExists(user.id)).toBe(true)
    expect(await rows('users', user.id)).toBe(1)
  })
})
