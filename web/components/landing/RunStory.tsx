'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { ArrowRightIcon, CheckIcon, ExclamationMarkIcon, FileDocIcon, FilePdfIcon, UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ExtensionPopup, PopupButton, ProgressStep, type StepState } from './ExtensionPopup'
import { FitScale } from './FitScale'
import { useReducedMotion, useScrollProgress } from './useScrollProgress'
import { BrowserFrame, CELLS, EXAMPLE, Hl, Label, Line, ResumeDoc, TIERS } from './visuals'
import { Ambient } from './Ambient'

// One application, start to finish. Scroll drives a single position x from 0
// to 7 (one unit per chapter) and every layer of the stage derives its state
// from x, so the story plays forwards and backwards with the scrollbar.
const CHAPTERS = [
  { title: "Give it everything you've done", body: 'Upload it once, as a PDF or Word file. Cover Me only uses what is in it, so give it every role and project.' },
  { title: 'Click Cover Me on the posting', body: 'LinkedIn, Indeed, Greenhouse, Lever, Workday and more. Anywhere else, paste it in.' },
  { title: 'It reads what the job asks for', body: 'Every requirement in the posting, sorted into must-haves and nice-to-haves.' },
  { title: "Your resume, in the posting's words", body: 'Same jobs, same facts, in the posting’s words. "Remove irrelevant bullets" drops what this job doesn’t need.' },
  { title: 'A score you can read', body: 'Each requirement you cover adds points. Must-haves count the most.' },
  { title: 'And a cover letter to match', body: 'Written from your resume, about this job. Edit it, then send.' },
  { title: 'Your design, or ours', body: 'A Word file can keep your own design (beta). Or use the clean, ATS-ready Cover Me layout, as PDF or Word.' },
]
const N = CHAPTERS.length
const CHAPTER_VH = 90 // scroll distance per chapter

const STAGE_W = 680
const STAGE_H = 520

// 0 before a, 1 after b, linear between.
const ramp = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)))
const ease = (u: number) => 1 - Math.pow(1 - u, 3)
// Chapter i's layer: fades in over the first 12% of its chapter and out over
// the last 12%, so two layers never show at once.
const FADE = 0.12
const chapter = (x: number, i: number) => Math.min(ramp(x, i, i + FADE), 1 - ramp(x, i + 1 - FADE, i + 1))

// Types `segments` out up to n characters, keeping segment boundaries.
// Render each segment inside its own element, never as a bare text node next
// to siblings: a segment shrinks to '' when the visitor scrolls back, React
// then removes its text node, and browser translation has already swapped
// that node out, so removeChild throws (#185).
function typed(segments: string[], n: number) {
  let left = Math.max(0, Math.round(n))
  return segments.map((s) => {
    const part = s.slice(0, left)
    left -= part.length
    return part
  })
}

// Requirements in the order they appear in the posting.
const FOUND = EXAMPLE.posting.flat().flatMap((s) => (typeof s === 'string' ? [] : [s.k]))

// ── Chapter 0: the master resume goes in ────────────────────────────────────

const ROLES = ['Marketing Lead · Brightline', 'Growth Marketing Manager · Juniper Labs', 'Marketing Coordinator · Fieldstone Co.', 'Marketing Intern · Denver Botanic Gardens']

// A long resume: three sheets, the top one showing every role.
function MasterStack({ className, style }: { className?: string; style?: CSSProperties }) {
  const sheet = 'absolute inset-0 rounded-[6px] bg-white shadow-[0_18px_40px_-20px_rgba(30,27,75,0.35)]'
  return (
    <div className={cn('relative', className)} style={style}>
      <div className={sheet} style={{ transform: 'translate(14px, 14px) rotate(3deg)' }} />
      <div className={sheet} style={{ transform: 'translate(7px, 7px) rotate(1.5deg)' }} />
      <div className={cn(sheet, 'flex flex-col gap-2 overflow-hidden p-5')}>
        <Label>Master resume</Label>
        <div className="text-[16px] font-semibold text-ink">{EXAMPLE.candidate}</div>
        <Line w="70%" />
        {ROLES.map((r) => (
          <div key={r} className="mt-1 flex flex-col gap-1.5">
            <div className="truncate text-[11px] font-semibold text-ink-2">{r}</div>
            <Line w="94%" />
            <Line w="82%" />
          </div>
        ))}
        <div className="mt-1 text-[11px] font-semibold text-ink-2">Projects · Volunteering · Skills</div>
        <Line w="76%" />
      </div>
    </div>
  )
}

