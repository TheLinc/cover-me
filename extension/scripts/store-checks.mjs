// What a Chrome Web Store package must have, as pure checks (package-store.mjs
// runs them). 1.5.0 and 1.6.0 shipped without "Continue with Google" because
// the build's env had the flag empty; these make that a failed package instead.

const GOOGLE_ON = 'btn btn-google' // AccountPanel's Google button, built only when the flag is on
const GOOGLE_OFF = 'Free account — 10 to start' // GeneratePage's flag-off text

// The env a store build needs. Empty list = good.
export function storeEnvProblems(env) {
  const problems = []
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.VITE_SUPABASE_URL ?? '')) problems.push(`VITE_SUPABASE_URL must be the production project (https://<ref>.supabase.co), got "${env.VITE_SUPABASE_URL ?? ''}"`)
  if (!(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').startsWith('sb_publishable_')) problems.push('VITE_SUPABASE_PUBLISHABLE_KEY must be a production publishable key (sb_publishable_...)')
  if (env.VITE_WEB_URL !== 'https://www.cover-me.dev') problems.push(`VITE_WEB_URL must be https://www.cover-me.dev, got "${env.VITE_WEB_URL ?? ''}"`)
  if (env.VITE_GOOGLE_SIGNIN !== '1') problems.push(`VITE_GOOGLE_SIGNIN must be 1 so the store build shows "Continue with Google", got "${env.VITE_GOOGLE_SIGNIN ?? ''}"`)
  return problems
}

// The built files (path -> text, for .js/.html/.json) against that env. Empty list = good.
export function storeBundleProblems(files, env, version) {
  const problems = []
  const texts = Object.values(files)
  const has = (s) => texts.some((t) => t.includes(s))
  const manifest = JSON.parse(files['manifest.json'] ?? '{}')
  if (manifest.version !== version) problems.push(`manifest version ${manifest.version} isn't package.json's ${version}`)
  if (!has(GOOGLE_ON)) problems.push('no "Continue with Google" button in the bundle (VITE_GOOGLE_SIGNIN off at build time)')
  if (has(GOOGLE_OFF)) problems.push('the flag-off sign-up text is in the bundle (VITE_GOOGLE_SIGNIN off at build time)')
  for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_WEB_URL']) {
    if (!has(env[key])) problems.push(`${key} from the env file isn't in the bundle`)
  }
  if (!manifest.host_permissions?.includes(`${env.VITE_SUPABASE_URL}/*`)) problems.push('manifest host_permissions lack the production Supabase URL')
  if (has('localhost') || has('127.0.0.1')) problems.push('the bundle points at localhost')
  // Backend secrets share the env file; none may be bundled.
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('VITE_') && value.length >= 8 && has(value)) problems.push(`${key}'s value is in the bundle`)
  }
  return problems
}
