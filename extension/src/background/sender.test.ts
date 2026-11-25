import { beforeEach, expect, test, vi } from 'vitest'
import { acceptsMessage } from './sender'

beforeEach(() => {
  vi.stubGlobal('chrome', { runtime: { id: 'cover-me', getURL: (p: string) => `chrome-extension://cover-me/${p}` } })
})

const popup = { id: 'cover-me', url: 'chrome-extension://cover-me/src/popup/index.html' }
const welcomeTab = { id: 'cover-me', url: 'chrome-extension://cover-me/src/welcome/index.html', tab: { id: 1 } as chrome.tabs.Tab }
const contentScript = { id: 'cover-me', url: 'https://careers.example.com/jobs/1', tab: { id: 2 } as chrome.tabs.Tab }
const POPUP_TYPES = ['SCRAPE_TAB', 'GENERATE_FROM_TAB', 'GENERATE_FROM_MANUAL', 'TAILOR_FROM_TAB', 'TAILOR_FROM_MANUAL', 'CHECK_DESIGN', 'GOOGLE_SIGN_IN']

test.each(POPUP_TYPES)('%s comes from extension pages only', (type) => {
  expect(acceptsMessage(type, popup)).toBe(true)
  expect(acceptsMessage(type, welcomeTab)).toBe(true)
  expect(acceptsMessage(type, contentScript)).toBe(false)
})

test('the answer box rewrite comes from a content script', () => {
  expect(acceptsMessage('ANSWER_REWRITE', contentScript)).toBe(true)
})

test('another extension is refused', () => {
  expect(acceptsMessage('ANSWER_REWRITE', { ...contentScript, id: 'other' })).toBe(false)
  expect(acceptsMessage('SCRAPE_TAB', { id: 'other', url: 'chrome-extension://other/popup.html' })).toBe(false)
})