function UploadLayer({ x, c }: { x: number; c?: boolean }) {
  const v = 1 - ramp(x, 1 - FADE, 1)
  const drop = ease(ramp(x, 0.14, 0.5))
  const over = ramp(x, 0.34, 0.46) - ramp(x, 0.5, 0.58)
  const saved = ramp(x, 0.54, 0.64)
  return (
    <div className="absolute inset-0" style={{ opacity: v }}>
      <ExtensionPopup
        className={cn('absolute', c ? 'inset-x-0 bottom-[2%]' : 'right-[3%] top-[8%] w-[290px]')}
        style={c ? undefined : { transform: `translateX(${-ease(ramp(x, 0.62, 0.86)) * 175}px)` }}
        status="Resume"
      >
        <div className="flex flex-col gap-3 px-4 py-4">
          <div
            className={cn('flex flex-col items-center gap-1.5 rounded-[12px] border border-dashed px-4 py-5 text-center transition-colors', over > 0.3 ? 'border-brand bg-ext-elevated' : 'border-ext-border')}
          >
            <UploadSimpleIcon size={20} className="text-ext-soft" />
            <span className="text-[13px] font-semibold">{saved > 0.5 ? 'Replace resume' : 'Upload your resume'}</span>
            <span className="text-[11px] text-ext-muted">Upload once, used for every application</span>
            <span className="mt-1 flex gap-1.5">
              <span className="rounded-[6px] bg-ext-elevated px-2 py-0.5 text-[10.5px] text-ext-text">PDF</span>
              <span className="rounded-[6px] bg-ext-elevated px-2 py-0.5 text-[10.5px] text-ext-text">Word (.docx)</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-[12px] bg-ext-elevated px-3 py-2.5" style={{ opacity: saved, transform: `translateY(${(1 - saved) * 8}px)` }}>
            <FileDocIcon size={20} className="shrink-0 text-ext-soft" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[12px] font-semibold">{EXAMPLE.candidate.replace(' ', '_')}_Resume.docx</span>
              <span className="text-[10.5px] text-ext-muted">4 roles · 1 project · skills</span>
            </span>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-[rgba(99,102,241,0.28)] px-2 py-0.5 text-[10.5px] text-ext-soft">
              <CheckIcon size={10} weight="bold" />
              Saved
            </span>
          </div>
        </div>
      </ExtensionPopup>
      {/* The stack drops into the upload area. */}
      <MasterStack
        className={cn('absolute', c ? 'left-[23%] top-[2%] h-[250px] w-[200px]' : 'left-[4%] top-[9%] h-[380px] w-[270px]')}
        style={{
          transformOrigin: 'center',
          transform: c ? `translateY(${drop * 320}px) scale(${1 - drop * 0.6})` : `translate(${drop * 370}px, ${-drop * 20}px) scale(${1 - drop * 0.65})`,
          opacity: 1 - ramp(x, 0.44, 0.54),
        }}
      />
    </div>
  )
}

// ── Chapter 1 and 2: the posting in the browser ─────────────────────────────

