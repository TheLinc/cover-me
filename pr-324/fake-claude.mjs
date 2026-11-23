// Preload for `pnpm eval --live`: answers every `claude -p` spawn with 1,000,000 input and
// 1,000,000 output tokens and no model call, so the cost table prints fixed, comparable numbers.
import childProcess from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'

const real = childProcess.spawn
childProcess.spawn = (cmd, args, opts) => {
  if (cmd !== 'claude') return real(cmd, args, opts)
  const child = new EventEmitter()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.stdin = new PassThrough()
  child.kill = () => {}
  setImmediate(() => {
    child.stdout.emit('data', JSON.stringify({ result: 'not json', total_cost_usd: 0, usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 } }))
    child.emit('close', 0)
  })
  return child
}
syncBuiltinESMExports()
