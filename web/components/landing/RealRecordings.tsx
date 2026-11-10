'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PlayIcon } from '@phosphor-icons/react/dist/ssr'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eyebrow } from '@/components/site/Eyebrow'

// Screen recordings of the real extension on a live posting (source and
// re-shoot scripts: chrome-store/video/how-it-works, local only). The posters
// are stills from each video, served by this site, so nothing loads from
// YouTube until someone presses play (see /privacy, Third-Party Services).
const VIDEOS = [
  { id: 'TCv3RpmLH20', title: 'Keep your own Word design', length: '0:47', poster: '/videos/word-design.webp',
    blurb: 'Upload a Word file, tailor it, and download it in your own fonts and layout.' },
  { id: 'aJ33y-BBKFQ', title: 'Edit it before you send', length: '0:56', poster: '/videos/editor.webp',
    blurb: 'A PDF upload gets the Cover Me layout. Change any line in the editor, then download.' },
  { id: 'Uk7064mIa3o', title: 'Add a skill you really have', length: '0:27', poster: '/videos/missing-skill.webp',
    blurb: 'Add what’s missing in one line and regenerate. Your edits stay.' },
]

// youtube-nocookie: YouTube's privacy-enhanced mode. rel=0 keeps end-of-video
// suggestions to this channel.
const embed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`

export function RealRecordings() {
  const [open, setOpen] = useState<string | null>(null)
  const current = VIDEOS.find((v) => v.id === open)
  return (
    <section id="recordings" className="container py-24 max-md:py-16">
      <div className="flex items-end justify-between gap-10 max-lg:flex-col max-lg:items-start">
        <div className="flex flex-col gap-4">
          <Eyebrow>Real recordings</Eyebrow>
          <h2 className="max-w-[620px] text-[clamp(30px,3.4vw,44px)] leading-[1.05]">See it on a real job posting</h2>
        </div>
        <p className="max-w-[380px] text-[16px] leading-[1.55] text-ink-2">
          The real extension on a live posting, with a made-up candidate. Waiting is sped up.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {VIDEOS.map((v) => (
          <button key={v.id} type="button" onClick={() => setOpen(v.id)} className="group flex flex-col gap-3 text-left">
            <span className="relative block overflow-hidden rounded-[18px] bg-panel shadow-[0_20px_50px_-24px_rgba(30,27,75,0.35)]">
              <Image src={v.poster} alt="" width={960} height={540} className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
              <span className="absolute inset-0 flex items-center justify-center bg-[rgba(20,17,43,0.12)] transition-colors group-hover:bg-[rgba(20,17,43,0.2)]">
                <span className="flex size-14 items-center justify-center rounded-full bg-white/95 text-brand-strong shadow-lg transition-transform group-hover:scale-105">
                  <PlayIcon size={22} weight="fill" />
                </span>
              </span>
              <span className="absolute bottom-3 right-3 rounded-full bg-[rgba(20,17,43,0.82)] px-2.5 py-1 font-mono text-[11px] text-white">{v.length}</span>
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[17px] font-medium tracking-[-0.01em] text-ink group-hover:text-brand-strong">{v.title}</span>
              <span className="text-[14px] leading-[1.5] text-ink-2">{v.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-[min(1100px,94vw)] gap-4 p-4 sm:p-5">
          <DialogTitle className="sr-only">{current?.title ?? 'Cover Me video'}</DialogTitle>
          <DialogDescription className="sr-only">{current?.blurb}</DialogDescription>
          <Tabs value={open ?? undefined} onValueChange={setOpen}>
            <TabsList className="h-auto flex-wrap justify-start gap-1 pr-10">
              {VIDEOS.map((v) => (
                <TabsTrigger key={v.id} value={v.id} className="text-[13px]">{v.title}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {current && (
            <div className="aspect-video w-full overflow-hidden rounded-[12px] bg-ink">
              <iframe
                key={current.id}
                src={embed(current.id)}
                title={current.title}
                className="size-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
