import { describe, expect, it } from 'vitest'
import { callFunction } from './helpers'

const FUNCTIONS = ['generate', 'tailor', 'resume', 'letters', 'applications']

describe('every function rejects unauthenticated requests', () => {
  for (const name of FUNCTIONS) {
    it(`${name}: no Authorization header → 401`, async () => {
      const res = await callFunction(name, { method: 'POST', body: {} })
      expect(res.status).toBe(401)
    })

    it(`${name}: forged token → 401`, async () => {
      const res = await callFunction(name, { method: 'POST', token: 'not-a-real-jwt', body: {} })
      expect(res.status).toBe(401)
    })

    it(`${name}: CORS preflight → 2xx with CORS headers`, async () => {
      const res = await callFunction(name, { method: 'OPTIONS' })
      expect(res.ok).toBe(true)
      expect(res.headers.get('access-control-allow-origin')).toBe('*')
    })
  }
})
