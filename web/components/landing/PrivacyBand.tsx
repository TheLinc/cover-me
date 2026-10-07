'use client'

import { useState, type ReactNode } from 'react'
import { ArrowUpRightIcon, BrowserIcon, CloudIcon, GithubLogoIcon, LockSimpleIcon, SparkleIcon } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

// Where the resume goes, per mode. Keep each line true to the code:
// BYOK keeps the resume in chrome.storage.local and encrypts only the API key
// (extension/src/lib/crypto.ts); hosted encrypts the resume at rest in
// Postgres (backend/supabase/functions/_shared/encrypt.ts) and calls Claude.
const MODES = {
  byok: {
    label: 'Your own API key',
    short: 'Own key',
    holds: 'Resume + API key',
    via: null,
    ai: 'Claude or OpenAI',
    facts: ['Resume saved in your browser only', 'API key encrypted on your device (AES-256-GCM)', 'Goes straight to the AI you pick'],
  },
  hosted: {
    label: 'Cover Me account',
    short: 'Account',
    holds: 'Resume + sign-in',
    via: 'Cover Me server',
    ai: 'Claude',
    facts: ['Resume encrypted at rest (AES-256-GCM)', 'Resume text is never logged', 'Pro syncs your history across devices'],
  },
} as const
type Mode = keyof typeof MODES

function Node({ icon, title, sub, dim }: { icon: ReactNode; title: string; sub?: string; dim?: boolean }) {
  return (
    <div className={cn('flex w-[84px] shrink-0 flex-col items-center gap-2 text-center transition-opacity duration-500 sm:w-[124px]', dim && 'opacity-35')}>
      <span className="flex size-14 items-center justify-center rounded-[16px] bg-night-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">{icon}</span>
      <span className="text-[13px] font-semibold text-white">{title}</span>
      {sub && <span className="-mt-1 text-[11px] text-[var(--on-night-2)]">{sub}</span>}
    </div>
  )
}

// A dashed wire with small packets travelling along it.
function Wire({ off }: { off?: boolean }) {
  return (
    <div className="relative mt-[27px] h-[2px] min-w-6 flex-1">
      <svg className="absolute inset-0 h-[2px] w-full overflow-visible" aria-hidden="true">
        <line x1="0" y1="1" x2="100%" y2="1" stroke={off ? 'rgba(255,255,255,0.15)' : 'var(--brand)'} strokeWidth="2" className={off ? undefined : 'flow-line'} />
      </svg>
      {!off && [0, 1].map((i) => (
        <span key={i} className="packet absolute -top-[3px] size-2 rounded-[2px] bg-[#C7D2FE]" style={{ animationDelay: `${i * 0.9}s` }} />
      ))}
    </div>
  )
}

export function PrivacyBand() {
  const [mode, setMode] = useState<Mode>('byok')
  const m = MODES[mode]
  return (
    <section className="container py-10">
      <div className="relative grid items-center gap-12 overflow-hidden rounded-[32px] bg-night px-16 py-16 max-md:px-5 max-md:py-12 grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-[72px]">
        <GithubLogoIcon
          weight="fill"
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[22%] -left-[6%] size-[520px] rotate-[-12deg] text-night-2 max-lg:hidden"
        />
        <div className="relative flex min-w-0 flex-col gap-5">
          <h2 className="text-[clamp(32px,3.6vw,48px)] leading-[1.05] !text-[var(--on-night)]">Your resume stays yours</h2>
          <p className="text-[17px] leading-[1.6] text-[var(--on-night-2)]">
            Pick how it runs. Either way the code is open source, and the extension has no ads or tracking.
          </p>
          <a
            href="https://github.com/TheLinc/cover-me"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/20 px-5 py-2.5 text-[14px] text-[var(--on-night)] transition-colors hover:border-white/50"
          >
            Read the code on GitHub <ArrowUpRightIcon size={13} />
          </a>
        </div>

        <div className="relative flex min-w-0 flex-col gap-7 rounded-[24px] bg-white/[0.04] p-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] max-md:p-4">
          <div role="radiogroup" aria-label="How Cover Me runs" className="flex w-fit gap-1 rounded-full bg-night p-1">
            {(Object.keys(MODES) as Mode[]).map((k) => (
              <button
                key={k}
                role="radio"
                aria-checked={mode === k}
                onClick={() => setMode(k)}
                className={cn(
                  'rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-300',
                  mode === k ? 'bg-white text-ink' : 'text-[var(--on-night-2)] hover:text-white',
                )}
              >
                <span className="sm:hidden">{MODES[k].short}</span>
                <span className="max-sm:hidden">{MODES[k].label}</span>
              </button>
            ))}
          </div>

          {/* Data flow: browser → (server) → AI */}
          <div aria-hidden="true" className="flex items-start pt-2">
            <Node icon={<BrowserIcon size={26} />} title="Your browser" sub={m.holds} />
            <Wire />
            <Node
              icon={<span className="relative"><CloudIcon size={26} /><LockSimpleIcon size={12} weight="fill" className="absolute -bottom-1 -right-1.5 text-[#C7D2FE]" /></span>}
              title={m.via ?? 'No server'}
              sub={m.via ? 'Encrypted at rest' : 'Skipped entirely'}
              dim={!m.via}
            />
            <Wire />
            <Node icon={<SparkleIcon size={26} />} title={m.ai} sub="Writes the letter" />
          </div>

          <ul key={mode} className="grid gap-2.5 sm:grid-cols-3">
            {m.facts.map((f, i) => (
              <li
                key={f}
                className="animate-[fadeUp_.4s_ease_both] rounded-[14px] bg-night-2 p-4 text-[13px] leading-[1.45] text-white"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
