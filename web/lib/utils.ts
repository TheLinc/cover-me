import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Live Chrome Web Store listing — used by every "Install" CTA and the
// SoftwareApplication structured data.
export const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/cover-me-%E2%80%93-ai-cover-lette/bpbnopjgjbimdjjdolhkgimllbgamgpi'
