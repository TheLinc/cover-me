import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, parse } from 'node:path'

export type Msg = { role: 'user' | 'assistant'; content: string }

export interface CallOptions {
  model: string
  maxTokens: number
  think?: boolean
  label?: string
}

export const usage = {
  calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0,
  log: [] as Array<{ label?: string; model: string; input: number; output: number }>,
}

function record(model: string, input: number, output: number, cost: number, label?: string) {
  usage.log.push({ label, model, input, output })
  usage.calls++
  usage.inputTokens += input
  usage.outputTokens += output
  usage.costUsd += cost
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Claude Code loads CLAUDE.md from every folder above its working dir (https://github.com/TheLinc/cover-me/commit/cb47a02).
const WORKDIR = parse(tmpdir()).root
const ROOT_HAS_INSTRUCTIONS = existsSync(join(WORKDIR, 'CLAUDE.md')) || existsSync(join(WORKDIR, '.claude'))
const CLEAN_CONFIG = process.env.CLAUDE_CODE_OAUTH_TOKEN ? mkdtempSync(join(tmpdir(), 'coverme-eval-config-')) : undefined

export function claudeIsolation(): string {
  if (ROOT_HAS_INSTRUCTIONS) return `NOT isolated: ${WORKDIR} has a CLAUDE.md or .claude folder that will reach the model`
  return CLEAN_CONFIG
    ? 'isolated (CLAUDE_CODE_OAUTH_TOKEN, empty config dir, root working dir)'
    : 'NOT fully isolated: set CLAUDE_CODE_OAUTH_TOKEN (run `claude setup-token`) to keep your account context out'
}

// claude -p takes one prompt (https://github.com/TheLinc/cover-me/commit/cb47a02).
function flatten(messages: Msg[]): string {
  if (messages.length === 1) return messages[0].content
  return messages
    .map((m) => (m.role === 'user' ? m.content : `YOUR PREVIOUS DRAFT:\n"""\n${m.content}\n"""`))
    .join('\n\n')
}

function runClaude(prompt: string, opts: CallOptions): Promise<string> {
  const args = [
    '-p', '--model', opts.model, '--output-format', 'json',
    '--tools', '', '--strict-mcp-config', '--no-session-persistence',
    '--setting-sources', 'project',
    '--system-prompt', 'Follow the user\'s instructions exactly.',
  ]
  const env: NodeJS.ProcessEnv = { ...process.env }
  // With a key in its env, claude -p bills API credits, not the plan (https://github.com/TheLinc/cover-me/commit/cb47a02).
  delete env.ANTHROPIC_API_KEY
  if (CLEAN_CONFIG) env.CLAUDE_CONFIG_DIR = CLEAN_CONFIG
  // Matches SONNET_FIELDS in src/lib/ai/claude.ts (#203).
  if (opts.model === 'claude-sonnet-5-5' && !opts.think) args.push('--effort', 'high')
  else if (!opts.think) env.MAX_THINKING_TOKENS = '0'

  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { cwd: WORKDIR, env })
    let out = ''
    let err = ''
    const timer = setTimeout(() => child.kill(), 10 * 60_000)
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', reject)
    child.on('close', () => {
      clearTimeout(timer)
      let data: { is_error?: boolean; result?: string; total_cost_usd?: number; usage?: Record<string, number> }
      try {
        data = JSON.parse(out)
      } catch {
        return reject(new Error(`claude -p returned non-JSON: ${(out || err).slice(0, 500)}`))
      }
      if (data.is_error) return reject(new Error(`claude -p error: ${String(data.result).slice(0, 500)}`))
      const u = data.usage ?? {}
      const input = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
      record(opts.model, input, u.output_tokens ?? 0, data.total_cost_usd ?? 0, opts.label)
      resolve(data.result ?? '')
    })
    child.stdin.end(prompt)
  })
}

// After a plan limit, fail fast so the run still writes what it finished (https://github.com/TheLinc/cover-me/commit/0c46fe4).
let planLimit: string | undefined
export const planLimitHit = () => planLimit
const LIMIT = /session limit|usage limit|hit your .*limit/i

export async function call(messages: Msg[], opts: CallOptions): Promise<string> {
  if (planLimit) throw new Error(planLimit)
  try {
    return await runClaude(flatten(messages), opts)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (LIMIT.test(msg)) {
      planLimit = msg
      throw e
    }
    await sleep(5000)
    return runClaude(flatten(messages), opts)
  }
}

export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
