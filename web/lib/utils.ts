import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/cover-me-ai-resume-tailor/bpbnopjgjbimdjjdolhkgimllbgamgpi'

// The store dashboard splits views by these tags; campaign names the placement (#280).
export function storeUrl(campaign: string): string {
  return `${CHROME_STORE_URL}?${new URLSearchParams({ utm_source: 'cover-me.dev', utm_medium: 'site', utm_campaign: campaign })}`
}
