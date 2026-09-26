// Makes sure the local services the tests need are running. After Docker
// restarts, `supabase start` exits 0 but leaves stopped containers stopped
// (it only lists them), so restart the stack instead. Volumes are kept.

import { supabase } from './lib.mjs'

const REQUIRED = ['db', 'auth', 'rest', 'kong']

const status = supabase(['status'])
const stopped = status.stderr.match(/Stopped services: \[(.*?)\]/)?.[1] ?? ''
const down = REQUIRED.filter((s) => stopped.includes(`supabase_${s}_`))

if (status.status !== 0 || down.length) {
  console.log(`Local stack is ${status.status !== 0 ? 'not running' : `missing ${down.join(', ')}`}, (re)starting it…`)
  supabase(['stop'], { stdio: 'inherit' })
  const start = supabase(['start'], { stdio: 'inherit' })
  if (start.status !== 0) process.exit(start.status ?? 1)
}
