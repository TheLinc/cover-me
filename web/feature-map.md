# Feature map

Site features under the names a visitor would use, with the route and how to reach each one.

## Guides

- Guides index: `/guides`. Nav, Guides. A card for every entry in `lib/guides.ts`, newest update first.
- Guide page: `/guides/<slug>`. From a card on the index. The layout is `components/site/GuideArticle.tsx`.
- Tool reviews: `/guides/aiapply-review`, `/guides/jobscan-review`, `/guides/teal-review`, `/guides/jobright-review` (with a Jobright vs Simplify section). The old `/guides/cover-me-vs-aiapply`, `-jobscan` and `-teal` addresses redirect here with a 308 (`next.config.ts`).
- Comparisons: `/guides/cover-me-vs-chatgpt`, `/guides/cover-me-vs-rezi`.
