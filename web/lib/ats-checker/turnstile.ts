type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  execute: (container: HTMLElement) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const WAIT_MS = 15_000
const CLICK_WAIT_MS = 120_000

let loading: Promise<Turnstile> | null = null

function load(): Promise<Turnstile> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing')))
    script.onerror = () => {
      loading = null
      reject(new Error('Turnstile failed to load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export function preloadBotCheck() {
  if (SITE_KEY) load().catch(() => undefined)
}

// Tokens are single use and expire after 300 seconds, so each check gets a new one
// (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
export async function botCheckToken(container: HTMLElement): Promise<string | null> {
  if (!SITE_KEY) return null
  let turnstile: Turnstile
  try {
    turnstile = await load()
  } catch {
    return null
  }
  return new Promise((resolve) => {
    let timer = setTimeout(() => finish(null), WAIT_MS)
    let widgetId = ''
    function finish(token: string | null) {
      clearTimeout(timer)
      if (widgetId) turnstile.remove(widgetId)
      resolve(token)
    }
    widgetId = turnstile.render(container, {
      sitekey: SITE_KEY,
      action: 'ats-check',
      execution: 'execute',
      appearance: 'interaction-only',
      callback: (token: string) => finish(token),
      'before-interactive-callback': () => {
        clearTimeout(timer)
        timer = setTimeout(() => finish(null), CLICK_WAIT_MS)
      },
      'error-callback': () => finish(null),
    })
    turnstile.execute(container)
  })
}
