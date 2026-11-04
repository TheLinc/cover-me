'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowSquareOutIcon, CaretRightIcon, DotsThreeVerticalIcon, DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { newest, postingHost, PRO_LINE, STAGE_LABEL, type ApplicationSummary, type Stage, type StageState } from '@/lib/applications'
import { deleteApplication, downloadLetter, downloadResume, GONE, GONE_MESSAGE, loadDetail, setStage } from '@/lib/application-actions'
import { LocalDate } from '../LocalDate'
import { ApplicationDetailsSheet } from './ApplicationDetailsSheet'
import { AtsRing } from './AtsRing'
import { StageMenu } from './StageMenu'

type Busy = 'letter' | 'resume' | 'stage' | 'delete' | null
const UNREADABLE = 'unreadable'

// One application. After a delete it tells the list (onDeleted), or refreshes
// the server-rendered page when there's no list to tell, and renders nothing.
// compact is the board's card: title, company and date, opening the drawer.
// A free account's card has no documents to offer (they stay in its browser).
export function ApplicationCard({ app: initial, pro, onDeleted, onStageChange, compact = false }: {
  app: ApplicationSummary
  pro: boolean
  onDeleted?: (id: string) => void
  // A list that's told keeps the stage itself; without one the card does.
  onStageChange?: (id: string, state: StageState) => void
  compact?: boolean
}) {
  const router = useRouter()
  const [app, setApp] = useState(initial)
  // Once the user sets the stage here, theirs wins over a search that started before it.
  const staged = useRef<StageState | null>(null)
  const left = useRef(false)
  // A stage changed from the open drawer reaches the list once the drawer has
  // closed, so a filter that drops the card doesn't pull the drawer away.
  const pendingStage = useRef<StageState | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [detailsOpen, setDetailsOpenState] = useState(false)
  // Read after an await, where the render's detailsOpen may be out of date.
  const openNow = useRef(false)
  const setDetailsOpen = (open: boolean) => { openNow.current = open; setDetailsOpenState(open) }
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState<Busy>(null)
  // A new search brings a fresh summary for the same application (a letter the
  // extension added since, the server's stage): show that one.
  useEffect(() => {
    setApp(staged.current ? { ...initial, ...staged.current } : initial)
  }, [initial])
  if (deleted) return null

  const host = postingHost(app.url)
  const title = app.title || 'Untitled role'

  const isGone = (e: unknown) => e instanceof Error && e.message === GONE

  // Deleted here, or found deleted elsewhere: the card leaves the list.
  function leave(message: string) {
    // A download and the drawer can both find it gone; leave once.
    if (left.current) return
    left.current = true
    setConfirming(false)
    setDetailsOpen(false)
    setDeleted(true)
    if (onDeleted) onDeleted(app.id)
    else router.refresh()
    toast.success(message)
  }

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
      if (isGone(e)) return leave(GONE_MESSAGE)
      toast.error(e instanceof Error && e.message === UNREADABLE
        ? "This one couldn't be opened. Open Details for the others."
        : "Couldn't download it. Try again.")
    } finally {
      setBusy(null)
    }
  }

  async function changeStage(stage: Stage) {
    if (busy) return
    setBusy('stage')
    try {
      const saved = await setStage(app.id, stage)
      if (!onStageChange) staged.current = saved
      setApp((a) => ({ ...a, ...saved }))
      if (openNow.current) pendingStage.current = saved
      else {
        pendingStage.current = null
        onStageChange?.(app.id, saved)
      }
      // The toast's live region tells a screen reader, with the drawer open
      // too: Radix's aria-hidden leaves [aria-live] regions exposed.
      toast.success(`Moved to ${STAGE_LABEL[saved.stage]}`)
    } catch (e) {
      if (isGone(e)) return leave(GONE_MESSAGE)
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
      leave('Application deleted')
    } catch {
      setDeleteError("Couldn't delete it. Try again.")
    } finally {
      setBusy(null)
    }
  }

  const company = app.company || 'Unknown company'
  const monogram = (app.company || app.title || '?').trim().charAt(0).toUpperCase()
  const score = app.tailoredResumes[0]?.atsScore ?? null

  const dialogs = (
    <>
      <ApplicationDetailsSheet
        app={app}
        pro={pro}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onClosed={() => {
          const pending = pendingStage.current
          pendingStage.current = null
          if (pending) onStageChange?.(app.id, pending)
        }}
        onGone={() => leave(GONE_MESSAGE)}
        busy={busy}
        onStageChange={changeStage}
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
            <Button variant="destructive" onClick={remove} disabled={busy !== null}>
              {busy === 'delete' ? <><Spinner className="size-3.5" />Deleting</> : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  if (compact) {
    return (
      <article className="relative flex flex-col gap-1 rounded-[20px] border border-line/80 bg-surface p-4 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)] transition-shadow duration-200 ease-out hover:shadow-[0_1px_2px_rgba(30,27,75,0.06),0_16px_36px_-16px_rgba(30,27,75,0.32)]">
        {/* The ring sits beside title and company, so a short title leaves no gap under it. */}
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-ink">
              {/* Covers the whole card, so a click anywhere opens the drawer. */}
              <button type="button" data-card={app.id} onClick={() => setDetailsOpen(true)} className="line-clamp-2 cursor-grab text-left after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand">
                {title}
              </button>
            </h3>
            <p className="truncate text-[12.5px] leading-snug text-ink-2">{company}</p>
          </div>
          {score !== null && <AtsRing score={score} size={34} />}
        </div>
        <p className="text-[12px] leading-snug text-subtle">Applied <LocalDate iso={app.createdAt} options={{ month: 'short', day: 'numeric', year: 'numeric' }} /></p>
        {dialogs}
      </article>
    )
  }

  return (
    <article className="group/tile flex flex-col justify-between gap-4 rounded-[20px] border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)] transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:shadow-[0_1px_2px_rgba(30,27,75,0.06),0_16px_36px_-16px_rgba(30,27,75,0.32)]">
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
          {/* The date wraps under a long company name rather than being cut off. */}
          <p className="flex flex-wrap gap-x-1 text-[13px] leading-snug text-ink-2">
            <span className="min-w-0 max-w-full truncate">{company} ·</span>
            <span className="whitespace-nowrap">Applied <LocalDate iso={app.createdAt} options={{ month: 'short', day: 'numeric', year: 'numeric' }} /></span>
          </p>
        </div>
        {score !== null && <div className="-mr-1 -mt-1.5"><AtsRing score={score} size={52} label /></div>}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {!pro && <p className="text-[12.5px] leading-snug text-subtle">{PRO_LINE}</p>}
        {pro && app.coverLetters.length > 0 && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-[13px] hover:border-brand-strong hover:text-brand-strong" onClick={() => download('letter')} disabled={busy !== null} aria-label="Download cover letter">
            {busy === 'letter' ? <Spinner className="size-3.5" /> : <DownloadSimpleIcon size={14} aria-hidden />}
            <span className="cap-center">Cover letter</span>
          </Button>
        )}
        {pro && app.tailoredResumes.length > 0 && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-[13px] hover:border-brand-strong hover:text-brand-strong" onClick={() => download('resume')} disabled={busy !== null} aria-label="Download resume">
            {busy === 'resume' ? <Spinner className="size-3.5" /> : <DownloadSimpleIcon size={14} aria-hidden />}
            <span className="cap-center">Resume</span>
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <StageMenu title={title} stage={app.stage} onChange={changeStage} busy={busy !== null} saving={busy === 'stage'} />
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-[13px] text-ink-2 hover:text-ink" onClick={() => setDetailsOpen(true)}>
            <span className="cap-center max-sm:sr-only">Details</span> <CaretRightIcon size={12} aria-hidden />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-1.5 h-8 w-8 text-ink-2" aria-label={`Actions for ${title}`}>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={busy !== null} onSelect={() => setConfirming(true)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {dialogs}
    </article>
  )
}
