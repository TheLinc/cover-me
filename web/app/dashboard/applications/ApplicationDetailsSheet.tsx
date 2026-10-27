'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowSquareOutIcon, DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { postingHost, type ApplicationDetail, type ApplicationSummary } from '@/lib/applications'
import { downloadLetter, downloadResume, GONE, loadDetail } from '@/lib/application-actions'
import { CopyLetterButton } from '../CopyLetterButton'
import { LocalDate } from '../LocalDate'
import { AtsRing } from './AtsRing'
import { ResumePreview } from './ResumePreview'

const DATE = { month: 'short', day: 'numeric', year: 'numeric' } as const
const TILE = 'rounded-[20px] bg-surface p-5 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)]'
const PILL = 'h-8 gap-1.5 rounded-full px-3.5 text-[13px]'
const TAB = 'rounded-full px-3.5 py-1.5 text-[13px] data-[state=active]:bg-surface data-[state=active]:font-semibold data-[state=active]:text-ink'
// The detail leaves out anything that can't be decrypted.
const UNREADABLE = "Some of these couldn't be opened."

// Everything for one application: the ATS result, then the newest tailored
// resume drawn like its PDF and every letter, in tabs when there are both.
// Its detail is fetched on first open.
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

  // The newest readable resume gets the preview; older ones stay a dated download.
  const [latest, ...older] = detail ? [...detail.tailoredResumes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []

  const resumePanel = (
    <div className="flex flex-col gap-3">
      {detail && detail.tailoredResumes.length < resumes && <p className="text-[13px] text-ink-2">{UNREADABLE}</p>}
      {latest && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink-2">Tailored <LocalDate iso={latest.createdAt} options={DATE} /></p>
            <Button variant="outline" size="sm" className={PILL} onClick={() => download(() => downloadResume(detail!.title, latest.resume))}>
              <DownloadSimpleIcon size={14} aria-hidden />Download PDF
            </Button>
          </div>
          <ResumePreview resume={latest.resume} />
        </>
      )}
      {older.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <h4 className="text-[13px] font-semibold text-ink-2">Earlier versions</h4>
          {older.map((r) => (
            <article key={r.id} className={`${TILE} flex items-center justify-between gap-3 py-4`}>
              <p className="text-[13.5px] text-ink">Tailored <LocalDate iso={r.createdAt} options={DATE} /></p>
              <Button variant="outline" size="sm" className={PILL} onClick={() => download(() => downloadResume(detail!.title, r.resume))}>
                <DownloadSimpleIcon size={14} aria-hidden />Download
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  )

  const letterPanel = (
    <div className="flex flex-col gap-3">
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
    </div>
  )

  const resumeLabel = resumes === 1 ? 'Tailored resume' : `Tailored resumes (${resumes})`
  const letterLabel = letters === 1 ? 'Cover letter' : `Cover letters (${letters})`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[760px]" onCloseAutoFocus={onClosed}>
        <SheetHeader className="space-y-1.5 px-6 pb-6 pr-12 pt-6 text-left max-sm:px-4 max-sm:pr-12">
          <SheetTitle className="text-[20px] leading-snug tracking-[-0.02em] text-ink">{app.title || 'Untitled role'}</SheetTitle>
          <SheetDescription className="text-[13.5px] text-ink-2">
            {app.company || 'Unknown company'} · Applied <LocalDate iso={app.createdAt} options={DATE} />
            {host && (
              <> · <a href={app.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-strong underline-offset-4 hover:underline">{host}<ArrowSquareOutIcon size={12} aria-hidden /></a></>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 px-6 pb-8 max-sm:px-4">
          {result?.atsScore != null && (
            <section aria-label="ATS result" className={`${TILE} flex items-center gap-4 py-4`}>
              <AtsRing score={result.atsScore} size={60} />
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-[13px] text-ink-2">ATS match for the {resumes > 1 ? 'newest ' : ''}tailored resume</p>
                {result.atsGaps && result.atsGaps.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-0.5 text-[12.5px] text-subtle">Missing</span>
                    {result.atsGaps.map((gap) => (
                      <span key={gap} className="rounded-full bg-gap-tint px-2.5 py-0.5 text-[12px] font-medium text-gap-ink">{gap}</span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <div aria-live="polite" className="empty:hidden">
            {state === 'loading' && <p className="flex items-center gap-2 text-[13px] text-ink-2"><Spinner className="size-3.5" />Loading</p>}
            {state === 'error' && (
              <p className="text-[13px] text-ink-2">
                Couldn&apos;t load this application.{' '}
                <Button variant="link" size="sm" className="h-auto p-0 text-[13px]" onClick={load}>Try again</Button>
              </p>
            )}
          </div>

          {resumes > 0 && letters > 0 ? (
            <Tabs defaultValue="resume" className="flex flex-col gap-4">
              <TabsList className="h-auto w-fit rounded-full bg-panel p-1">
                <TabsTrigger value="resume" className={TAB}>{resumeLabel}</TabsTrigger>
                <TabsTrigger value="letter" className={TAB}>{letterLabel}</TabsTrigger>
              </TabsList>
              <TabsContent value="resume" className="mt-0">{resumePanel}</TabsContent>
              <TabsContent value="letter" className="mt-0">{letterPanel}</TabsContent>
            </Tabs>
          ) : resumes > 0 ? (
            <Part id={`resumes-${app.id}`} title={resumeLabel}>{resumePanel}</Part>
          ) : letters > 0 ? (
            <Part id={`letters-${app.id}`} title={letterLabel}>{letterPanel}</Part>
          ) : null}
        </div>

        <footer className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-background px-6 py-4 max-sm:px-4">
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

function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <h3 id={id} className="text-[13px] font-semibold text-ink-2">{title}</h3>
      {children}
    </section>
  )
}
