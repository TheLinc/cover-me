import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium, type Page } from 'playwright'
import type { TailoredHistoryEntry } from '../src/types'

export async function launchExtension(opts: { dist?: string; headless?: boolean } = {}) {
  const dist = resolve(opts.dist ?? 'dist')
  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cover-me-e2e-')), {
    channel: 'chromium',
    headless: opts.headless ?? false,
    viewport: { width: 420, height: 640 },
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  })
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
  return { ctx, popupUrl: `chrome-extension://${new URL(sw.url()).host}/src/popup/index.html` }
}

// The key format must match getMasterKey and decryptApiKey in lib/crypto.ts (#286).
export async function seedOwnKey(popup: Page, opts: { provider: 'claude' | 'openai'; apiKey: string; resumeText: string }) {
  await popup.evaluate(async ({ provider, apiKey, resumeText }) => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(apiKey)))
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key))
    await chrome.storage.local.set({
      encKey: btoa(String.fromCharCode(...raw)),
      settings: { provider, apiKey: btoa(String.fromCharCode(...iv, ...sealed)), mode: 'byok' },
      resume: { text: resumeText, filename: 'resume.pdf', updatedAt: new Date().toISOString() },
    })
  }, opts)
  await popup.reload()
}

export async function generateFromPastedJob(popup: Page, job: { title: string; company: string; description: string }) {
  await popup.getByText("Can't detect the posting? Paste it manually").click()
  await popup.getByPlaceholder('e.g. Senior Software Engineer').fill(job.title)
  await popup.getByPlaceholder('e.g. Acme Corp (optional)').fill(job.company)
  await popup.getByPlaceholder('Paste the full job description here…').fill(job.description)
  await popup.getByRole('button', { name: 'Generate Cover Letter' }).click()
}

export async function openEditor(page: Page, popupUrl: string, entry: TailoredHistoryEntry) {
  await page.goto(popupUrl)
  await page.evaluate((e) => chrome.storage.local.set({ tailoredHistory: [e] }), entry)
  await page.goto(popupUrl.replace('popup/index.html', `editor/index.html?id=${encodeURIComponent(entry.id)}`))
}
