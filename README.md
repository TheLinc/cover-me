# Cover Me

**AI cover letters and ATS-tailored resumes, generated from any job posting in seconds.**

Cover Me is an open-source Chrome extension that reads job descriptions and, using your stored resume, generates tailored cover letters and ATS-optimized resumes — complete with a match score and gap analysis. Bring your own API key for unlimited, fully private use — or use the hosted tier for a no-configuration experience.

---

## How it works

1. Open any job posting (LinkedIn, Indeed, Lever, Workday, and more)
2. Click the Cover Me extension icon
3. Hit **Generate Cover Letter** — or **Tailor Resume to Job**
4. Edit, copy, or download as PDF

The extension reads the job description from the page and combines it with your resume. **Generate Cover Letter** produces a tailored, human-sounding letter — no generic templates, no "I am excited to apply." **Tailor Resume to Job** rewrites your resume's wording and skills to match the posting's ATS keywords (without fabricating experience), shows a match score out of 100 with a gap analysis, and exports a clean PDF. Optional toggles let you compact to one page, trim irrelevant bullets, or add a tailored summary.

---

## Tiers

| | BYOK (Free) | Hosted Free | Hosted Pro |
|---|---|---|---|
| Price | Free | Free | $4/month |
| API key required | Yes (yours) | No | No |
| Generations | Unlimited | 10/day | Unlimited |
| Resume storage | Local only | Encrypted cloud | Encrypted cloud |
| Application history (letters + tailored resumes) | Local only | Local only | Synced across devices |
| Privacy | Resume never leaves your device | Resume encrypted at rest | Resume encrypted at rest |

---

## Installation

### Chrome Web Store

