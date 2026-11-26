# Feature map

Extension features under the names a user would use, with where each lives and how to reach it. The site's map is `web/feature-map.md`. Drive these in a test browser with the helpers in `scripts/e2e.ts`: run `pnpm build`, then import them from a script run with `tsx`.

## Popup

- Generate: the popup's first tab (`src/popup/pages/GeneratePage.tsx`). Reads the job on the active tab, then "Generate Cover Letter".
- Paste a job by hand: Generate, "Can't detect the posting? Paste it manually →". Job title, company and description, then "Generate Cover Letter". `generateFromPastedJob` in the driver.
- Can't read this site: the card Generate shows when it can't read the page's site ("We can't read this site yet", `src/popup/components/ScrapeFailure.tsx`). "Request this site" sends the host to a PostHog survey under a random ID. `showUnreadSite` in the driver opens it.
- Email me when it's supported: the unticked box between the site field and "Request this site" (sent with the request) and under the thanks line afterwards (saves as it changes), Hosted and signed in only; the account email shows on hover over "me". Ticking saves a `site_watch` row; `pnpm notify-site <host>` in backend/ emails everyone waiting. `seedHostedSession` in the driver signs the popup in.
- Own API key: Settings tab. A Claude or OpenAI key saved encrypted in `chrome.storage.local`; letters are written in the extension (`src/lib/ai/index.ts`), not on Cover Me's server. `seedOwnKey` in the driver sets one up with a resume.

## Editor tab

- Edit a tailored resume: the popup's result or History, "Edit". Opens `src/editor/index.html?id=<entry id>` in a tab. `openEditor` in the driver seeds a tailored resume and opens it.
