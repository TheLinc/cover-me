'use client'

import { useState } from 'react'
import { deleteAccount } from '@/lib/account'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

const WORD = 'DELETE'

// Self-serve account deletion (#144). Typing DELETE stands in for a password
// check, which a Google-only account couldn't pass.
export function DeleteAccount({ pro }: { pro: boolean }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    setBusy(true)
    setError('')
    const result = await deleteAccount().catch(() => ({ error: 'Could not reach the server. Please try again.' }))
    if ('deleted' in result && result.deleted) setDone(true)
    else setError(result.error ?? "Couldn't delete your account. Please try again.")
    setBusy(false)
  }

  function onOpenChange(next: boolean) {
    // Signed out by now: leave the dashboard.
    if (done) return window.location.assign('/')
    if (busy) return
    setOpen(next)
    setTyped('')
    setError('')
  }

  return (
    <>
      <p className="text-[13.5px] text-ink-2">Deletes your account and everything stored with it. You can&apos;t undo this.</p>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-full text-destructive hover:border-destructive">
            Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          {done ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Your account is deleted</AlertDialogTitle>
                <AlertDialogDescription>
                  Everything we stored for you is gone, and you&apos;re signed out. To clear what the extension keeps
                  on this computer, remove the extension.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button onClick={() => window.location.assign('/')}>Back to home</Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="flex flex-col gap-2">
                    <p>This deletes your account, your resume and your application history from our servers. You can&apos;t undo it.</p>
                    {pro && <p>Your Pro plan ends now. The rest of this billing period isn&apos;t refunded.</p>}
                    <p>Letters and resumes saved in the extension stay on your computer until you remove the extension.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-delete" className="text-[13px] font-normal normal-case tracking-normal text-ink-2">
                  Type <strong className="font-semibold text-ink">{WORD}</strong> to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={busy}
                />
              </div>
              {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                {/* A plain Button, not AlertDialogAction, which closes the dialog before the delete finishes. */}
                <Button variant="destructive" onClick={remove} disabled={busy || typed.trim() !== WORD}>
                  {busy ? <><Spinner className="size-3.5" />Deleting</> : 'Delete account'}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