[**Install Cover Me**](https://chromewebstore.google.com/detail/cover-me-%E2%80%93-ai-cover-lette/bpbnopjgjbimdjjdolhkgimllbgamgpi) — add it to Chrome in one click.

### Load unpacked (development build)

1. Clone the repo and follow the [Development](#development) setup below
2. Run `pnpm run build`
3. Open `chrome://extensions`
4. Enable **Developer Mode** (toggle, top right)
5. Click **Load unpacked** and select the `extension/dist/` folder

---

## Getting started (BYOK)

### 1. Get an API key

Cover Me supports two AI providers:

**Claude (Anthropic)** — recommended
- Go to [console.anthropic.com](https://console.anthropic.com)
- Create an API key
- Claude Haiku is used by default — fast and very cost-effective (fractions of a cent per letter)

**OpenAI**
- Go to [platform.openai.com](https://platform.openai.com)
- Create an API key under API Keys
- GPT-4o Mini is used by default

### 2. Upload your resume

- Click the extension icon → **Resume** tab
- Upload a PDF, DOCX, or TXT file
- The extension extracts the text client-side — the raw file is never stored or transmitted

### 3. Generate

- Navigate to any job posting
- Click the extension icon
- Click **Generate Cover Letter**, or **Tailor Resume to Job** to produce an ATS-optimized resume with a match score
- Edit the result inline, then copy or download as PDF

If the extension can't detect the job description automatically, use **"Paste it manually"** to enter the details yourself.

---

## Supported job boards

| Platform | Support |
|---|---|
| LinkedIn | Dedicated scraper |
| Indeed | Dedicated scraper |
| Lever | Dedicated scraper |
| Workday | Dedicated scraper |
| BambooHR | Dedicated scraper |
| Terminal | Dedicated scraper |
| Greenhouse | Generic scraper (JSON-LD + ATS selectors) |
| Ashby | Generic scraper |
| Workable | Generic scraper |
| Any careers page | Generic scraper (heuristic fallback) |

The generic scraper tries three strategies in order: JSON-LD structured data, known ATS CSS selectors, then a heuristic that finds the largest heading and text block on the page. If all else fails, use the manual paste option.

---

## Privacy & security

**Your resume is sensitive — here is exactly how it is handled:**

- Text is extracted client-side on upload using pdf.js / mammoth.js. The raw file is never stored.
- In BYOK mode, extracted resume text is stored in `chrome.storage.local` on your device only. It never leaves your machine.
- API calls go directly from the extension to Anthropic or OpenAI using **your key**. Cover Me's servers are not in the loop.
- Your API key is encrypted at rest using the Web Crypto API (AES-GCM) before being written to `chrome.storage.local`. It is decrypted only at call time and immediately discarded from memory.
- No analytics, no telemetry, no third-party SDKs in the extension.

**Permissions used:**

| Permission | Why |
|---|---|
| `storage` | Save resume, API key (encrypted), and letter history locally |
| `activeTab` | Read the job posting on the current tab when you click Generate |
| `scripting` | Inject the content script to scrape job details |
| `https://api.anthropic.com/*` | Direct API calls for Claude (BYOK only) |
| `https://api.openai.com/*` | Direct API calls for OpenAI (BYOK only) |
| `https://<project>.supabase.co/*` | Account auth, resume sync, generation (hosted mode only) |

No `<all_urls>` permission — the extension only activates on the tab you're on when you click the icon.

---

## Development

### Prerequisites

- Node.js 18+
- pnpm 10+
- Chrome

### Setup

```bash
git clone https://github.com/TheLinc/cover-me.git
cd cover-me/extension
pnpm install
pnpm rebuild esbuild   # required — pnpm v10 blocks esbuild's postinstall
```

### Dev server (hot reload)

```bash
pnpm dev
```

Then load the extension in Chrome:
1. `chrome://extensions` → Enable **Developer Mode**
2. **Load unpacked** → select the `extension/dist/` folder

CRXJS handles hot module replacement. You only need to manually refresh the extension page if you change `manifest.json`.

### Production build

```bash
pnpm run build
```

Output is in `extension/dist/`.

### Project structure

```
cover-me/
├── extension/               # Chrome extension (MV3, React + TypeScript + Vite)
│   ├── src/
│   │   ├── background/      # Service worker — orchestrates generation
│   │   ├── content/         # Content scripts + per-site scrapers
│   │   │   └── scrapers/    # LinkedIn, Indeed, Lever, Workday, generic
│   │   ├── lib/             # Shared utilities
│   │   │   ├── ai/          # Cover-letter + resume-tailor prompts, Claude/OpenAI clients, resume parsing
│   │   │   ├── auth.ts      # Supabase auth + backend API helpers
│   │   │   ├── crypto.ts    # AES-GCM key encryption/decryption
│   │   │   ├── pdf.ts       # Cover letter PDF generation (jsPDF)
│   │   │   ├── resume-pdf.ts # Tailored resume PDF generation (jsPDF)
│   │   │   ├── resume-parser.ts
│   │   │   └── storage.ts   # chrome.storage.local helpers
│   │   ├── popup/           # React UI
│   │   │   ├── pages/       # Generate, Resume, Settings, History
│   │   │   └── components/  # Nav
│   │   └── types/
│   ├── manifest.json
│   └── vite.config.ts
├── web/                     # Next.js landing page + user dashboard (Vercel)
│   ├── app/
│   │   ├── page.tsx         # Landing page
│   │   ├── dashboard/       # User dashboard (usage, upgrade, billing portal)
│   │   ├── auth/            # Sign in / sign up / password reset
│   │   ├── privacy/
│   │   ├── terms/
│   │   ├── support/
│   │   ├── about/
│   │   └── api/             # checkout, stripe-webhook, billing-portal
│   └── lib/
└── backend/                 # Supabase Edge Functions + DB migrations
    └── supabase/
        ├── functions/
        │   ├── generate/     # Cover letter: JWT auth → rate limit → resume fetch → Claude (Haiku)
        │   ├── tailor/       # Resume tailoring: same flow → Claude (Sonnet) → tailored resume + ATS score
        │   ├── resume/       # GET / POST / DELETE encrypted resume
        │   ├── letters/      # GET / POST / DELETE cover letter history (Pro)
        │   ├── applications/ # GET / DELETE job applications w/ nested letters + tailored resumes (Pro)
        │   └── _shared/      # CORS helpers, AES-GCM encrypt/decrypt
        └── migrations/      # Postgres schema + RLS policies
```

### Tech stack

| Layer | Choice |
|---|---|
| Extension | React 18 + TypeScript + Vite + CRXJS |
| PDF parsing | pdf.js (client-side) |
| DOCX parsing | mammoth.js (client-side) |
| PDF generation | jsPDF |
| Key encryption | Web Crypto API (AES-GCM) |
| Backend | Supabase (Auth + Postgres + Edge Functions) |
| Web dashboard | Next.js on Vercel |
| Payments | Stripe |
| AI — hosted | Claude (Anthropic) — Haiku for cover letters, Sonnet for resume tailoring |
| AI — BYOK | Claude or OpenAI, user's choice |

---

## Architecture

```
Job page (content script)
  → scrapes title, company, description
  → sends to service worker via chrome.runtime.sendMessage

Service worker
  ├── BYOK mode
  │     → decrypts API key from chrome.storage.local
  │     → fetches resume text from chrome.storage.local
  │     → calls Claude / OpenAI directly with user's key
  │
  └── Hosted mode
        → sends JWT + job data to Supabase Edge Function
        → Edge Function: verifies JWT, checks rate limit,
          fetches encrypted resume, decrypts, calls Claude,
          returns letter (generate) or tailored resume +
          ATS match score (tailor)
        → Pro users: result also saved to backend history

The same two paths serve both features: "Generate Cover Letter"
(generate) and "Tailor Resume to Job" (tailor).

Popup (React)
  → displays editable letter, or tailored resume + ATS score/gaps
  → copy to clipboard / download PDF
  → history page syncs from backend for Pro users
```

---

## Self-hosting

The full backend is open source and self-hostable. You need a Supabase project, a Stripe account, and an Anthropic API key.

### 1. Fork and clone

```bash
git clone https://github.com/<your-fork>/cover-me.git
cd cover-me
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon (public) key** from *Project Settings → API*
3. Note your **service role key** from the same page (keep this secret)

Install the Supabase CLI if you haven't already:

```bash
npm install -g supabase
```

Link the CLI to your project:

```bash
cd backend
supabase login
supabase link --project-ref <your-project-ref>
```

### 3. Run database migrations

```bash
supabase db push
```

This applies all migrations in `backend/supabase/migrations/` in order, creating the `users`, `rate_limits`, `resumes`, and `cover_letters` tables with RLS policies.

Alternatively, run each `.sql` file manually in the Supabase SQL editor.

### 4. Generate an encryption key

The backend uses AES-256-GCM to encrypt resumes and cover letters at rest. Generate a 32-byte key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this value — you'll need it for both the Edge Function secrets and cannot change it after data is written.

### 5. Set Edge Function secrets

```bash
supabase secrets set SERVICE_KEY=<service-role-key>
supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-key>
supabase secrets set ENCRYPTION_KEY=<64-char-hex-from-step-4>
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

`SERVICE_KEY` and `STRIPE_*` are only used in the Edge Functions and web API routes — they never reach the client.

### 6. Deploy Edge Functions

```bash
supabase functions deploy generate
supabase functions deploy tailor
supabase functions deploy resume
supabase functions deploy letters
supabase functions deploy applications
```

### 7. Set up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. In the Stripe dashboard, create a **Product** (e.g. "Cover Me Pro") with a recurring **$4/month** price
3. Copy the **Price ID** (starts with `price_...`)
4. Create a **webhook** pointing to `https://<your-web-url>/api/stripe-webhook` with these events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copy the **webhook signing secret** (starts with `whsec_...`)

For local testing, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

### 8. Configure the web dashboard

Create `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Run locally:

```bash
cd web
pnpm install
pnpm dev
```

Or deploy to Vercel — set the same variables in *Project Settings → Environment Variables* and set the root directory to `web/`.

### 9. Configure the extension

Create `extension/.env.local`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_WEB_URL=https://your-domain.com
```

Rebuild the extension:

```bash
cd extension
pnpm run build
```

Load `extension/dist/` as an unpacked extension in Chrome. The hosted tier will now point to your own Supabase project and web dashboard.

### Environment variable reference

**Edge Functions** (set via `supabase secrets set`):

| Variable | Description |
|---|---|
| `SERVICE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `ENCRYPTION_KEY` | 64-char hex string (32 bytes) for AES-256-GCM |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

**Web dashboard** (`web/.env.local`):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe recurring price ID |
| `NEXT_PUBLIC_SITE_URL` | Your web dashboard URL |

**Extension** (`extension/.env.local`):

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_WEB_URL` | Your web dashboard URL (for auth redirects) |

---

## Contributing

Contributions are welcome. A few guidelines:

- **Bug fixes and scraper improvements** — open a PR directly
- **New features** — open an issue first; the scope is intentionally narrow
- **New job board scrapers** — see `extension/src/content/scrapers/` for the pattern; PRs for dedicated Greenhouse and Ashby scrapers are especially welcome
- Keep PRs focused — one thing per PR

---

## Roadmap

- [x] BYOK MVP — Chrome extension, local storage, Claude + OpenAI
- [x] Manual paste fallback
- [x] Cover letter history + PDF download
- [x] Editable output
- [x] LinkedIn, Indeed, Lever, Workday scrapers
- [x] Hosted free tier — Supabase auth + backend proxy + rate limiting
- [x] Stripe paid tier — Checkout, webhooks, billing portal
- [x] Web dashboard — landing page, user dashboard, auth flow
- [x] Cover letter history sync for Pro users (cross-device)
- [x] Resume tailoring — AI optimizes your resume for each job posting with an ATS match score, exports as PDF
- [x] Application history — cover letters + tailored resumes grouped by job, synced for Pro
- [x] Chrome Web Store release
- [ ] Tailored resume history stored locally (BYOK/Free)
- [ ] Prompt tuning based on real usage
- [ ] Firefox support (polyfill already in place)

---

## License

MIT — see [LICENSE](LICENSE).

The extension code is free to use, modify, and self-host. If you build something with it, a star or a mention is appreciated but not required.
