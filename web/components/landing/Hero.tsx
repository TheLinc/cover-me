import type { CSSProperties } from 'react'
import Image from 'next/image'
import { CheckIcon, FilePdfIcon, GoogleChromeLogoIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { CHROME_STORE_URL } from '@/lib/utils'
import { STORE_RATING } from '@/lib/structured-data'
import { Ambient } from './Ambient'
import { BrowserFrame, EXAMPLE } from './visuals'

// Split hero: the promise on the left, the rewrite on the right. One click on
// the posting, its requirements light up one at a time, and each lands in the
// resume bullet it rewrites; then the score fills and the letter is ready.
// Plays once in about 3.5 s and rests on the result. The markup is the result
// and the `hero-*` keyframes in globals.css only run under no-preference, so
// reduced motion (and a page with no CSS animation) shows the finished frame.
// No client JavaScript: it renders on the server and paints on the first frame.

// Seconds after load. Requirement i lights up at TERM(i) and its bullet is
// rewritten REWRITE later; the missing one lights after the matched ones.
const PRESS = 0.75
const TERM = (i: number) => 1.05 + i * 0.45
const REWRITE = 0.25
const GAP = TERM(EXAMPLE.bullets.length)
const SCORE_AT = GAP + 0.25
const at = (s: number) => ({ '--d': `${s}s` }) as CSSProperties

const SHADOW = 'shadow-[0_1px_2px_rgba(42,42,42,0.06),0_18px_40px_-18px_rgba(42,42,42,0.22)]'

// The posting up to its missing requirement ("...hands-on HubSpot experience."),
// so the snippet stays short enough for the resume to clear the fold on phones.
const PARTS = EXAMPLE.posting.flatMap((line, i) => (i ? [' ', ...line] : line))
const LAST = PARTS.findIndex((p) => typeof p !== 'string' && EXAMPLE.gaps.includes(p.k))
const EXCERPT = [...PARTS.slice(0, LAST + 1), ' experience.']

function Posting() {
  return (
    <div className="flex flex-col gap-3 p-5 pb-14 max-sm:p-4 max-sm:pb-14">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-[7px] bg-ink text-[13px] font-semibold text-white">N</span>
        <span className="flex flex-col">
          <span className="text-[15px] font-semibold leading-tight text-ink">{EXAMPLE.role}</span>
          <span className="text-[12px] text-subtle">{EXAMPLE.company} · Denver, CO<span className="max-sm:hidden"> · Full-time</span></span>
        </span>
        <span className="ml-auto rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-white">Apply</span>
      </div>
      <p className="text-[13.5px] leading-[1.65] text-body max-sm:text-[12.5px]">
        {EXCERPT.map((part, i) => {
          if (typeof part === 'string') return part
          const word = part.text ?? part.k
          const bullet = EXAMPLE.bullets.findIndex((b) => b.after[1] === word)
          if (bullet >= 0) return <mark key={i} className="hero-mark" style={at(TERM(bullet))}>{word}</mark>
          if (EXAMPLE.gaps.includes(part.k)) return <mark key={i} className="hero-mark hero-mark-gap" style={at(GAP)}>{word}</mark>
          return word
        })}
      </p>
    </div>
  )
}

function ToolbarIcon() {
  return (
    <span className="relative ml-2 flex size-7 items-center justify-center rounded-[8px] bg-white">
      <span className="hero-press flex" style={at(PRESS)}>
        <Image src="/logo.png" width={18} height={18} alt="" className="rounded-[5px]" />
      </span>
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className="hero-ray absolute left-1/2 top-1/2 -ml-[1.25px] -mt-[5px] h-[10px] w-[2.5px] rounded-[2px] bg-brand"
          style={{ ...at(PRESS + 0.05), '--r': `${i * 45 + 22.5}deg` } as CSSProperties}
        />
      ))}
      <svg className="hero-cursor absolute left-[calc(50%-3px)] top-[calc(50%-2px)] z-10" width="22" height="22" viewBox="0 0 20 20" style={at(0.1)}>
        <path d="M3 2l13 7.2-5.6 1.4L8 16z" fill="var(--ink)" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function Ring() {
  return (
    <div className={`hero-pop absolute -right-5 -top-10 rounded-full font-sans bg-white p-1.5 max-sm:-right-1 max-sm:-top-6 ${SHADOW}`} style={at(SCORE_AT - 0.1)}>
      <div className="relative size-[76px] max-sm:size-[56px]">
        <svg viewBox="0 0 76 76" className="size-full -rotate-90">
          <circle cx="38" cy="38" r="31" fill="none" stroke="var(--brand-tint)" strokeWidth="7" />
          <circle
            className="hero-ring"
            style={{ ...at(SCORE_AT), '--score': EXAMPLE.score } as CSSProperties}
            cx="38"
            cy="38"
            r="31"
            fill="none"
            stroke="var(--brand)"
            strokeWidth="7"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${EXAMPLE.score} 100`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="hero-count text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink max-sm:text-[17px]" style={{ ...at(SCORE_AT), '--hero-n': EXAMPLE.score } as CSSProperties} />
          <span className="mt-0.5 font-mono text-[7.5px] tracking-[0.12em] text-subtle">ATS</span>
        </div>
      </div>
    </div>
  )
}

// The resume is drawn like the PDF Cover Me downloads (extension/src/lib/pdf/resume.ts):
// Times, centred name and contact line, ruled section titles, title and dates
// on one row. Paper next to the posting's web page, so the two never read as
// the same kind of thing.
const SERIF = "font-['Times_New_Roman',Times,serif]"
const PAPER = 'shadow-[0_1px_2px_rgba(42,42,42,0.1),0_28px_50px_-20px_rgba(42,42,42,0.35)]'

function Section({ title }: { title: string }) {
  return <div className="mt-3 border-b border-body pb-px text-[11px] font-bold uppercase tracking-[0.04em]">{title}</div>
}

function Resume() {
  return (
    <div className="relative -mt-10 ml-auto w-[90%] max-sm:-mt-8 max-sm:w-[96%]">
      <span aria-hidden="true" className="absolute inset-0 translate-x-[7px] translate-y-[7px] rounded-[3px] bg-white shadow-[0_1px_3px_rgba(42,42,42,0.12)]" />
      <div className={`relative rounded-[3px] bg-white px-6 pb-9 pt-5 text-body max-sm:px-4 ${SERIF} ${PAPER}`}>
        <span className="absolute -top-3 left-4 inline-flex items-center gap-1.5 rounded-full bg-night px-2.5 py-1 font-sans text-[11px] text-white">
          <FilePdfIcon size={13} weight="fill" />
          <span><span className="max-[359px]:hidden">{EXAMPLE.candidate.replace(' ', '_')}_</span>Resume.pdf</span>
        </span>
        <Ring />
        <div className="text-center text-[21px] font-bold leading-tight max-sm:text-[19px]">{EXAMPLE.candidate}</div>
        <div className="mt-0.5 text-center text-[10.5px] text-ink-2">(555) 014-2290 &nbsp;|&nbsp; alex.rivera@example.com<span className="max-sm:hidden"> &nbsp;|&nbsp; Denver, CO</span></div>
        <Section title="Experience" />
        <div className="mt-1.5 flex justify-between text-[12px]"><b>Marketing Lead</b><span>Mar 2021 – Present</span></div>
        <div className="flex justify-between text-[12px]"><i>Brightline</i><span>Denver, CO</span></div>
        <ul className="mt-1 flex flex-col gap-1">
          {EXAMPLE.bullets.map(({ before, after: [a, k, b] }, i) => (
            <li key={k} className="flex gap-2 text-[12.5px] leading-[1.5] max-sm:[&:nth-child(3)]:hidden">
              <span>•</span>
              <span className="grid">
                <span className="hero-before [grid-area:1/1]" style={at(TERM(i) + REWRITE)}>{before}</span>
                <span className="hero-after [grid-area:1/1]" style={at(TERM(i) + REWRITE)}>
                  {a}<mark className="-mx-0.5 rounded-[3px] bg-brand-tint px-0.5 text-brand-ink">{k}</mark>{b}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="max-sm:hidden">
          <Section title="Education" />
          <div className="mt-1.5 flex justify-between text-[12px]"><b>University of Colorado Boulder</b><span>2014 – 2018</span></div>
        </div>
        <div className="absolute -bottom-3.5 left-4 flex items-center gap-2 whitespace-nowrap font-sans max-sm:left-3 max-sm:gap-1.5">
          {EXAMPLE.gaps.map((g) => (
            <span key={g} className={`hero-pop rounded-full bg-gap-tint px-2.5 py-1 text-[11.5px] text-gap-ink max-[359px]:px-2 max-[359px]:text-[10.5px] ${SHADOW}`} style={at(SCORE_AT + 0.45)}>
              {g} missing
            </span>
          ))}
          <span className={`hero-pop inline-flex items-center gap-1.5 rounded-full bg-brand-strong px-2.5 py-1 text-[11.5px] font-medium text-white max-[359px]:px-2 max-[359px]:text-[10.5px] ${SHADOW}`} style={at(SCORE_AT + 0.75)}>
            <CheckIcon size={12} weight="bold" />
            Cover letter ready
          </span>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="container pb-10 pt-8">
      <div className="stage-grid relative isolate grid grid-cols-1 items-center gap-12 overflow-hidden rounded-[32px] px-12 py-12 max-lg:px-6 max-md:gap-10 max-md:px-4 max-md:py-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)] xl:px-14">
        <Ambient glows={[{ right: -120, bottom: -260, size: 620, tone: 'warm' }]} />
        <div className="flex flex-col gap-6 max-xl:items-center max-xl:text-center max-md:gap-5">
          <h1 className="text-balance max-w-[640px] text-[clamp(34px,4.1vw,58px)] leading-[1.02] tracking-[-0.035em]">
            Tailor your resume to any job posting.
          </h1>
          <p className="max-w-[460px] text-[18px] leading-[1.5] text-ink-2 max-md:text-[16px]">
            One click on the posting. Cover Me rewrites your resume in its words, scores the match and writes the cover letter.
          </p>
          <div className="flex flex-wrap gap-3 max-xl:justify-center">
            <Button asChild size="lg">
              <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
                <GoogleChromeLogoIcon size={18} />
                Add to Chrome, it&apos;s free
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="max-sm:hidden">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-subtle max-xl:justify-center">
            <span>{STORE_RATING.value.toFixed(1)} on Chrome Web Store</span>
            <span aria-hidden="true">/</span>
            <span>Free with your own key</span>
            <span aria-hidden="true">/</span>
            <span>Open source</span>
          </p>
        </div>
        <div data-hero-stage className="mx-auto w-full max-w-[500px] pt-4">
          <p className="sr-only">
            Cover Me on a {EXAMPLE.company} {EXAMPLE.role} posting: the posting&apos;s requirements are written into the resume bullets, the
            ATS match is {EXAMPLE.score} with {EXAMPLE.gaps.join(', ')} missing, and the cover letter is ready.
          </p>
          <div inert aria-hidden="true">
            <BrowserFrame url={`boards.greenhouse.io/${EXAMPLE.company.toLowerCase()}`} toolbar={<ToolbarIcon />} className={`bg-paper ${SHADOW}`}>
              <Posting />
            </BrowserFrame>
            <Resume />
          </div>
        </div>
      </div>
    </section>
  )
}
