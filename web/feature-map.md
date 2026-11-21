# Feature map

Site features under the names a visitor would use, with the route and how to reach each one.

## Guides

- Guides index: `/guides`. Nav, Guides. A card for every entry in `lib/guides.ts`, newest update first.
- Guide page: `/guides/<slug>`. From a card on the index. The layout is `components/site/GuideArticle.tsx`.
- Tool reviews: `/guides/aiapply-review`, `/guides/jobscan-review`, `/guides/teal-review`, `/guides/jobright-review` (with a Jobright vs Simplify section). The old `/guides/cover-me-vs-aiapply`, `-jobscan` and `-teal` addresses redirect here with a 308 (`next.config.ts`).
- Comparisons: `/guides/cover-me-vs-chatgpt`, `/guides/cover-me-vs-rezi`.
- ChatGPT prompt guides: `/guides/chatgpt-resume-prompts`, `/guides/chatgpt-cover-letter-prompts`. Linked from the footer, the tailoring guide, the ATS score guide and the ATS resume checker.

## Tools

- Free ATS resume checker: `/ats-checker`. Nav, footer, and links from the guides. No account needed; the page is `components/site/AtsChecker.tsx`.

## Site header

- Header: every marketing page (`components/site/SiteNav.tsx`). "Sign in" goes to `/auth`. A browser with a session cookie sees "Dashboard" there instead, to `/dashboard`. Phones get the same links from the menu button.

## Sign in

- Sign in and sign up: `/auth`. Header, Sign in, or the footer's Sign in and Upgrade to Pro (`/auth?plan=pro`). Already signed in, it shows "You're signed in." and goes to the dashboard (`/dashboard?upgrade=1` with `plan=pro`, or the `next` path).

## Account

- Dashboard: `/dashboard`. After sign-in, or Nav, Dashboard. The Plan tile shows a gift trial's end or a paid plan's first payment (`lib/stripe-plan.ts`).
- Settings: `/dashboard/settings`. Account menu, Settings. The Plan section shows Pro with a Trial, Active or Ending pill, the next date (trial end, first payment, renewal or end) from Stripe, and Manage billing (opens the Stripe portal).

## Pages reached from outside links

These have the logo-only header (`components/site/LogoHeader.tsx`), which lines up with the site nav.

- Gift week of Pro: `/redeem/<code>`. From a gift trial link (`pnpm trial-links`). Signed out it asks to sign in; signed in it shows the site nav and a "Start my free week" button.
- Uninstall survey: `/uninstalled`. Chrome opens it after the extension is removed.
- Unsubscribe: `/unsubscribe`. The unsubscribe link in non-account emails.
- Upgraded: `/upgraded`. Stripe Checkout's return page after paying.
