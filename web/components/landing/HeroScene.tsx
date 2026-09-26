import { PatternNote } from '@/components/brand/PatternNote'
import { DressForm, SCENE_VIEWBOX, SuitForm, THREAD } from './scene-paths'

const NOTE = 'absolute max-md:hidden'

// The H1 as a picture: one resume, cut into two different fits.
export function HeroScene() {
  return (
    <figure data-hero-scene className="relative mx-auto w-full max-w-[900px]">
      <svg
        viewBox={SCENE_VIEWBOX}
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
