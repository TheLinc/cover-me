// Debug logging — OFF by default.
//
// SECURITY: these logs include the job description, the resume text, and the
// full model prompt — all of which contain PII. This is a developer-only aid
// and MUST stay disabled in any shipped build. It is gated on a runtime flag
// so it can never be on unless you explicitly turn it on.
//
// Toggle from the service worker console (chrome://extensions → "service worker"):
//   chrome.storage.local.set({ debugMode: true })   // enable
//   chrome.storage.local.set({ debugMode: false })  // disable
//
// Logs appear in the service worker console (background) for scraping/flow data
// and in the popup console for popup-side calls.

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

// Keep the cache in sync if the flag is toggled at runtime.
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && DEBUG_KEY in changes) {
      cached = changes[DEBUG_KEY].newValue === true
    }
  })
} catch {
  // chrome.storage unavailable in this context — ignore.
}

/** Log a labelled value. No-op unless debugMode is enabled. */
export async function debugLog(label: string, data: unknown): Promise<void> {
  if (!import.meta.env.DEV) return
  if (!(await isDebugEnabled())) return
  // eslint-disable-next-line no-console
  console.log(`%c[CoverMe] ${label}`, 'color:#7c3aed;font-weight:bold;', data)
}

/** Log several labelled values together in a collapsible group. No-op unless enabled. */
export async function debugGroup(label: string, entries: Record<string, unknown>): Promise<void> {
  if (!import.meta.env.DEV) return
  if (!(await isDebugEnabled())) return
  // eslint-disable-next-line no-console
  console.groupCollapsed(`%c[CoverMe] ${label}`, 'color:#7c3aed;font-weight:bold;')
  for (const [k, v] of Object.entries(entries)) {
    // eslint-disable-next-line no-console
    console.log(`${k}:`, v)
  }
  // eslint-disable-next-line no-console
  console.groupEnd()
}
