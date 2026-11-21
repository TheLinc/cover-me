# Feature map

Site features under the names a visitor would use, with the route and how to reach each one.

## Guides

- Guides index: `/guides`. Nav, Guides. A card for every entry in `lib/guides.ts`, newest update first.
- Guide page: `/guides/<slug>`. From a card on the index. The layout is `components/site/GuideArticle.tsx`.
- Tool reviews: `/guides/aiapply-review`, `/guides/jobscan-review`, `/guides/teal-review`, `/guides/jobright-review` (with a Jobright vs Simplify section). The old `/guides/cover-me-vs-aiapply`, `-jobscan` and `-teal` addresses redirect here with a 308 (`next.config.ts`).
- Comparisons: `/guides/cover-me-vs-chatgpt`, `/guides/cover-me-vs-rezi`.

## Site header

- Header: every marketing page (`components/site/SiteNav.tsx`). "Sign in" goes to `/auth`. A browser with a session cookie sees "Dashboard" there instead, to `/dashboard`. Phones get the same links from the menu button.

## Sign in

- Sign in and sign up: `/auth`. Header, Sign in, or the footer's Sign in and Upgrade to Pro (`/auth?plan=pro`). Already signed in, it shows "You're signed in." and goes to the dashboard (`/dashboard?upgrade=1` with `plan=pro`, or the `next` path).
