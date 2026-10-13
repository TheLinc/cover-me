'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowSquareOutIcon, DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { postingHost, type ApplicationDetail, type ApplicationSummary } from '@/lib/applications'
import { downloadLetter, downloadResume, loadDetail } from '@/lib/application-actions'
import { CopyLetterButton } from '../CopyLetterButton'
import { LocalDate } from '../LocalDate'

const DATE = { month: 'short', day: 'numeric', year: 'numeric' } as const

// Everything for one application: the ATS result, every letter and tailored
// resume, the interview mark and delete. Its detail is fetched on first open.
export function ApplicationDetailsSheet({ app, open, onOpenChange, busy, onToggleInterview, onDelete }: {
  app: ApplicationSummary
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: string | null
  onToggleInterview: () => void
  onDelete: () => void
}) {
  const [detail, setDetail] = useState<ApplicationDetail | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const host = postingHost(app.url)
  const result = app.tailoredResumes[0] // newest first, from the summary

  const load = useCallback(() => {
    setState('loading')
    loadDetail(app.id).then((d) => { setDetail(d); setState('idle') }, () => setState('error'))
  }, [app.id])

  useEffect(() => {
    if (open && !detail && state === 'idle') load()
  }, [open, detail, state, load])

  async function download(run: () => Promise<void>) {
    try { await run() } catch { toast.error("Couldn't download it. Try again.") }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{app.title || 'Untitled role'}</SheetTitle>
          <SheetDescription>
            {app.company || 'Unknown company'} · Applied <LocalDate iso={app.createdAt} options={DATE} />
            {host && (
              <> · <a href={app.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-strong hover:underline">{host}<ArrowSquareOutIcon size={12} aria-hidden /></a></>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onToggleInterview} disabled={busy === 'interview'}>
            {busy === 'interview' && <Spinner className="size-3.5" />}
            {app.interviewAt ? 'Remove interview mark' : 'Mark as got an interview'}
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete} disabled={busy === 'delete'}>Delete</Button>
        </div>

        {result && result.atsScore !== null && (
          <section className="mt-6">
            <h3 className="text-[13px] font-semibold text-foreground">ATS match</h3>
            <p className="mt-1 text-[22px] font-semibold text-foreground">{result.atsScore}</p>
            {result.atsGaps && result.atsGaps.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[12.5px] text-muted-foreground">Missing:</span>
                {result.atsGaps.map((gap) => <Badge key={gap} variant="outline">{gap}</Badge>)}
              </div>
            )}
          </section>
        )}

        <div aria-live="polite" className="mt-6">
          {state === 'loading' && <p className="flex items-center gap-2 text-[13px] text-muted-foreground"><Spinner className="size-3.5" />Loading</p>}
          {state === 'error' && (
            <p className="text-[13px] text-muted-foreground">
              Couldn&apos;t load this application.{' '}
              <button type="button" className="text-brand-strong underline" onClick={load}>Try again</button>
            </p>
          )}
        </div>

        {detail && (
          <>
            {detail.coverLetters.length > 0 && (
              <section className="mt-2">
                <h3 className="text-[13px] font-semibold text-foreground">Cover letters</h3>
                {detail.coverLetters.map((l) => (
                  <article key={l.id} className="mt-3 rounded-[10px] border border-border p-4">
                    <p className="text-[12px] text-muted-foreground"><LocalDate iso={l.createdAt} options={DATE} /></p>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-[13px] leading-[1.6] text-foreground">{l.letter}</pre>
                    <div className="mt-2 flex items-center gap-4">
                      <CopyLetterButton letter={l.letter} />
                      <Button variant="outline" size="sm" onClick={() => download(() => downloadLetter(detail, l))}>
                        <DownloadSimpleIcon size={14} aria-hidden />Download
                      </Button>
                    </div>
                  </article>
                ))}
              </section>
            )}
            {detail.tailoredResumes.length > 0 && (
              <section className="mt-6">
                <h3 className="text-[13px] font-semibold text-foreground">Tailored resumes</h3>
                {detail.tailoredResumes.map((r) => (
                  <article key={r.id} className="mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-border p-4">
                    <div className="min-w-0">
                      <p className="text-[12px] text-muted-foreground"><LocalDate iso={r.createdAt} options={DATE} /></p>
                      {typeof r.resume.atsScore === 'number' && (
                        <p className="text-[13px] text-foreground">
                          ATS {r.resume.atsScore}
                          {r.resume.atsGaps && r.resume.atsGaps.length > 0 && <> · missing: {r.resume.atsGaps.join(', ')}</>}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => download(() => downloadResume(detail.title, r.resume))}>
                      <DownloadSimpleIcon size={14} aria-hidden />Download
                    </Button>
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
