# Feature map

Extension features under the names a user would use, with where each lives and how to reach it. The site's map is `web/feature-map.md`. Drive these in a test browser with the helpers in `scripts/e2e.ts`: run `pnpm build`, then import them from a script run with `tsx`.

## Popup

- Generate: the popup's first tab (`src/popup/pages/GeneratePage.tsx`). Reads the job on the active tab, then "Generate Cover Letter".
- This posting: the card at the top of Generate (`src/popup/components/PostingCard.tsx`). Each time the Generate tab opens, the worker reads the active tab on the device only (`PREVIEW_TAB`, `src/background/frames.ts`). The card shows the employer's logo (`src/content/logo.ts`, or the company's first letter), title, company and site. With no posting found it shows "Couldn't find a job posting here" with LinkedIn jobs and Indeed jobs links that open a new tab, and the buttons read "Try anyway: …".
- Update button: right end of the Generate header (`src/popup/components/UpdateReady.tsx`). "Update" restarts the extension into the newer version Chrome has, and hides while a letter or resume is generating. An unpacked build never gets one, so tests stub `chrome.runtime.requestUpdateCheck` with `ctx.addInitScript`, and turn on developer mode first or Chromium disables the extension on restart.
- Paste a job by hand: Generate, "Wrong job? Paste it" on the posting card, or "Paste a job description instead" when none was found. Job title, company and description, then "Generate Cover Letter". `generateFromPastedJob` in the driver.
- Can't read this site: the card Generate shows when it can't read the page's site ("We can't read this site yet", `src/popup/components/ScrapeFailure.tsx`). "Request this site" sends the host to a PostHog survey under a random ID. `showUnreadSite` in the driver opens it.
- Email me when it's supported: the unticked box between the site field and "Request this site" (saved with the request), Hosted and signed in only. After sending, the card shows a check and "Site request submitted", and the thanks line adds "and we'll email you" when the box was ticked (Try again if that save failed); the account email shows on hover over "me". Ticking saves a `site_watch` row; `pnpm notify-site <host>` in backend/ emails everyone waiting. `seedHostedSession` in the driver signs the popup in.
- Resume: the popup's second tab (`src/popup/pages/ResumePage.tsx`). Upload a PDF, Word or TXT file. A PDF or Word file is kept in `chrome.storage.local` (`designFile:<id>`, pointed to by `resume.file`), and when `READER_VERSION` is newer than `resume.readerVersion`, opening the popup reads it again (`src/lib/reread.ts`). Set `resume.readerVersion` to 1 and reopen the popup to see it.
- Re-upload your resume: the one-time note on the Resume tab for a PDF or Word resume with no stored file and an older reader version. "Not now" sets `readerNote: 'seen'`.
- Resume template on a result: Generate, a finished tailored resume, the "Template" row above Download (`src/popup/components/TemplatePicker.tsx`). "Change" opens Classic, Modern, Compact and Minimal, plus an accent colour for Modern. Pro only; Free and own key see the last three locked with the upgrade buttons.
- Default resume template: Settings tab, "Resume template". Saved in `chrome.storage.local` (`resumeTemplate`, `resumeAccent`) and sent with each Hosted tailor, which applies it for Pro.
- Own API key: Settings tab. A Claude or OpenAI key saved encrypted in `chrome.storage.local`; letters are written in the extension (`src/lib/ai/index.ts`), not on Cover Me's server. `seedOwnKey` in the driver sets one up with a resume.
- About you: Generate, "About you" above the buttons. Facts used in every letter and resume, saved as `candidateContext` in `chrome.storage.local`. Closed and filled, it shows the first line.
- Tailor resume: Generate, "Tailor Resume to Job". Its options (one page, trim bullets, summary) sit behind the "Options: …" line under the button.
- Tailored result: after a tailor run. The job match ring, "The posting also mentions" keywords, "Have experience with any of these? Add it" to regenerate with a note, and Download, Edit and New pinned at the bottom.
- History: the History tab (`src/popup/pages/HistoryPage.tsx`). View opens a card and shows its letters. Delete swaps the card for "Deleted … Undo" for 5 s, then the service worker deletes it (`src/background/delete.ts`), also if the popup closes first. Pro accounts get "Search ↗" beside the title, which opens the dashboard.
- Resume: the Resume tab. Upload a PDF, Word or text resume; "Reading your resume…" while it's read.

## Editor tab

- Edit a tailored resume: the popup's result or History, "Edit". Opens `src/editor/index.html?id=<entry id>` in a tab. `openEditor` in the driver seeds a tailored resume and opens it.
- Resume templates in the editor: the "Template" row above the PDF preview. Picking one redraws the preview and saves it on the resume and as the default; Modern also has an accent colour. Free and own key can click a locked template to preview it, with Download off and nothing saved.
