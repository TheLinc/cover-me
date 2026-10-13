'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowSquareOutIcon, CaretRightIcon, CheckIcon, DotsThreeVerticalIcon, DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { newest, postingHost, type ApplicationSummary } from '@/lib/applications'
import { deleteApplication, downloadLetter, downloadResume, loadDetail, setInterview } from '@/lib/application-actions'
import { LocalDate } from '../LocalDate'
import { ApplicationDetailsSheet } from './ApplicationDetailsSheet'

type Busy = 'letter' | 'resume' | 'interview' | 'delete' | null
const UNREADABLE = 'unreadable'

// One application. After a delete it tells the list (onDeleted), or refreshes
// the server-rendered page when there's no list to tell, and renders nothing.
export function ApplicationCard({ app: initial, onDeleted, onInterviewChange }: {
  app: ApplicationSummary
  onDeleted?: (id: string) => void
  onInterviewChange?: (id: string, interviewAt: string | null) => void
}) {
  const router = useRouter()
  const [app, setApp] = useState(initial)
  // Once the user sets the mark here, theirs wins over a search that started before it.
  const marked = useRef(false)
  const [deleted, setDeleted] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState<Busy>(null)
  // A new search brings a fresh summary for the same application (a letter the
  // extension added since, the server's interview mark): show that one.
  useEffect(() => {
    setApp((a) => (marked.current ? { ...initial, interviewAt: a.interviewAt } : initial))
  }, [initial])
  if (deleted) return null

  const host = postingHost(app.url)
  const title = app.title || 'Untitled role'

  async function download(kind: 'letter' | 'resume') {
    if (busy) return
    setBusy(kind)
    try {
      const detail = await loadDetail(app)
      if (kind === 'letter') {
        // The newest the card shows, by ID: the detail leaves out what can't be
        // decrypted, and an older letter isn't what the button promised.
        const id = newest(app.coverLetters)?.id
        const letter = detail.coverLetters.find((l) => l.id === id)
        if (!letter) throw new Error(UNREADABLE)
        await downloadLetter(detail, letter)
      } else {
        const id = newest(app.tailoredResumes)?.id
        const resume = detail.tailoredResumes.find((r) => r.id === id)
        if (!resume) throw new Error(UNREADABLE)
        await downloadResume(detail.title, resume.resume)
      }
    } catch (e) {
      toast.error(e instanceof Error && e.message === UNREADABLE
        ? "This one couldn't be opened. Open Details for the others."
        : "Couldn't download it. Try again.")
    } finally {
      setBusy(null)
    }
  }

  async function toggleInterview() {
    if (busy) return
    setBusy('interview')
    try {
      const interviewAt = await setInterview(app.id, !app.interviewAt)
      marked.current = true
      setApp((a) => ({ ...a, interviewAt }))
      onInterviewChange?.(app.id, interviewAt)
      toast.success(interviewAt ? 'Marked as got an interview' : 'Interview mark removed')
    } catch {
      toast.error("Couldn't update it. Try again.")
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (busy) return
    setBusy('delete')
    setDeleteError('')
    try {
      await deleteApplication(app.id)
      setConfirming(false)
      setDetailsOpen(false)
      setDeleted(true)
      if (onDeleted) onDeleted(app.id)
      else router.refresh()
      toast.success('Application deleted')
    } catch {
      setDeleteError("Couldn't delete it. Try again.")
    } finally {
      setBusy(null)
    }
  }

  const company = app.company || 'Unknown company'
  const monogram = (app.company || app.title || '?').trim().charAt(0).toUpperCase()
  const score = app.tailoredResumes[0]?.atsScore ?? null

  return (
    <article className="group/tile flex flex-col gap-4 rounded-[20px] border border-line/80 bg-surface p-5 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)] transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:shadow-[0_1px_2px_rgba(30,27,75,0.06),0_16px_36px_-16px_rgba(30,27,75,0.32)]">
      <header className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-brand-tint text-[15px] font-semibold text-brand-ink">
          {monogram}
        </span>
        <div className="min-w-0 flex-1 pt-px">
          <h3 className="truncate text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
            <button type="button" onClick={() => setDetailsOpen(true)} className="max-w-full truncate rounded-sm text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              {title}
            </button>
          </h3>
          <p className="truncate text-[13px] leading-snug text-ink-2">
            {company} · Applied <LocalDate iso={app.createdAt} options={{ month: 'short', day: 'numeric', year: 'numeric' }} />
          </p>
        </div>
        <div className="-mr-1.5 -mt-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-2" aria-label={`Actions for ${title}`}>
                <DotsThreeVerticalIcon size={18} weight="bold" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>View details</DropdownMenuItem>
              {host && (
                <DropdownMenuItem asChild>
                  <a href={app.url} target="_blank" rel="noreferrer">
                    Go to posting <ArrowSquareOutIcon size={13} className="ml-auto opacity-60" aria-hidden />
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled={busy === 'interview'} onSelect={toggleInterview}>
                {app.interviewAt ? 'Remove interview mark' : 'Mark as got an interview'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirming(true)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {app.coverLetters.length > 0 && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-[13px] hover:border-brand-strong hover:text-brand-strong" onClick={() => download('letter')} disabled={busy === 'letter'} aria-label="Download cover letter">
            {busy === 'letter' ? <Spinner className="size-3.5" /> : <DownloadSimpleIcon size={14} aria-hidden />}
            Cover letter
          </Button>
        )}
        {app.tailoredResumes.length > 0 && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-[13px] hover:border-brand-strong hover:text-brand-strong" onClick={() => download('resume')} disabled={busy === 'resume'} aria-label={score !== null ? `Download resume, ATS score ${score}` : 'Download resume'}>
            {busy === 'resume' ? <Spinner className="size-3.5" /> : <DownloadSimpleIcon size={14} aria-hidden />}
            Resume
            {score !== null && (
              <span aria-hidden className="-mr-1 rounded-full bg-brand-tint px-1.5 py-px text-[11.5px] font-semibold tabular-nums text-brand-ink">{score}</span>
            )}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {app.interviewAt && <Badge variant="interview" className="font-medium"><CheckIcon size={11} weight="bold" aria-hidden />Interview</Badge>}
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2.5 text-[13px] text-ink-2 hover:text-ink" onClick={() => setDetailsOpen(true)}>
            <span className="max-sm:sr-only">Details</span> <CaretRightIcon size={12} aria-hidden />
          </Button>
        </div>
      </div>

      <ApplicationDetailsSheet
        app={app}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        busy={busy}
        onToggleInterview={toggleInterview}
        onDelete={() => setConfirming(true)}
      />

      <AlertDialog open={confirming} onOpenChange={(open) => { if (busy !== 'delete') { setConfirming(open); setDeleteError('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>Its letters and tailored resumes are deleted too.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="text-[13px] text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === 'delete'}>Cancel</AlertDialogCancel>
            {/* A plain Button, not AlertDialogAction, which closes the dialog before the delete finishes. */}
            <Button variant="destructive" onClick={remove} disabled={busy === 'delete'}>
              {busy === 'delete' ? <><Spinner className="size-3.5" />Deleting</> : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
