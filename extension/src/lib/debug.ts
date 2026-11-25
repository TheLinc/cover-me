// Dev builds only, and off until chrome.storage.local.set({ debugMode: true }) in the service worker
// console: these logs hold the posting, the resume and the prompt (https://github.com/TheLinc/cover-me/commit/9f4ea308).

const DEBUG_KEY = 'debugMode'

let cached: boolean | undefined

export async function isDebugEnabled(): Promise<boolean> {
  if (cached !== undefined) return cached
  try {
    const r = await chrome.storage.local.get(DEBUG_KEY)
    cached = r[DEBUG_KEY] === true
  } catch {
    cached = false
  }
  return cached
}

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && DEBUG_KEY in changes) {
      cached = changes[DEBUG_KEY].newValue === true
    }
  })
// No chrome global when eval/run.ts imports this under Node (#261).
} catch {}

export async function debugLog(label: string, data: unknown): Promise<void> {
  if (!import.meta.env.DEV) return
  if (!(await isDebugEnabled())) return
  console.log(`%c[CoverMe] ${label}`, 'color:#7c3aed;font-weight:bold;', data)
}

export async function debugGroup(label: string, entries: Record<string, unknown>): Promise<void> {
  if (!import.meta.env.DEV) return
  if (!(await isDebugEnabled())) return
  console.groupCollapsed(`%c[CoverMe] ${label}`, 'color:#7c3aed;font-weight:bold;')
  for (const [k, v] of Object.entries(entries)) {
    console.log(`${k}:`, v)
  }
  console.groupEnd()
}
