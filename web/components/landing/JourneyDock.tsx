'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { GoogleChromeLogoIcon } from '@phosphor-icons/react/dist/ssr'
import { cn, CHROME_STORE_URL } from '@/lib/utils'
import { scrollProgress } from './useScrollProgress'
import { EXAMPLE } from './visuals'

// A floating bar that follows the Northwind application through the story
// (#how-it-works) and keeps the install one click away. Hidden over the hero
// and once the closing call to action (#get-started) is on screen.
const STAGES = ['Posting open', 'Posting read', 'Resume tailored', `Scored ${EXAMPLE.score}`, 'Letter written']

export function JourneyDock() {
  const [state, setState] = useState({ show: false, p: 0 })

  useEffect(() => {
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const story = document.getElementById('how-it-works')
        const end = document.getElementById('get-started')
        const p = story ? scrollProgress(story) : 0
        const pastHero = story ? story.getBoundingClientRect().top < window.innerHeight * 0.5 : window.scrollY > 600
        const beforeEnd = end ? end.getBoundingClientRect().top > window.innerHeight * 0.85 : true
        // Phones: the story shows its own progress bar, so the dock waits until it's over.
        const storyOver = !story || story.getBoundingClientRect().bottom < window.innerHeight
        const roomy = window.matchMedia('(min-width: 1024px)').matches
        setState({ show: pastHero && beforeEnd && (roomy || storyOver), p })
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const x = state.p * STAGES.length
  const done = state.p >= 0.98
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(x))]

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] max-md:bottom-3',
        state.show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
      )}
    >
      <div className="flex w-full max-w-[620px] items-center gap-4 rounded-[18px] bg-ink p-2 pl-3 text-white shadow-[0_24px_60px_-20px_rgba(21,19,43,0.7)] max-md:gap-3">
        <Image src="/logo.png" width={30} height={30} alt="" className="rounded-[8px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="truncate font-medium">
              {done ? 'Northwind application ready' : `${EXAMPLE.company} · ${EXAMPLE.role}`}
            </span>
            <span key={done ? 'done' : stage} className="shrink-0 animate-[fadeIn_.3s_ease] font-mono text-[11px] text-[#C7D2FE] max-sm:hidden">
              {done ? 'Yours next?' : stage}
            </span>
          </div>
          <div className="flex gap-1" aria-hidden="true">
            {STAGES.map((s, i) => (
              <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(1, Math.max(0, x - i)) * 100}%` }} />
              </span>
            ))}
          </div>
        </div>
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-semibold transition-colors',
            done ? 'bg-brand-strong text-white hover:bg-brand-deep' : 'bg-white text-ink hover:bg-brand-tint',
          )}
        >
          <GoogleChromeLogoIcon size={16} />
          <span className="max-sm:hidden">Add to Chrome, free</span>
          <span className="sm:hidden">Install</span>
        </a>
      </div>
    </div>
  )
}
