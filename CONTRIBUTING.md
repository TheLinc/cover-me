# Contributing to Cover Me

Thanks for wanting to help. Cover Me is a live product with paying users, and merging to `master` deploys the website and the backend right away. Each section below exists for one of those two reasons.

## Before you write code

Bug fixes and job board scrapers can go straight to a pull request.

For anything else, open an issue first, or comment on an existing one, and wait for a reply on the approach. The scope is narrow on purpose, and agreeing on the approach takes five minutes. A rewrite after review takes days.

Some areas need sign-off on the approach before you start, even for small changes:

- The AI prompts for letters, tailoring and resume parsing. An eval scores every prompt change, and a small wording change can move those scores.
- Pricing, plans, quotas and billing.
- Sign-in and accounts.
- How a resume is stored, encrypted or sent anywhere.
- The layout of the generated PDF and Word files.

## Making the change

Keep one change per pull request. Two small PRs get reviewed faster than one big one. Branch names are up to you, but `fix/123-short-name` or `feat/123-short-name` matches the rest of the repo.

The backend and website deploy on merge, but the Chrome Web Store extension updates days later. A backend change has to keep working with the extension version that's live in the store.

Some code lives in two places, and the copy has to match:

| Edit here | Then run | Copied to |
|---|---|---|
| `extension/src/lib/pdf/` | `node scripts/sync-pdf.mjs` | `web/lib/pdf/` |
| `extension/src/content/scrapers/` | `node scripts/sync-scrapers.mjs` | the `scrape` Edge Function |
| A prompt in `extension/src/lib/ai/` | Edit the backend copy by hand, then `pnpm check:prompts` in `extension/` | `backend/supabase/functions/` |

Write a comment only when the code can't say why, and link the issue or PR that holds the reason (`#123`). CI fails on comments without a link in any file your PR changes, old ones included. See [AGENTS.md](AGENTS.md).

Never put a real person's resume in a test, a fixture, an issue or a screenshot. Make one up.

## Before you push

Setup is in the README's [Development](README.md#development) section. Run the checks for each folder you touched:

```bash
# extension/
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# web/
pnpm typecheck && pnpm lint && pnpm test && pnpm check

# backend/ (lint needs Deno, test needs Docker running)
pnpm typecheck && pnpm lint && pnpm test
```

## After you open the pull request

Fill in the template. Put `Closes #123` at the top so the issue closes on merge. If the change alters anything a user sees, such as the popup, the website or a generated letter or resume, add a before and after screenshot.

CI doesn't run on a pull request from a fork until a maintainer approves it, so expect a short wait before checks show up.

Leave "Allow edits by maintainers" on. Review fixes sometimes get pushed straight to your branch, and each one is explained in a comment on the PR. If you disagree with one, say so there before it merges.

## License

Cover Me is MIT licensed. By opening a pull request, you agree your contribution is released under the same [license](LICENSE).
