# Feature map

Extension features under the names a user would use, with where each lives and how to reach it. The site's map is `web/feature-map.md`. Drive these in a test browser with the helpers in `scripts/e2e.ts`: run `pnpm build`, then import them from a script run with `tsx`.

## Popup

- Generate: the popup's first tab (`src/popup/pages/GeneratePage.tsx`). Reads the job on the active tab, then "Generate Cover Letter".
- Paste a job by hand: Generate, "Can't detect the posting? Paste it manually →". Job title, company and description, then "Generate Cover Letter". `generateFromPastedJob` in the driver.
- Own API key: Settings tab. A Claude or OpenAI key saved encrypted in `chrome.storage.local`; letters are written in the extension (`src/lib/ai/index.ts`), not on Cover Me's server. `seedOwnKey` in the driver sets one up with a resume.
