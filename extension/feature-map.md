# Feature map

Extension features under the names a user would use, with where each lives and how to reach it. The site's map is `web/feature-map.md`. Drive these in a test browser with the helpers in `scripts/e2e.ts`: run `pnpm build`, then import them from a script run with `tsx`.

## Popup

- Generate: the popup's first tab (`src/popup/pages/GeneratePage.tsx`). Reads the job on the active tab, then "Generate Cover Letter".
- Paste a job by hand: Generate, "Can't detect the posting? Paste it manually →". Job title, company and description, then "Generate Cover Letter". `generateFromPastedJob` in the driver.
- Own API key: Settings tab. A Claude or OpenAI key saved encrypted in `chrome.storage.local`; letters are written in the extension (`src/lib/ai/index.ts`), not on Cover Me's server. `seedOwnKey` in the driver sets one up with a resume.
- About you: Generate, "About you" above the buttons. Facts used in every letter and resume, saved as `candidateContext` in `chrome.storage.local`. Closed and filled, it shows the first line.
- Tailor resume: Generate, "Tailor Resume to Job". Its options (one page, trim bullets, summary) sit behind the "Options: …" line under the button.
- Tailored result: after a tailor run. The job match ring, "The posting also mentions" keywords, "Have experience with any of these? Add it" to regenerate with a note, and Download, Edit and New pinned at the bottom.
- History: the History tab (`src/popup/pages/HistoryPage.tsx`). View opens a card and shows its letters. Delete swaps the card for "Deleted … Undo" for 5 s, then the service worker deletes it (`src/background/delete.ts`), also if the popup closes first. Pro accounts get "Search ↗" beside the title, which opens the dashboard.
- Resume: the Resume tab. Upload a PDF, Word or text resume; "Reading your resume…" while it's read.
