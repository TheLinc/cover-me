import { deleteApplicationFromBackend, ensureValidSession } from '../lib/auth'
import { delayedRuns } from '../lib/delayed-runs'
import { deleteFromHistory, deleteFromTailoredHistory } from '../lib/storage'

export const DELETE_PORT = 'history-delete'
export const UNDO_MS = 5000

interface DeleteTarget {
  key: string
  serverId: string | null
  coverLetterIds: string[]
  tailoredIds: string[]
}

export type DeletePortMessage = { schedule: DeleteTarget } | { cancel: string }
export interface DeleteResult { key: string; error?: string }

async function deleteTarget(t: DeleteTarget): Promise<void> {
  if (t.serverId) {
    const session = await ensureValidSession()
    if (!session) throw new Error('Sign in again in Settings to delete it.')
    await deleteApplicationFromBackend(session.access_token, t.serverId)
    return
  }
  for (const id of t.coverLetterIds) await deleteFromHistory(id)
  for (const id of t.tailoredIds) await deleteFromTailoredHistory(id)
}

// The worker runs History deletes, so one still finishes when the popup
// closes during its undo window: the port's disconnect runs it at once (#342).
export function handleDeletePort(port: chrome.runtime.Port) {
  let open = true
  const runs = delayedRuns(UNDO_MS, (key, error) => {
    if (open) port.postMessage({ key, error } satisfies DeleteResult)
  })
  port.onMessage.addListener((msg: DeletePortMessage) => {
    if ('schedule' in msg) runs.schedule(msg.schedule.key, () => deleteTarget(msg.schedule))
    else runs.cancel(msg.cancel)
  })
  port.onDisconnect.addListener(() => { open = false; runs.flush() })
}
