import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, RESUME_TEXT, type TestUser, uploadResume } from './helpers'

describe('resume', () => {
  let user: TestUser

  beforeEach(async () => {
    user = await createUser()
  })
  afterEach(() => deleteUser(user))

  it('returns 404 before any upload', async () => {
    const res = await callFunction('resume', { token: user.token })
    expect(res.status).toBe(404)
  })

  it('round-trips text and filename', async () => {
    await uploadResume(user)
    const res = await callFunction('resume', { token: user.token })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe(RESUME_TEXT)
    expect(body.filename).toBe('resume.pdf')
  })

  it('stores ciphertext, never the plaintext resume', async () => {
    await uploadResume(user)
    const { data } = await admin.from('resumes').select('text_encrypted').eq('user_id', user.id).single()
    expect(data?.text_encrypted).toBeTruthy()
    expect(data?.text_encrypted).not.toContain('Initech')
  })

  it('clears the cached structured resume on re-upload', async () => {
    await uploadResume(user)
    await admin.from('resumes').update({ structured_encrypted: 'stale-cache' }).eq('user_id', user.id)
    await uploadResume(user, RESUME_TEXT + '\nCertified Kubernetes Administrator')
    const { data } = await admin.from('resumes').select('structured_encrypted').eq('user_id', user.id).single()
    expect(data?.structured_encrypted).toBeNull()
  })

  it('rejects text over 100 KB', async () => {
    const res = await callFunction('resume', { token: user.token, body: { text: 'x'.repeat(100_001) } })
    expect(res.status).toBe(413)
  })

  it('rejects a missing text field', async () => {
    const res = await callFunction('resume', { token: user.token, body: { filename: 'resume.pdf' } })
    expect(res.status).toBe(400)
  })

  it('deletes the resume', async () => {
    await uploadResume(user)
    const del = await callFunction('resume', { method: 'DELETE', token: user.token })
    expect(del.status).toBe(200)
    const res = await callFunction('resume', { token: user.token })
    expect(res.status).toBe(404)
  })
})
