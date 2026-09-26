import { PatternNote } from '@/components/brand/PatternNote'
import { DressForm, SuitForm } from './scene-paths'

// Hand-authored so it can draw itself (the source art's thread was filled shapes).
// Drawn in order: a loop into the suit's collar, suit → dress, a tail off the dress.
// Separate paths because Chrome restarts dashes per sub-path, which breaks pathLength.
const THREAD = [
  'M312 549 C373 472 503 457 523 518 C533 564 442 567 433 503 C427 411 579 290 747 286',
  'M957 354 C1036 411 1112 465 1173 510',
  'M1341 552 C1448 552 1539 488 1516 411 C1501 358 1440 350 1435 389 C1432 442 1539 465 1722 462',
]

const NOTE = 'absolute max-md:hidden'

// The H1 as a picture: one resume, cut into two different fits.
export function HeroScene() {
  return (
    <figure data-hero-scene className="relative mx-auto w-full max-w-[900px]">
      <svg
        viewBox="280 62 1480 1049"
        className="h-auto w-full"
        role="img"
        aria-label="Two dress forms, one wearing a suit and one a dress, both cut from the same resume and joined by a red thread."
      >
        <SuitForm />
        <DressForm />
        {THREAD.map((d, i) => (
          <path
            key={d}
            d={d}
            pathLength={1}
            className="hero-thread fill-none stroke-thread"
            style={{ animationDelay: `${0.5 + i * 0.8}s` }}
            strokeWidth={4}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <PatternNote className={`${NOTE} left-[44%] top-[19%]`}>Same resume</PatternNote>
      <PatternNote className={`${NOTE} left-0 top-[74%] leading-[1.6]`}>
        Tailored for:
        <br />
        <span className="text-ink">Frontend engineer</span>
      </PatternNote>
      <PatternNote className={`${NOTE} right-0 top-[74%] text-right leading-[1.6]`}>
        Tailored for:
        <br />
        <span className="text-ink">Design engineer</span>
      </PatternNote>
    </figure>
  )
}
