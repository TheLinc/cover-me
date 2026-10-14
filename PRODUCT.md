# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Job seekers applying to many roles. They install the Cover Me Chrome extension, open a job posting, and generate a tailored cover letter and a tailored resume for that posting. The website's dashboard is for signed-in account holders. Its main job (confirmed by the owner, 2026-10-13): find an application and grab its documents again, to apply, follow up, or prepare for an interview. Checking plan and usage, and tracking the search, are secondary.

## Product Purpose

Cover Me turns a job posting plus the user's own resume into a cover letter and a resume tailored to that posting, with an ATS match score and the posting's keywords the resume is missing. Success is an application sent sooner with documents that read as written for that job.

## Positioning

It works on the posting the user already has open: one click in the browser reads the posting and produces both documents. It never invents experience: the tailored resume only rewrites what the user's resume already supports, and missing keywords are shown as gaps, not added.

## Operating Context

- The work happens in the extension popup, on the posting's page. The website is where Pro accounts see every application saved to the account, on any device.
- An application is one job posting (title, company, posting URL, date applied) with its cover letters and tailored resumes, newest first. Tailored resumes carry an ATS score (0 to 100) and missing keywords.
- Tiers: BYOK (own API key, everything local), hosted Free (10 generations to start, then 5 a week, history in the browser only), Pro ($15/month or $35 every 3 months, up to 25 a day, every application saved to the account and searchable on the dashboard).
- Payments happen on the website through Stripe Checkout; the dashboard shows plan, usage and billing.

## Capabilities and Constraints

- Dashboard home (`/dashboard`): plan, usage, upgrade or billing, the newest applications (Pro). Applications page (`/dashboard/applications`, Pro only): every application, searchable by company and title, filterable by date applied and by "got an interview", 30 at a time with Load more. The owner wants these to stay separate pages.
- Per application: download the newest cover letter and tailored resume as PDFs, read and copy every letter, see each resume's ATS score and gaps, open the posting, mark "got an interview" (one yes/no), delete.
- Letter and resume text are personal data, encrypted at rest; the list loads summaries and fetches one application's full text on demand.
- Job tracking (stages, kanban, interview dates) is out of scope.
- UI is built from shadcn components (Radix, Tailwind 3); missing ones are added with the shadcn CLI, never hand-rolled.

## Brand Commitments

- Name: Cover Me. Accent: Cover Me indigo, shared with the extension so the popup and the site match.
- `web/BRAND.md` is the site's brand sheet (palette, Geist type, soft corners, pill buttons, product visuals). The owner likes depth in graphics (weaveos.com), soft rounded corners, and dislikes circular bullet or status markers, thin display serifs, and dense "information vomit" sections.
- Copy: plain words, sentence case, no em dashes.

## Evidence on Hand

- The extension's real outputs: letters and tailored resumes with real ATS scores and gaps. The landing page's product visuals live in `web/components/landing/`.
- No customer testimonials, usage statistics or logos may be invented.

## Product Principles

- The document is the point: getting a letter or resume back out should take one click from where the user lands.
- Show the product's real output, never decoration standing in for it.
- Honest numbers only: the ATS score is the tailored resume's; there is no "before" score.
- Keep each view to one job; detail lives one step away, not on the surface.

## Accessibility & Inclusion

Text contrast at least 4.5:1 (enforced by `pnpm check` in `web/`), keyboard reachable actions, announced results for async actions.
