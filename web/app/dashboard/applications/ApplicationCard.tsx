'use client'

import { useState } from 'react'
import { ArrowSquareOutIcon, DotsThreeVerticalIcon, DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { newest, postingHost, type ApplicationSummary } from '@/lib/applications'
import { deleteApplication, downloadLetter, downloadResume, loadDetail, setInterview } from '@/lib/application-actions'
import { LocalDate } from '../LocalDate'
import { ApplicationDetailsSheet } from './ApplicationDetailsSheet'

type Busy = 'letter' | 'resume' | 'interview' | 'delete' | null

// One application. Owns its own state: the interview mark it changes, and
// after a delete it renders nothing.
export function ApplicationCard({ app: initial }: { app: ApplicationSummary }) {
  const [app, setApp] = useState(initial)
  const [deleted, setDeleted] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState<Busy>(null)
  if (deleted) return null

  const host = postingHost(app.url)
  const title = app.title || 'Untitled role'

  async function download(kind: 'letter' | 'resume') {
    if (busy) return
    setBusy(kind)
    try {
      const detail = await loadDetail(app.id)
      if (kind === 'letter') {
        const letter = newest(detail.coverLetters)
        if (letter) await downloadLetter(detail, letter)
      } else {
        const resume = newest(detail.tailoredResumes)
        if (resume) await downloadResume(detail.title, resume.resume)
      }
    } catch {
      toast.error("Couldn't download it. Try again.")
    } finally {
      setBusy(null)
    }
  }

  async function toggleInterview() {
    if (busy) return
    setBusy('interview')
    try {
      const interviewAt = await setInterview(app.id, !app.interviewAt)
      setApp((a) => ({ ...a, interviewAt }))
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
      toast.success('Application deleted')
    } catch {
      setDeleteError("Couldn't delete it. Try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-foreground">{title}</h3>
          <p className="text-[13px] text-muted-foreground">
            {app.company || 'Unknown company'} · Applied <LocalDate iso={app.createdAt} options={{ month: 'short', day: 'numeric', year: 'numeric' }} />
            {host && (
              <> · <a href={app.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-strong hover:underline">{host}<ArrowSquareOutIcon size={12} aria-hidden /></a></>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {app.interviewAt && <Badge variant="interview">Interview</Badge>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${title}`}>
                <DotsThreeVerticalIcon size={18} weight="bold" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {host && (
                <DropdownMenuItem asChild>
                  <a href={app.url} target="_blank" rel="noreferrer">Go to posting</a>
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
      </div>

      {(app.coverLetters.length > 0 || app.tailoredResumes.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {app.coverLetters.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => download('letter')} disabled={busy === 'letter'}>
              {busy === 'letter' ? <Spinner className="size-3.5" /> : <DownloadSimpleIcon size={14} aria-hidden />}
              Download cover letter
            </Button>
          )}
          {app.tailoredResumes.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => download('resume')} disabled={busy === 'resume'}>
              {busy === 'resume' ? <Spinner className="size-3.5" /> : <DownloadSimpleIcon size={14} aria-hidden />}
              Download resume
            </Button>
          )}
        </div>
      )}

      <Button variant="link" className="h-auto self-start p-0 text-[13px]" onClick={() => setDetailsOpen(true)}>View details</Button>

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
    </Card>
  )
}