function ToolbarIcon({ x }: { x: number }) {
  const press = ramp(x, 0.48, 0.55) - ramp(x, 0.55, 0.62)
  const burst = ramp(x, 0.5, 0.78)
  const cursor = ease(ramp(x, 0.08, 0.48))
  return (
    <span
      className={cn('relative flex size-7 items-center justify-center rounded-[8px]', x > 0.5 && 'bg-white')}
      style={{ scale: `${1 - press * 0.16}` }}
    >
      <Image src="/logo.png" width={18} height={18} alt="" className="rounded-[5px]" />
      {burst > 0 && burst < 1 &&
        Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 -ml-[1.25px] -mt-[5px] h-[10px] w-[2.5px] rounded-[2px] bg-brand"
            style={{ opacity: 1 - burst, transform: `rotate(${i * 45 + 22.5}deg) translateY(${-14 - burst * 22}px) scaleY(${0.3 + burst * 0.7})` }}
          />
        ))}
      {x < 1.05 && (
        <svg
          className="absolute left-[calc(50%-3px)] top-[calc(50%-2px)] z-10"
          width="22"
          height="22"
          viewBox="0 0 20 20"
          style={{ translate: `${(1 - cursor) * -260}px ${(1 - cursor) * 240}px`, opacity: ramp(x, 0.06, 0.14) * (1 - ramp(x, 0.85, 1)) }}
        >
          <path d="M3 2l13 7.2-5.6 1.4L8 16z" fill="#1E1B4B" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

function PostingText({ x }: { x: number }) {
  // Requirements light up one after another through chapter 1.
  const lit = ramp(x, 1.08, 1.75) * FOUND.length
  let j = -1
  return (
    <>
      {EXAMPLE.posting.map((line, li) => (
        <p key={li} className="text-[13px] leading-[1.75] text-body">
          {line.map((s, si) => {
            if (typeof s === 'string') return <span key={si}>{s}</span>
            j += 1
            const sweep = Math.min(1, Math.max(0, lit - j))
            const nice = EXAMPLE.niceToHave.includes(s.k)
            return (
              <span
                key={si}
                className={cn('-mx-0.5 rounded-[4px] px-0.5 transition-colors', sweep >= 1 && 'font-medium text-brand-ink')}
                style={{
                  backgroundImage: `linear-gradient(${nice ? '#EEEEFF' : '#DCDCFE'}, ${nice ? '#EEEEFF' : '#DCDCFE'})`,
                  backgroundSize: `${sweep * 100}% 100%`,
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {s.text ?? s.k}
              </span>
            )
          })}
        </p>
      ))}
    </>
  )
}

function ReadPopup({ x }: { x: number }) {
  const found = Math.floor(ramp(x, 1.08, 1.75) * FOUND.length + 1e-6)
  const shown = FOUND.slice(0, found)
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-baseline justify-between text-[12px]">
        <span className={cn('text-ext-muted', found === 0 && 'pulse')}>{found === 0 ? 'Reading the posting…' : 'Requirements found'}</span>
        <span className="font-mono text-[15px] tabular-nums text-ext-text">{found}</span>
      </div>
      {TIERS.map((t) => (
        <div key={t.label} className="flex min-h-[46px] flex-col gap-1.5">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ext-muted">{t.label}</div>
          <div className="flex flex-wrap gap-1">
            {shown
              .filter((k) => t.keywords.includes(k))
              .map((k) => (
                <span key={k} className="animate-[fadeUp_.3s_ease] rounded-[6px] bg-ext-elevated px-1.5 py-0.5 text-[10.5px] text-ext-text">
                  {k}
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BrowserLayer({ x, c }: { x: number; c?: boolean }) {
  const open = ease(ramp(x, 0.58, 0.82))
  const out = ramp(x, 2 - FADE, 2)
  const enter = ramp(x, 0, FADE)
  return (
    <div
      className="absolute inset-0"
      style={{ opacity: Math.min(enter, 1 - out), transform: `scale(${1 - out * 0.06}) translateX(${-out * 40}px)` }}
    >
      <BrowserFrame url="job-boards.greenhouse.io/northwind/jobs/4821" toolbar={<ToolbarIcon x={x} />} className="h-full">
        <div className={cn('flex flex-col gap-3', c ? 'p-5' : 'p-7 pr-[290px]')}>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[11px] bg-ink text-[18px] font-semibold text-white">N</div>
            <div>
              <div className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{EXAMPLE.role}</div>
              <div className="text-[12.5px] text-subtle">{EXAMPLE.company} · Remote · Full time</div>
            </div>
          </div>
          <div className="mt-3 text-[12px] font-semibold text-ink-2">About the role</div>
          <PostingText x={x} />
          {!c && (
            <>
              <Line w="92%" className="mt-2" />
              <Line w="84%" />
              <Line w="66%" />
              <span className="mt-3 w-fit rounded-full bg-brand-strong px-4 py-2 text-[12px] font-semibold text-white">Apply</span>
            </>
          )}
        </div>
        {/* The popup grows out of the toolbar icon. */}
        <div className={cn('absolute right-3 w-[250px] origin-top-right', c ? 'bottom-3' : 'top-2')} style={{ opacity: open, scale: `${0.85 + open * 0.15}` }}>
          <ExtensionPopup status={x < 1.75 ? 'Reading…' : 'Posting read'}>
            <ReadPopup x={x} />
          </ExtensionPopup>
        </div>
      </BrowserFrame>
    </div>
  )
}

// ── Chapter 3: the rewrite (layer takes x - 1, see Stage) ─────────────────

function Bullet({ x, at, before, after }: { x: number; at: number; before: string; after: string[] }) {
  const u = ramp(x, at, at + 0.2)
  const strike = ramp(u, 0, 0.3)
  const typedOut = typed(after, ramp(u, 0.45, 1) * after.join('').length)
  if (u < 0.45) {
    return (
      <p className="relative text-[13px] leading-[1.6] text-subtle" style={{ opacity: 1 - ramp(u, 0.3, 0.45) }}>
        <span
          className="bg-no-repeat"
          style={{ backgroundImage: 'linear-gradient(#6B635D,#6B635D)', backgroundSize: `${strike * 100}% 1.5px`, backgroundPosition: '0 58%' }}
        >
          {before}
        </span>
      </p>
    )
  }
  return (
    <p className="text-[13px] leading-[1.6] text-body">
      <span>{typedOut[0]}</span>
      {typedOut[1] && <Hl className="font-medium">{typedOut[1]}</Hl>}
      <span>{typedOut[2]}</span>
      {u < 1 && <span className="ml-px inline-block h-[14px] w-[2px] translate-y-[2px] animate-pulse bg-brand" />}
    </p>
  )
}

// With "Remove irrelevant bullets" on, a bullet this job doesn't need is struck and folds away.
function Dropped({ x }: { x: number }) {
  const u = ramp(x, 2.56, 2.72)
  const strike = ramp(u, 0, 0.4)
  const fold = ease(ramp(u, 0.6, 1))
  return (
    <div className="overflow-hidden" style={{ maxHeight: `${(1 - fold) * 48}px`, opacity: 1 - fold, marginTop: `${-fold * 12}px` }}>
      <p className="text-[13px] leading-[1.6] text-subtle">
        <span className="bg-no-repeat" style={{ backgroundImage: 'linear-gradient(#6B635D,#6B635D)', backgroundSize: `${strike * 100}% 1.5px`, backgroundPosition: '0 58%' }}>
          Planned the annual customer conference for 600 attendees
        </span>
        <span className="ml-2 whitespace-nowrap rounded-full bg-gap-tint px-2 py-0.5 text-[10.5px] font-medium text-gap-ink" style={{ opacity: ramp(u, 0.15, 0.35) }}>
          Not needed for this job
        </span>
      </p>
    </div>
  )
}

function RewriteLayer({ x, c }: { x: number; c?: boolean }) {
  const v = chapter(x, 2)
  const at = [2.14, 2.32, 2.5]
  const skills = ramp(x, 2.68, 2.8)
  const roles = at.filter((a) => x >= a + 0.2).length
  const steps: [string, StepState][] = [
    ['Read the posting · 8 requirements', 'done'],
    ['Rewrote summary', x < 2.14 ? 'active' : 'done'],
    [x < 2.68 && x >= 2.14 ? `Rewriting experience (${Math.min(3, roles + 1)} of 3)` : 'Rewrote experience', x < 2.14 ? 'todo' : x < 2.68 ? 'active' : 'done'],
    ['Matching skills', x < 2.68 ? 'todo' : x < 2.82 ? 'active' : 'done'],
  ]
  return (
    <div className={cn('absolute inset-0 flex', c ? 'flex-col justify-center gap-4' : 'items-center gap-6 px-2')} style={{ opacity: v, transform: `translateY(${(1 - v) * 24}px)` }}>
      <div className={cn('flex shrink-0 flex-col gap-3 rounded-[18px] bg-white shadow-[0_30px_70px_-30px_rgba(30,27,75,0.4)]', c ? 'w-full p-6' : 'w-[420px] p-7')}>
        <div className="flex items-center justify-between">
          <Label>Your resume</Label>
          <span
            className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] text-brand-ink transition-opacity"
            style={{ opacity: ramp(x, 2.8, 2.84) }}
          >
            Tailored for {EXAMPLE.company}
          </span>
        </div>
        <div className="text-[18px] font-semibold text-ink">{EXAMPLE.candidate}</div>
        <div className="text-[12px] text-subtle">Marketing Lead · Brightline</div>
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2">Experience</div>
        {EXAMPLE.bullets.map((b, i) => (
          <Bullet key={b.before} x={x} at={at[i]} before={b.before} after={b.after} />
        ))}
        <Dropped x={x} />
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2">Skills</div>
        <div className="relative min-h-[48px]">
          <p className="absolute text-[13px] text-subtle" style={{ opacity: 1 - skills }}>{EXAMPLE.skillsBefore}</p>
          <div className="flex flex-wrap gap-1.5" style={{ opacity: skills }}>
            {EXAMPLE.skillsAfter.map((s, i) => (
              <Hl key={s} className="text-[12px]" >
                <span style={{ opacity: ramp(skills, i * 0.2, i * 0.2 + 0.3) }}>{s}</span>
              </Hl>
            ))}
          </div>
        </div>
      </div>
      <ExtensionPopup className={cn('shrink-0', c ? 'w-full' : 'w-[232px]')} status={x < 2.82 ? 'Tailoring…' : 'Resume tailored'}>
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="h-1.5 rounded-full bg-ext-elevated">
            <div className="h-1.5 rounded-full bg-brand" style={{ width: `${25 + ramp(x, 2.04, 2.82) * 75}%` }} />
          </div>
          <ul className="flex flex-col gap-2">
            {steps.map(([label, state], i) => (
              <ProgressStep key={i} state={state}>{label}</ProgressStep>
            ))}
          </ul>
        </div>
      </ExtensionPopup>
    </div>
  )
}

// ── Chapter 4: the score ──────────────────────────────────────────────────

function Mark({ gap, on }: { gap: boolean; on: boolean }) {
  return (
    <span
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-[6px] text-white transition-all duration-300',
        !on && 'scale-75 border border-dashed border-line bg-transparent',
        on && (gap ? 'bg-gap' : 'bg-brand'),
      )}
    >
      {on && (gap ? <ExclamationMarkIcon size={12} weight="bold" /> : <CheckIcon size={12} weight="bold" />)}
    </span>
  )
}

function ScoreLayer({ x, c }: { x: number; c?: boolean }) {
  const v = chapter(x, 3)
  const checked = Math.floor(ramp(x, 3.12, 3.62) * CELLS.length + 1e-6)
  const score = Math.round(CELLS.slice(0, checked).reduce((s, c) => s + (c.gap ? 0 : c.pts), 0))
  const done = checked === CELLS.length
  const band = score >= 80 ? 'Strong match' : score >= 60 ? 'Fair match' : 'Scoring…'
  let row = -1
  return (
    <div className={cn('absolute inset-0 flex', c ? 'flex-col justify-center gap-4' : 'items-center gap-5 px-2')} style={{ opacity: v, transform: `translateY(${(1 - v) * 24}px)` }}>
      <div className={cn('flex shrink-0 flex-col rounded-[18px] bg-white shadow-[0_30px_70px_-30px_rgba(30,27,75,0.4)]', c ? 'w-full gap-3 p-5' : 'w-[300px] gap-4 p-6')}>
        <Label>Posting vs. your resume</Label>
        {TIERS.map((t) => (
          <div key={t.label} className={cn('gap-2', c ? 'grid grid-cols-2' : 'flex flex-col')}>
            <div className={cn('font-mono text-[10px] uppercase tracking-[0.08em] text-subtle', c && 'col-span-2')}>{t.label}</div>
            {t.keywords.map((k) => {
              row += 1
              const on = row < checked
              const gap = EXAMPLE.gaps.includes(k)
              return (
                <div key={k} className="flex items-center gap-2.5 text-[13px]">
                  <Mark gap={gap} on={on} />
                  <span className={cn(!on && 'text-subtle', on && gap ? 'font-medium text-gap-ink' : 'text-body')}>{k}</span>
                  {on && gap && !c && <span className="ml-auto text-[11px] font-medium text-gap-ink">Not on resume</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className={cn('flex min-w-0 flex-col rounded-[18px] bg-white shadow-[0_30px_70px_-30px_rgba(30,27,75,0.4)]', c ? 'gap-4 p-5' : 'flex-1 gap-5 p-6')}>
        <Label>ATS match</Label>
        <div className="flex items-end gap-3">
          <div className="text-[76px] font-semibold leading-[0.85] tracking-[-0.04em] text-ink tabular-nums">{score}</div>
          <div className="flex flex-col gap-1.5 pb-0.5">
            <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-[12px] font-medium', done ? 'bg-brand-tint text-brand-ink' : 'bg-panel text-subtle')}>
              {band}
            </span>
            <span className="text-[13px] text-subtle">out of 100</span>
          </div>
        </div>
        <div>
          <div className="relative flex h-2 gap-1">
            <div className="w-[60%] rounded-full bg-line" />
            <div className="w-[20%] rounded-full bg-[#C7D2FE]" />
            <div className="w-[20%] rounded-full bg-brand" />
            <span
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-[5px] border-[3px] border-white bg-ink shadow transition-[left] duration-300"
              style={{ left: `${score}%` }}
            />
          </div>
          <div className="mt-2 flex gap-1 text-[11px] text-subtle">
            <span className="w-[60%]">Weak</span>
            <span className="w-[20%]">Fair</span>
            <span className="w-[20%]">Strong</span>
          </div>
        </div>
        <div>
          <div className="mb-2 text-[12px] font-medium text-ink-2">How it adds up</div>
          <div className="flex h-10 gap-1">
            {CELLS.map((c, i) => {
              const on = i < checked
              return (
                <div
                  key={c.k}
                  className={cn(
                    'flex items-center justify-center rounded-[6px] font-mono text-[10.5px] font-medium transition-all duration-300',
                    !on && 'border border-dashed border-line text-transparent',
                    on && (c.gap ? 'border-2 border-dashed border-gap bg-gap-tint text-gap-ink' : 'bg-brand text-white'),
                  )}
                  style={{ width: `${c.pts}%` }}
                >
                  {c.gap ? `−${Math.round(c.pts)}` : `+${Math.round(c.pts)}`}
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex gap-1 text-[11px] text-subtle">
            {TIERS.map((t) => (
              <div key={t.label} className="border-t border-line pt-1.5" style={{ width: `${t.points}%` }}>
                {t.label} · {t.points}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Chapter 5: the letter ─────────────────────────────────────────────────

const LETTER = [`Dear ${EXAMPLE.company} team,`, ...EXAMPLE.letter]
const LETTER_LEN = LETTER.join('').length

function LetterLayer({ x, c }: { x: number; c?: boolean }) {
  const v = chapter(x, 4)
  const out = typed(LETTER, ramp(x, 4.12, 4.68) * LETTER_LEN)
  const ready = ease(ramp(x, 4.7, 4.84))
  return (
    <div className="absolute inset-0" style={{ opacity: v, transform: `translateY(${(1 - v) * 24}px)` }}>
      {/* Slides in behind the letter once both are done: the full application. */}
      <ResumeDoc
        className={cn('absolute left-[2%] top-[9%] w-[300px] origin-bottom-left', c && 'hidden')}
        style={{ opacity: ready, transform: `rotate(${-6 * ready}deg) translateX(${(1 - ready) * 60}px)` }}
      />
      <div
        className={cn('absolute left-1/2 flex -translate-x-1/2 flex-col gap-3 rounded-[18px] bg-white p-7 shadow-[0_30px_70px_-30px_rgba(30,27,75,0.45)]', c ? 'top-[2%] w-full' : 'top-[4%] w-[400px]')}
        style={{ translate: c ? undefined : `${ready * 70}px 0` }}
      >
        <Label>Cover letter</Label>
        <div className="min-h-[18px] text-[14px] font-semibold text-ink">{out[0]}</div>
        {out.slice(1).map((p, i) => (
          <p key={i} className="min-h-[60px] text-[13px] leading-[1.65] text-body">
            <span>{p}</span>
            {out[i + 2] === '' && p.length > 0 && p.length < LETTER[i + 1].length && <Caret />}
          </p>
        ))}
        <Line w="88%" />
        <Line w="70%" />
      </div>
      <ExtensionPopup
        className={cn('absolute bottom-[4%] w-[290px]', c ? 'right-0' : 'right-[2%]')}
        status="Ready to apply"
        footer={<><PopupButton primary>Download resume</PopupButton><PopupButton>Copy letter</PopupButton></>}
      >
        <div className="flex items-center justify-between px-4 py-3 text-[12px]">
          <span className="text-ext-muted">{EXAMPLE.company} · {EXAMPLE.role}</span>
        </div>
      </ExtensionPopup>
      <div style={{ opacity: ready }} className={cn('absolute font-mono text-[11px] text-subtle', c ? 'bottom-[34%] left-0' : 'bottom-[6%] left-[4%]')}>
        Resume + letter · about 30 seconds
      </div>
    </div>
  )
}

// ── Chapter 6: what you download, by what you uploaded ─────────────────────

// A tailored resume in miniature: the user's own Word design (any fonts and
// colors, drawn here in teal) or the Cover Me layout (one column, Times, centred
// name, as lib/pdf/resume.ts draws it).
function OutDoc({ kind, title, formats, show }: { kind: 'yours' | 'coverme'; title: string; formats: string[]; show: number }) {
  const yours = kind === 'yours'
  const rule = yours ? 'bg-[#0F6E6E]' : 'bg-body'
  const head = yours ? "font-['Georgia',serif] text-[#0F6E6E]" : "font-['Times_New_Roman',Times,serif] text-ink"
  return (
    <figure className="flex w-[126px] flex-col gap-2" style={{ opacity: show, transform: `translateY(${(1 - show) * 12}px)` }}>
      <div className={cn('flex h-[150px] flex-col gap-1.5 overflow-hidden rounded-[4px] bg-white px-3 py-3 shadow-[0_14px_34px_-16px_rgba(30,27,75,0.4)]', yours && 'border-t-[5px] border-[#0F6E6E]')}>
        <div className={cn('font-bold leading-none', head, yours ? 'text-[14px]' : 'text-center text-[11px]')}>{EXAMPLE.candidate}</div>
        <Line w={yours ? '62%' : '74%'} className={cn('h-[4px]', !yours && 'mx-auto')} />
        {[0, 1].map((i) => (
          <div key={i} className="mt-1 flex flex-col gap-1">
            <div className={cn('text-[6.5px] font-bold uppercase tracking-[0.06em]', head)}>{i ? 'Skills' : 'Experience'}</div>
            <div className={cn('h-px', rule)} />
            <Line w="92%" className="h-[4px]" />
            <Line w="84%" className="h-[4px]" />
            {!i && <Line w="88%" className="h-[4px]" />}
          </div>
        ))}
      </div>
      <figcaption className="flex flex-col gap-1">
        <span className="text-[12.5px] font-medium leading-tight text-ink">{title}</span>
        <span className="flex gap-1">
          {formats.map((f) => <span key={f} className="rounded-full bg-brand-tint px-2 py-0.5 text-[10.5px] text-brand-ink">{f}</span>)}
        </span>
      </figcaption>
    </figure>
  )
}

function Upload({ kind, show }: { kind: 'docx' | 'pdf'; show: number }) {
  const Icon = kind === 'docx' ? FileDocIcon : FilePdfIcon
  return (
    <div className="flex w-[150px] shrink-0 flex-col gap-2 rounded-[14px] bg-white p-3.5 shadow-[0_14px_34px_-18px_rgba(30,27,75,0.35)]" style={{ opacity: show }}>
      <Label>You upload</Label>
      <span className="flex items-center gap-2">
        <Icon size={24} className="shrink-0 text-brand" />
        <span className="text-[14px] font-semibold text-ink">{kind === 'docx' ? 'A Word file' : 'A PDF'}</span>
      </span>
    </div>
  )
}

function OutputLayer({ x, c }: { x: number; c?: boolean }) {
  const v = ramp(x, 6, 6 + FADE)
  const s = (a: number) => ease(ramp(x, a, a + 0.14))
  const arrow = <ArrowRightIcon size={18} className={cn('shrink-0 text-subtle', c && 'rotate-90')} />
  const row = cn('flex', c ? 'flex-col items-start gap-2' : 'items-center gap-4')
  return (
    <div className={cn('absolute inset-0 flex flex-col justify-center', c ? 'gap-5' : 'gap-7 px-4')} style={{ opacity: v, transform: `translateY(${(1 - v) * 24}px)` }}>
      <div className={row}>
        <Upload kind="docx" show={s(6.06)} />
        <span style={{ opacity: s(6.12) }}>{arrow}</span>
        <div className="flex gap-4">
          <OutDoc kind="yours" title="Your design" formats={['Word']} show={s(6.16)} />
          <OutDoc kind="coverme" title="Cover Me layout" formats={['PDF', 'Word']} show={s(6.26)} />
        </div>
      </div>
      <div className={row}>
        <Upload kind="pdf" show={s(6.4)} />
        <span style={{ opacity: s(6.46) }}>{arrow}</span>
        <div className="flex items-center gap-4">
          <OutDoc kind="coverme" title="Cover Me layout" formats={['PDF', 'Word']} show={s(6.5)} />
          <p className="max-w-[150px] text-[12px] leading-[1.5] text-subtle" style={{ opacity: s(6.6) }}>
            Want your own design? Upload the Word file.
          </p>
        </div>
      </div>
    </div>
  )
}

function Caret() {
  return <span className="ml-px inline-block h-[14px] w-[2px] translate-y-[2px] animate-pulse bg-brand" />
}

// ── Stage and section ───────────────────────────────────────────────────────

// Phones get a portrait stage: the same scenes, stacked instead of side by side.
const COMPACT_W = 380
const COMPACT_H = 620

function Stage({ x, compact: c }: { x: number; compact?: boolean }) {
  // The posting-to-letter layers were written for chapters 0 to 4; they now run one chapter later.
  const y = x - 1
  return (
    <div className="relative" style={{ width: c ? COMPACT_W : STAGE_W, height: c ? COMPACT_H : STAGE_H }}>
      {x < 1 && <UploadLayer x={x} c={c} />}
      {y >= 0 && y < 2 && <BrowserLayer x={y} c={c} />}
      {y >= 2 && y < 3 && <RewriteLayer x={y} c={c} />}
      {y >= 3 && y < 4 && <ScoreLayer x={y} c={c} />}
      {y >= 4 && y < 5 && <LetterLayer x={y} c={c} />}
      {x >= 6 && <OutputLayer x={x} c={c} />}
    </div>
  )
}

function ChapterRail({ active, x, onPick }: { active: number; x: number; onPick: (i: number) => void }) {
  return (
    <ol className="flex flex-col">
      {CHAPTERS.map((c, i) => {
        const fill = ramp(x, i, i + 1)
        const on = i === active
        return (
          <li key={c.title}>
            <button onClick={() => onPick(i)} className="group flex w-full gap-4 py-3 text-left">
              <span className="relative mt-1 w-[3px] shrink-0 self-stretch overflow-hidden rounded-full bg-line">
                <span className="absolute inset-x-0 top-0 rounded-full bg-brand" style={{ height: `${fill * 100}%` }} />
              </span>
              <span className="flex flex-col gap-1.5">
                <span className="flex items-baseline gap-3">
                  <span className={cn('font-mono text-[12px]', on ? 'text-brand-strong' : 'text-subtle')}>0{i + 1}</span>
                  <span
                    className={cn(
                      'text-[19px] font-medium tracking-[-0.02em] transition-colors duration-300',
                      on ? 'text-ink' : 'text-subtle group-hover:text-ink-2',
                    )}
                  >
                    {c.title}
                  </span>
                </span>
                <span
                  className={cn(
                    'grid pl-7 text-[15px] leading-[1.55] text-ink-2 transition-[grid-template-rows,opacity] duration-500',
                    on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <span className="overflow-hidden">{c.body}</span>
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Heading() {
  return (
    <div className="flex flex-col gap-4">
      <Eyebrow>How it works</Eyebrow>
      <h2 className="text-[clamp(32px,3.6vw,48px)] leading-[1.05]">Watch one application get tailored</h2>
    </div>
  )
}

// Below the lg breakpoint the stage switches to its portrait layout.
function useCompact() {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const on = () => setCompact(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return compact
}

export function RunStory() {
  const ref = useRef<HTMLElement>(null)
  const p = useScrollProgress(ref)
  const reduced = useReducedMotion()
  const compact = useCompact()
  const x = p * N
  const active = Math.min(N - 1, Math.floor(x))

  const pick = (i: number) => {
    const el = ref.current
    if (!el) return
    const travel = el.offsetHeight - window.innerHeight
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + ((i + 0.85) / N) * travel, behavior: 'smooth' })
  }

  const summary = (
    <p className="sr-only">
      Example: a long master resume is uploaded once, as a PDF or Word file. On a {EXAMPLE.company} {EXAMPLE.role} posting, Cover Me
      finds 8 requirements, rewrites three resume bullets and the skills list in the posting&apos;s words without adding anything new,
      leaves out a bullet the job doesn&apos;t need, scores the tailored resume {EXAMPLE.score} out of 100 with HubSpot as the one gap,
      and writes a cover letter from the resume. A Word upload downloads in its own design as Word, or in the Cover Me layout as PDF or
      Word; a PDF upload downloads in the Cover Me layout.
    </p>
  )

  // Reduced motion: every chapter as a still frame, stacked.
  if (reduced) {
    return (
      <section id="how-it-works" className="container py-28 max-md:py-20">
        <Heading />
        {summary}
        <div className="mt-10 flex flex-col gap-14">
          {CHAPTERS.map((c, i) => {
            // Each chapter's finished frame: just before its fade-out (the last has none).
            const still = i === N - 1 ? N - 0.01 : i + 1 - FADE - 0.01
            return (
            <div key={c.title} id={i === 4 ? 'ats-score' : undefined} className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[12px] text-brand-strong">0{i + 1}</span>
                <h3 className="text-[22px] font-medium tracking-[-0.02em]">{c.title}</h3>
                <p className="text-[15px] leading-[1.55] text-ink-2">{c.body}</p>
              </div>
              <div inert aria-hidden="true" className="stage-grid rounded-[24px] p-6">
                {compact ? (
                  <FitScale width={COMPACT_W} height={COMPACT_H}><Stage x={still} compact /></FitScale>
                ) : (
                  <FitScale width={STAGE_W} height={STAGE_H}><Stage x={still} /></FitScale>
                )}
              </div>
            </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} id="how-it-works" className="relative" style={{ height: `${N * CHAPTER_VH + 100}vh` }}>
      {/* Nav target for "ATS score": partway into the score chapter. */}
      <span id="ats-score" className="absolute left-0" style={{ top: `${4.6 * CHAPTER_VH}vh` }} aria-hidden="true" />
      {summary}
      <div className="sticky top-16 h-[calc(100svh-4rem)] isolate overflow-hidden">
        <Ambient
          glows={[{ right: '-8%', top: '5%', size: 760, tone: 'brand' }, { left: '-6%', bottom: '-10%', size: 560, tone: 'warm' }]}
          dots={{ left: '2%', top: '8%', w: 380, h: 300 }}
        />
        <div className="container grid h-full items-center gap-12 py-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] max-lg:grid-rows-[auto_minmax(0,1fr)] max-lg:gap-5 max-lg:py-5">
          <div className="flex flex-col gap-8 max-lg:gap-3">
            <div className="max-lg:hidden"><Heading /></div>
            <div className="max-lg:hidden"><ChapterRail active={active} x={x} onPick={pick} /></div>
            {/* Phones: just the current chapter, with a segmented progress bar. */}
            <div className="flex flex-col gap-2 lg:hidden">
              <div className="flex gap-1">
                {CHAPTERS.map((c, i) => (
                  <span key={c.title} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                    <span className="block h-full bg-brand" style={{ width: `${ramp(x, i, i + 1) * 100}%` }} />
                  </span>
                ))}
              </div>
              <div key={active} className="flex animate-[fadeUp_.4s_ease] flex-col gap-1">
                <h3 className="text-[21px] font-medium tracking-[-0.02em]">
                  <span className="mr-2 font-mono text-[12px] text-brand-strong">0{active + 1}</span>
                  {CHAPTERS[active].title}
                </h3>
                <p className="text-[14px] leading-[1.5] text-ink-2">{CHAPTERS[active].body}</p>
              </div>
            </div>
          </div>
          <div inert aria-hidden="true" className="stage-grid flex min-h-0 items-center justify-center self-stretch rounded-[28px] p-8 max-lg:p-4 lg:max-h-[620px] lg:self-center">
            {compact ? (
              <FitScale width={COMPACT_W} height={COMPACT_H} contain>
                <Stage x={x} compact />
              </FitScale>
            ) : (
              <div className="w-full max-w-[680px]">
                <FitScale width={STAGE_W} height={STAGE_H}>
                  <Stage x={x} />
                </FitScale>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
