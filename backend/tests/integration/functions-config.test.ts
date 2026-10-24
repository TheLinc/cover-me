import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The Supabase GitHub integration deploys only the Edge Functions declared in
// config.toml, so an undeclared function would silently stay on an old version
// in production after every merge.
const SUPABASE_DIR = join(__dirname, '..', '..', 'supabase')

describe('Edge Function declarations', () => {
  it('declares every function folder in config.toml', () => {
    const folders = readdirSync(join(SUPABASE_DIR, 'functions'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => d.name)
      .sort()
    const config = readFileSync(join(SUPABASE_DIR, 'config.toml'), 'utf8')
    const declared = [...config.matchAll(/^\[functions\.([\w-]+)\]/gm)].map((m) => m[1]).sort()
    expect(declared).toEqual(folders)
  })

  // The gateway's check only accepts tokens signed with the legacy JWT secret,
  // which production no longer uses. Each function checks the token itself.
  it('leaves the gateway JWT check off', () => {
    const config = readFileSync(join(SUPABASE_DIR, 'config.toml'), 'utf8')
    expect(config).not.toMatch(/^verify_jwt\s*=\s*true/m)
  })
})
