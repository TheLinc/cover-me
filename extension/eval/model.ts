// Model access for the eval harness, with two interchangeable backends:
//
//   api     Anthropic Messages API via ANTHROPIC_API_KEY (billed to API credits).
//           Exactly the production request shape.
//   claude  Claude Code headless (`claude -p`), billed to your Claude plan.
//           Isolated so outputs match production as closely as possible: no
//           tools, no MCP, no user settings/hooks, thinking off for generation
//           calls, and the filesystem root as working dir. Claude Code loads
//           CLAUDE.md and .claude/rules from every ancestor of its working dir,
//           so any folder under your user profile (including the OS temp dir)
//           would pull in ~/.claude/CLAUDE.md. With CLAUDE_CODE_OAUTH_TOKEN set
//           (from `claude setup-token`) it also uses an empty config dir, so
//           account context never reaches the model. Without the token it falls
//           back to your normal login and warns.

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, parse } from 'node:path'

export type Msg = { role: 'user' | 'assistant'; content: string }
export type Backend = 'api' | 'claude'

export interface CallOptions {
  model: string
  maxTokens: number
  /** Judge calls think; generation calls mirror production (no thinking). */
  think?: boolean
  /** Step name for per-step usage (usage.log), e.g. "tailor". */
  label?: string
}

// $/MTok for the API-equivalent cost estimate (claude backend reports its own).
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-4-5': [1, 5],
  'claude-haiku-4-5-20251001': [1, 5],
  'claude-sonnet-4-6': [3, 15],
  'claude-sonnet-5': [2, 10],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5': [5, 25],
  'claude-opus-5-5': [4, 20],
}

export const usage = {
  calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0,
  log: [] as Array<{ label?: string; model: string; input: number; output: number }>,
}

function record(model: string, input: number, output: number, cost?: number, label?: string) {
  usage.log.push({ label, model, input, output })
  usage.calls++
  usage.inputTokens += input
  usage.outputTokens += output
  const [pin, pout] = PRICES[model] ?? [0, 0]
  usage.costUsd += cost ?? (input * pin + output * pout) / 1e6
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── api backend ──────────────────────────────────────────────────────────────

async function callApi(messages: Msg[], opts: CallOptions): Promise<string> {
  const body: Record<string, unknown> = { model: opts.model, max_tokens: opts.maxTokens, messages }
  // Mirror production: Sonnet 5.5 generation uses adaptive thinking at high
  // effort (SONNET_FIELDS in src/lib/ai/claude.ts). Judges think too. Thinking
  // counts toward max_tokens, so leave room for it either way.
  if (opts.think || opts.model === 'claude-sonnet-5-5') {
    body.thinking = { type: 'adaptive' }
    body.max_tokens = Math.max(opts.maxTokens, 16000)
  }
  if (opts.model === 'claude-sonnet-5-5' && !opts.think) body.output_config = { effort: 'high' }
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    // Rate limits and overload: wait as long as the API asks (retry-after), else
    // back off with jitter, so a full run on a low usage tier slows down instead
    // of failing cases.
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      const after = Number(res.headers.get('retry-after'))
      await sleep(after > 0 ? after * 1000 : 2000 * 2 ** attempt + Math.random() * 1000)
      continue
    }
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>
      usage: { input_tokens: number; output_tokens: number }
    }
    record(opts.model, data.usage.input_tokens, data.usage.output_tokens, undefined, opts.label)
    return data.content.find((b) => b.type === 'text')?.text ?? ''
  }
}

// ── claude backend ───────────────────────────────────────────────────────────

const WORKDIR = parse(tmpdir()).root
const ROOT_HAS_INSTRUCTIONS = existsSync(join(WORKDIR, 'CLAUDE.md')) || existsSync(join(WORKDIR, '.claude'))
const CLEAN_CONFIG = process.env.CLAUDE_CODE_OAUTH_TOKEN ? mkdtempSync(join(tmpdir(), 'coverme-eval-config-')) : undefined

export function claudeIsolation(): string {
  if (ROOT_HAS_INSTRUCTIONS) return `NOT isolated: ${WORKDIR} has a CLAUDE.md or .claude folder that will reach the model`
  return CLEAN_CONFIG
    ? 'isolated (CLAUDE_CODE_OAUTH_TOKEN, empty config dir, root working dir)'
    : 'NOT fully isolated: set CLAUDE_CODE_OAUTH_TOKEN (run `claude setup-token`) to keep your account context out'
}

// claude -p takes one prompt, so a multi-turn exchange (the letter lint retry)
// is flattened into a transcript. Only the letter retry uses this.
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
  delete env.ANTHROPIC_API_KEY // bill the plan, never API credits
  if (CLEAN_CONFIG) env.CLAUDE_CONFIG_DIR = CLEAN_CONFIG
  if (!opts.think) env.MAX_THINKING_TOKENS = '0'

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
      record(opts.model, input, u.output_tokens ?? 0, data.total_cost_usd, opts.label)
      resolve(data.result ?? '')
    })
    child.stdin.end(prompt)
  })
}

// Set once the Claude plan reports a session or usage limit. Every later call
// fails at once instead of retrying, so the run finishes quickly and still
// writes the outputs it completed.
let planLimit: string | undefined
export const planLimitHit = () => planLimit
const LIMIT = /session limit|usage limit|hit your .*limit/i

async function callClaude(messages: Msg[], opts: CallOptions): Promise<string> {
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
    return runClaude(flatten(messages), opts) // one retry for transient failures
  }
}

export function makeCaller(backend: Backend) {
  return (messages: Msg[], opts: CallOptions) => (backend === 'api' ? callApi(messages, opts) : callClaude(messages, opts))
}

/** Runs fn over items with at most `limit` in flight, preserving order. */
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
