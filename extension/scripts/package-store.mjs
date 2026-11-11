// Builds, checks and zips the Chrome Web Store package. The only way to make one.
//   pnpm package:store [--env <path to the production .env>]
// Writes <repo>/chrome-store/cover-me-<version>.zip, or fails before zipping.
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { parseEnv } from 'node:util'
import JSZip from 'jszip'
import { storeBundleProblems, storeEnvProblems } from './store-checks.mjs'

const fail = (title, problems) => { console.error(`\n${title}:\n${problems.map((p) => `  - ${p}`).join('\n')}\n`); process.exit(1) }
const i = process.argv.indexOf('--env')
const envFile = resolve(i > 0 ? process.argv[i + 1] : '.env')
let env
try { env = parseEnv(readFileSync(envFile, 'utf8')) } catch { fail('Not packaging', [`no env file at ${envFile} (pass the production one with --env)`]) }
const envProblems = storeEnvProblems(env)
if (envProblems.length) fail(`Not packaging: ${envFile}`, envProblems)

// The file's VITE_ values win over anything set in the shell.
const vite = Object.fromEntries(Object.entries(env).filter(([k]) => k.startsWith('VITE_')))
execSync('pnpm build', { stdio: 'inherit', env: { ...process.env, ...vite } })

const version = JSON.parse(readFileSync('package.json', 'utf8')).version
const files = {}
const zip = new JSZip()
for (const entry of readdirSync('dist', { recursive: true, withFileTypes: true }).filter((e) => e.isFile())) {
  const full = join(entry.parentPath, entry.name)
  const data = readFileSync(full)
  // Forward slashes: the store rejects zips with Windows paths.
  const name = relative('dist', full).replaceAll('\\', '/')
  zip.file(name, data)
  if (/\.(js|html|json)$/.test(name)) files[name] = data.toString('utf8')
}
const bundleProblems = storeBundleProblems(files, env, version)
if (bundleProblems.length) fail('Not packaging: the build is wrong', bundleProblems)

const out = resolve('..', 'chrome-store', `cover-me-${version}.zip`)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
console.log(`\nPackaged ${out}\nChecked: production Supabase and website, Google sign-in on, version ${version}, no localhost, no backend secrets.`)
