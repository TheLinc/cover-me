import { PatternNote } from '@/components/brand/PatternNote'
import { STEPS } from './content'

const SVG = { viewBox: '0 0 240 150', 'aria-hidden': true, className: 'h-[150px] w-full' } as const

function EnvelopeArt() {
  return (
    <svg {...SVG}>
      <rect x="40" y="18" width="160" height="116" rx="2" className="fill-tissue stroke-ink" strokeWidth="1.5" />
      <path d="M40 18 L120 70 L200 18" className="fill-none stroke-ink" strokeWidth="1.5" />
      <rect x="58" y="94" width="124" height="26" className="fill-tape" />
      <text x="120" y="111" textAnchor="middle" className="fill-ink font-mono" fontSize="8" letterSpacing="1.2">
        PATTERN · COVER ME
      </text>
      <circle cx="120" cy="70" r="6" className="fill-thread" />
    </svg>
  )
}

function PinnedPostingArt() {
  return (
    <svg {...SVG}>
      <g transform="rotate(-3 120 76)">
        <rect x="60" y="14" width="120" height="124" className="fill-tissue stroke-ink" strokeWidth="1.5" />
        <rect x="74" y="30" width="20" height="20" className="fill-ink" />
        <rect x="100" y="32" width="64" height="6" className="fill-ink" />
        <rect x="100" y="44" width="40" height="4" className="fill-line" />
        {[64, 76, 88, 100, 112].map((y, i) => (
          <rect key={y} x="74" y={y} width={i % 2 ? 72 : 90} height="4" className="fill-line" />
        ))}
      </g>
      <line x1="84" y1="10" x2="96" y2="30" className="stroke-ink" strokeWidth="1.5" />
      <circle cx="84" cy="10" r="5" className="fill-thread" />
      <line x1="160" y1="8" x2="150" y2="28" className="stroke-ink" strokeWidth="1.5" />
      <circle cx="160" cy="8" r="5" className="fill-thread" />
    </svg>
  )
}

function CutResumeArt() {
  return (
    <svg {...SVG}>
      <rect x="50" y="12" width="140" height="128" className="fill-tissue stroke-ink" strokeWidth="1.5" />
      <rect x="64" y="26" width="70" height="7" className="fill-ink" />
      {[44, 56].map((y) => (
        <rect key={y} x="64" y={y} width="110" height="4" className="fill-line" />
      ))}
      <rect x="60" y="68" width="120" height="16" className="fill-none stroke-thread" strokeWidth="1.5" strokeDasharray="5 4" />
      <rect x="64" y="74" width="78" height="4" className="fill-chalk" />
      {[94, 106].map((y) => (
        <rect key={y} x="64" y={y} width="104" height="4" className="fill-line" />
      ))}
      <rect x="60" y="114" width="120" height="16" className="fill-none stroke-thread" strokeWidth="1.5" strokeDasharray="5 4" />
      <rect x="64" y="120" width="92" height="4" className="fill-chalk" />
    </svg>
  )
}

const ART = [EnvelopeArt, PinnedPostingArt, CutResumeArt]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 max-md:py-20">
      <div className="container">
        <div className="reveal mb-14 flex max-w-[640px] flex-col gap-4">
          <PatternNote>How it works</PatternNote>
          <h2 className="text-[clamp(34px,4.4vw,58px)] leading-none text-ink">How does Cover Me work?</h2>
          <p className="text-[16px] leading-[1.7] text-ink-2">
            Cover Me is a free Chrome extension that writes your cover letter and rewrites your resume to match any job posting — ATS keywords extracted, both documents done in seconds.
          </p>
        </div>
        <ol className="grid grid-cols-3 gap-6 max-lg:grid-cols-1">
          {STEPS.map((s, i) => {
            const Art = ART[i]
            return (
              <li key={s.n} className="piece reveal flex flex-col gap-5 p-7 pt-9">
                <PatternNote>Piece {i + 1} of 3</PatternNote>
                <Art />
                <h3 className="font-display text-[24px] leading-[1.15] text-ink">{s.title}</h3>
                <p className="text-[14px] leading-[1.75] text-ink-2">{s.body}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
