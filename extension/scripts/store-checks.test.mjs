import { expect, test } from 'vitest'
import { storeBundleProblems, storeEnvProblems } from './store-checks.mjs'

const env = {
  VITE_SUPABASE_URL: 'https://abcdefgh.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  VITE_WEB_URL: 'https://www.cover-me.dev',
  VITE_GOOGLE_SIGNIN: '1',
  SERVICE_KEY: 'sb_secret_should_never_ship',
}
const manifest = (version = '1.7.1') => JSON.stringify({ version, host_permissions: ['https://abcdefgh.supabase.co/*'] })
const bundle = (code) => ({ 'manifest.json': manifest(), 'assets/a.js': code })
const good = 'x("https://abcdefgh.supabase.co","sb_publishable_example","https://www.cover-me.dev");c("btn btn-google")'

test('a production env with Google sign-in on passes', () => {
  expect(storeEnvProblems(env)).toEqual([])
})

test('an empty Google flag, as in the 1.5.0 and 1.6.0 builds, is refused before building', () => {
  expect(storeEnvProblems({ ...env, VITE_GOOGLE_SIGNIN: '' })).toEqual([expect.stringContaining('VITE_GOOGLE_SIGNIN must be 1')])
})

test('a local or missing backend is refused', () => {
  expect(storeEnvProblems({ ...env, VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_WEB_URL: 'http://localhost:3100', VITE_SUPABASE_PUBLISHABLE_KEY: undefined })).toHaveLength(3)
})

test('a correct bundle passes', () => {
  expect(storeBundleProblems(bundle(good), env, '1.7.1')).toEqual([])
})

test('a bundle built with Google sign-in off is caught', () => {
  const off = good.replace('btn btn-google', 'Free account — 10 to start')
  expect(storeBundleProblems(bundle(off), env, '1.7.1')).toEqual([
    expect.stringContaining('no "Continue with Google" button'),
    expect.stringContaining('flag-off sign-up text'),
  ])
})

test('a bundled backend secret, localhost, or a version mismatch is caught', () => {
  const problems = storeBundleProblems(bundle(`${good};"sb_secret_should_never_ship";"http://localhost:3100"`), env, '1.8.0')
  expect(problems).toEqual([
    expect.stringContaining("isn't package.json's 1.8.0"),
    expect.stringContaining('localhost'),
    expect.stringContaining("SERVICE_KEY's value"),
  ])
})
