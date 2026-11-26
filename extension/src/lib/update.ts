import type { CoverJob, TailorJob } from '../types'

const CHECK_EVERY_MS = 60 * 60 * 1000

export interface UpdateState {
  pendingUpdate?: string
  coverJob?: Pick<CoverJob, 'status'>
  tailorJob?: Pick<TailorJob, 'status'>
}

// Reloading stops a run in the background, and a stopped run still counts
// against the user's limit (background/index.ts setCoverJob) (#377).
export function updateReady(state: UpdateState): string | null {
  const running = state.coverJob?.status === 'loading' || state.tailorJob?.status === 'loading'
  return running ? null : state.pendingUpdate ?? null
}

// Chrome's docs call checking on a timer a misuse, since Chrome checks every
// few hours itself, so the popup asks at most once an hour (#377).
export async function checkForUpdate(now = Date.now()): Promise<void> {
  const { lastUpdateCheck } = await chrome.storage.local.get('lastUpdateCheck')
  if (typeof lastUpdateCheck === 'number' && now - lastUpdateCheck < CHECK_EVERY_MS) return
  await chrome.storage.local.set({ lastUpdateCheck: now })
  const result = await chrome.runtime.requestUpdateCheck().catch(() => null)
  if (result?.status === 'update_available') await savePendingUpdate(result.version)
}

export async function savePendingUpdate(version: string): Promise<void> {
  await chrome.storage.local.set({ pendingUpdate: version })
}

export async function clearPendingUpdate(): Promise<void> {
  await chrome.storage.local.remove('pendingUpdate')
}
