'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowSquareOutIcon, DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { postingHost, type ApplicationDetail, type ApplicationSummary } from '@/lib/applications'
import { downloadLetter, downloadResume, GONE, loadDetail } from '@/lib/application-actions'
import { CopyLetterButton } from '../CopyLetterButton'
import { LocalDate } from '../LocalDate'

const DATE = { month: 'short', day: 'numeric', year: 'numeric' } as const
const TILE = 'rounded-[20px] bg-surface p-5 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)]'
const PILL = 'h-8 gap-1.5 rounded-full px-3.5 text-[13px]'
// The detail leaves out anything that can't be decrypted.
const UNREADABLE = "Some of these couldn't be opened."

// Everything for one application: every letter and tailored resume first, then
// the ATS result, the interview mark and delete. Its detail is fetched on first open.
export function ApplicationDetailsSheet({ app, open, onOpenChange, onClosed, onGone, busy, onToggleInterview, onDelete }: {
  app: ApplicationSummary
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed: () => void // after the close animation
  onGone: () => void // the application was deleted elsewhere
  busy: string | null
  onToggleInterview: () => void
  onDelete: () => void
}) {
  const [detail, setDetail] = useState<ApplicationDetail | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const host = postingHost(app.url)
  const result = app.tailoredResumes[0] // newest first, from the summary
  const letters = app.coverLetters.length
  const resumes = app.tailoredResumes.length

  // Only the latest fetch may fill the drawer; one for an older summary is ignored.
  const current = useRef(0)
  const load = useCallback(() => {
    const call = ++current.current
    setState('loading')
    loadDetail(app).then(
      (d) => { if (call === current.current) { setDetail(d); setState('idle') } },
      (e) => {
        if (call !== current.current) return
        if (e instanceof Error && e.message === GONE) onGone()
        else setState('error')
      },
    )
  }, [app, onGone])

  // A newer summary (more letters or resumes) drops what was shown, so the next open fetches again.
  useEffect(() => { current.current++; setDetail(null); setState('idle') }, [app.coverLetters, app.tailoredResumes])

  useEffect(() => {
    if (open && !detail && state === 'idle') load()
  }, [open, detail, state, load])

  async function download(run: () => Promise<void>) {
    try { await run() } catch { toast.error("Couldn't download it. Try again.") }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[520px]" onCloseAutoFocus={onClosed}>
        <SheetHeader className="space-y-1.5 px-6 pb-6 pr-12 pt-6 text-left">
          <SheetTitle className="text-[20px] leading-snug tracking-[-0.02em] text-ink">{app.title || 'Untitled role'}</SheetTitle>
          <SheetDescription className="text-[13.5px] text-ink-2">
            {app.company || 'Unknown company'} · Applied <LocalDate iso={app.createdAt} options={DATE} />
            {host && (
              <> · <a href={app.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-strong underline-offset-4 hover:underline">{host}<ArrowSquareOutIcon size={12} aria-hidden /></a></>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-8 px-6 pb-8">
          <div aria-live="polite" className="empty:hidden">
            {state === 'loading' && <p className="flex items-center gap-2 text-[13px] text-ink-2"><Spinner className="size-3.5" />Loading</p>}
            {state === 'error' && (
              <p className="text-[13px] text-ink-2">
                Couldn&apos;t load this application.{' '}
                <Button variant="link" size="sm" className="h-auto p-0 text-[13px]" onClick={load}>Try again</Button>
              </p>
            )}
          </div>

          {letters > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby={`letters-${app.id}`}>
              <h3 id={`letters-${app.id}`} className="text-[13px] font-semibold text-ink-2">{letters === 1 ? 'Cover letter' : `Cover letters (${letters})`}</h3>
              {detail && detail.coverLetters.length < letters && <p className="text-[13px] text-ink-2">{UNREADABLE}</p>}
              {detail?.coverLetters.map((l) => (
                <article key={l.id} className={TILE}>
                  <p className="text-[12.5px] text-subtle"><LocalDate iso={l.createdAt} options={DATE} /></p>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[13.5px] leading-[1.65] text-ink">{l.letter}</pre>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <CopyLetterButton letter={l.letter} className={PILL} />
                    <Button variant="outline" size="sm" className={PILL} onClick={() => download(() => downloadLetter(detail, l))}>
                      <DownloadSimpleIcon size={14} aria-hidden />Download
                    </Button>
                  </div>
                </article>
              ))}
            </section>
          )}

          {resumes > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby={`resumes-${app.id}`}>
              <div className="flex flex-col gap-2.5">
                <h3 id={`resumes-${app.id}`} className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
                  {resumes === 1 ? 'Tailored resume' : `Tailored resumes (${resumes})`}
                  {result.atsScore != null && (
                    <span className="rounded-full bg-brand-tint px-2 py-px text-[12px] font-semibold tabular-nums text-brand-ink">ATS {result.atsScore}</span>
                  )}
                </h3>
                {result.atsGaps && result.atsGaps.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-0.5 text-[12.5px] text-subtle">Missing</span>
                    {result.atsGaps.map((gap) => (
                      <span key={gap} className="rounded-full bg-gap-tint px-2.5 py-0.5 text-[12px] font-medium text-gap-ink">{gap}</span>
                    ))}
                  </div>
                )}
              </div>
              {detail && detail.tailoredResumes.length < resumes && <p className="text-[13px] text-ink-2">{UNREADABLE}</p>}
              {detail?.tailoredResumes.map((r) => (
                <article key={r.id} className={`${TILE} flex items-center justify-between gap-3 py-4`}>
                  <p className="text-[13.5px] text-ink">Tailored <LocalDate iso={r.createdAt} options={DATE} /></p>
                  <Button variant="outline" size="sm" className={PILL} onClick={() => download(() => downloadResume(detail.title, r.resume))}>
                    <DownloadSimpleIcon size={14} aria-hidden />Download
                  </Button>
                </article>
              ))}
            </section>
          )}
        </div>

        <footer className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-background px-6 py-4">
          <Button variant="outline" size="sm" className={PILL} onClick={onToggleInterview} disabled={busy !== null}>
            {busy === 'interview' && <Spinner className="size-3.5" />}
            {app.interviewAt ? 'Remove interview mark' : 'Mark as got an interview'}
          </Button>
          <Button variant="ghost" size="sm" className={`${PILL} ml-auto text-destructive hover:text-destructive`} onClick={onDelete} disabled={busy !== null}>Delete</Button>
        </footer>
      </SheetContent>
    </Sheet>
  )
}
