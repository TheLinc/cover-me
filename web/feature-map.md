# Feature map

Site features under the names a visitor would use, with the route and how to reach each one.

## Guides

- Guides index: `/guides`. Nav, Guides. A card for every entry in `lib/guides.ts`, newest update first.
- Guide page: `/guides/<slug>`. From a card on the index. The layout is `components/site/GuideArticle.tsx`.
- Tool reviews: `/guides/aiapply-review`, `/guides/jobscan-review`, `/guides/teal-review`, `/guides/jobright-review` (with a Jobright vs Simplify section), `/guides/careerflow-review` (with a Careerflow vs Teal section). The old `/guides/cover-me-vs-aiapply`, `-jobscan` and `-teal` addresses redirect here with a 308 (`next.config.ts`).
- Comparisons: `/guides/cover-me-vs-chatgpt`, `/guides/cover-me-vs-rezi`.
- Free ATS resume checkers list: `/guides/best-free-ats-resume-checkers`. Eleven checkers compared on free limits, account rules and results, each limit linked to its source. Linked from the ATS resume checker and the free Jobscan alternatives guide.
- ChatGPT prompt guides: `/guides/chatgpt-resume-prompts`, `/guides/chatgpt-cover-letter-prompts`. Linked from the footer, the tailoring guide, the ATS score guide and the ATS resume checker.
- Application questions guide: `/guides/how-to-answer-job-application-questions`. Five common written questions with a sample answer each, and a section on drafting answers with the right-click menu. Linked from the tailoring guide and the ChatGPT cover letter prompts guide.
- Workday application status guide: `/guides/workday-application-status`. What Submitted, In Progress, Completed and Withdrew mean, sourced from HR guides and Workday's manual. Linked from `/for/workday` through the board's `related` field in `lib/boards.ts`.

## Tools

- Free ATS resume checker: `/ats-checker`. Nav, footer, and links from the guides. No account needed; the page is `components/site/AtsChecker.tsx`.
- Resume keywords by job: `/resume-keywords`, and a page per role at `/resume-keywords/<role>` (such as `/resume-keywords/sales`). Footer, Guides column. Copy per role in `lib/roles.ts`; the counts come from `lib/role-keywords.json`, written by hand-run `scripts/role-keywords.mjs`.

## Home

- Homepage: `/`. The hero's install button, the "How it works" story with its bottom dock, Pricing (`#pricing`) and the closing section (`#get-started`).
- Hero line: the small line under the hero's install button, with the free plan's limits (`components/landing/Hero.tsx`).
- Questions: the homepage FAQ above the closing section, each answer folded open on click (`components/landing/Faq.tsx`, questions and answers in `content.ts`).
- Privacy panel: the dark "Your resume stays yours" band above Pricing, with its own key / account switch and the "For developers" note (`components/landing/PrivacyBand.tsx`, facts in `privacy-modes.ts`).
- Job board pages: `/for/<board>` (such as `/for/linkedin`). Linked from the guides and from search. One page per board in `lib/boards.ts`.

## Install from a phone

- Send to computer: on a touch screen, the hero, nav, dock, pricing, closing, guide and `/for/<board>` install buttons, and the ATS checker's, become a send button ("Send this to my computer", or "Send to computer" in the nav and dock) (`components/site/SendToComputer.tsx`). It opens the share sheet, or an email when there's none, with a link back to the same page tagged `utm_campaign=<placement>-phone-send`.
- Return banner: that link opened on a computer shows "Sent from your phone?" under the header of any marketing page, with an install button.

## Site header

- Header: every marketing page (`components/site/SiteNav.tsx`). "Sign in" goes to `/auth`. A browser with a session cookie sees "Dashboard" there instead, to `/dashboard`. Phones get the same links from the menu button.

## Sign in

- Sign in and sign up: `/auth`. Header, Sign in, or the footer's Sign in and Upgrade to Pro (`/auth?plan=pro`). Already signed in, it shows "You're signed in." and goes to the dashboard (`/dashboard?upgrade=1` with `plan=pro`, or the `next` path).

## Account

- Dashboard: `/dashboard`. After sign-in, or Nav, Dashboard. The Plan tile shows a gift trial's end or a paid plan's first payment (`lib/stripe-plan.ts`). A notice from `lib/notices.ts` shows under the greeting until it's closed on this device or until 00:00 UTC on its `until` date. A new ID shows again to people who closed an older one. With several open, the last entry wins.
- Settings: `/dashboard/settings`. Account menu, Settings. The Plan section shows Pro with a Trial, Active or Ending pill, the next date (trial end, first payment, renewal or end) from Stripe, and Manage billing (opens the Stripe portal).

## Pages reached from outside links

These have the logo-only header (`components/site/LogoHeader.tsx`), which lines up with the site nav.

- Gift week of Pro: `/redeem/<code>`. From a gift trial link (`pnpm trial-links`). Signed out it asks to sign in; signed in it shows the site nav and a "Start my free week" button.
- Uninstall survey: `/uninstalled`. Chrome opens it after the extension is removed.
- Unsubscribe: `/unsubscribe`. The unsubscribe link in non-account emails.
- Upgraded: `/upgraded`. Stripe Checkout's return page after paying.
