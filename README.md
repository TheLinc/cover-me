# Cover Me

**AI-powered cover letters, generated from any job posting in seconds.**

Cover Me is an open-source Chrome extension that scrapes job descriptions and generates tailored cover letters using your stored resume. Bring your own API key for unlimited, fully private use — or use the hosted tier for a no-configuration experience.

---

## How it works

1. Open any job posting (LinkedIn, Indeed, Lever, Workday, and more)
2. Click the Cover Me extension icon
3. Hit **Generate Cover Letter**
4. Edit, copy, or download as PDF

The extension reads the job description from the page, combines it with your resume, and sends it to an AI model that produces a tailored, human-sounding letter — no generic templates, no "I am excited to apply."

---

## Tiers

| | BYOK (Free) | Hosted Free | Hosted Pro |
|---|---|---|---|
| Price | Free | Free | $4/month |
| API key required | Yes (yours) | No | No |
| Generations | Unlimited | 10/day | Unlimited |
| Resume storage | Local only | Encrypted cloud | Encrypted cloud |
| Cover letter history | Local only | Local only | Synced across devices |
| Privacy | Resume never leaves your device | Resume encrypted at rest | Resume encrypted at rest |

> **Hosted tiers are on the roadmap.** The current release is BYOK only.

---

## Installation

### Chrome Web Store

> Coming soon.

### Load unpacked (latest build)

1. Download the latest `cover-me-extension.zip` from [Releases](https://github.com/TheLinc/cover-me/releases)
2. Unzip it
3. Open `chrome://extensions`
4. Enable **Developer Mode** (toggle, top right)
5. Click **Load unpacked** and select the unzipped folder

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
- Upload a PDF or DOCX
- The extension extracts the text client-side — the raw file is never stored or transmitted

### 3. Generate

- Navigate to any job posting
- Click the extension icon
- Click **Generate Cover Letter**
- Edit the result inline, then copy or download as PDF

If the extension can't detect the job description automatically (some pages block content scripts), use **"Paste it manually"** to enter the details yourself.

---

## Supported job boards

| Platform | Support |
|---|---|
| LinkedIn | Dedicated scraper |
| Indeed | Dedicated scraper |
| Lever | Dedicated scraper |
| Workday | Dedicated scraper |
| Greenhouse | Generic scraper (works via JSON-LD + ATS selectors) |
| Ashby | Generic scraper |
| Workable | Generic scraper |
| BambooHR | Generic scraper |
| Any careers page | Generic scraper (heuristic fallback) |

The generic scraper tries three strategies in order: JSON-LD structured data, known ATS CSS selectors, then a heuristic that finds the largest heading + text block on the page. If all else fails, use the manual paste option.

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
| `tabs` | Identify the active tab to send the scrape request |
| `https://api.anthropic.com/*` | Direct API calls for Claude (BYOK only) |
| `https://api.openai.com/*` | Direct API calls for OpenAI (BYOK only) |

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
2. **Load unpacked** → select the `dist/` folder

CRXJS handles hot module replacement automatically. You only need to manually refresh the extension on `chrome://extensions` if you change `manifest.json`.

### Production build

```bash
pnpm run build
```

Output is in `dist/`.

### Project structure

```
cover-me/
├── extension/
│   ├── src/
│   │   ├── background/       # Service worker — orchestrates generation
│   │   ├── content/          # Content scripts + per-site scrapers
│   │   │   └── scrapers/     # LinkedIn, Indeed, Lever, Workday, generic
│   │   ├── lib/              # Shared utilities
│   │   │   ├── ai/           # Claude + OpenAI clients, prompt builder
│   │   │   ├── crypto.ts     # AES-GCM key encryption/decryption
│   │   │   ├── pdf.ts        # PDF generation (jsPDF)
│   │   │   ├── resume-parser.ts  # pdf.js + mammoth.js text extraction
│   │   │   └── storage.ts    # chrome.storage.local helpers
│   │   ├── popup/            # React UI
│   │   │   ├── pages/        # Generate, Resume, Settings, History
│   │   │   └── components/   # Nav
│   │   └── types/            # Shared TypeScript types
│   ├── manifest.json
│   └── vite.config.ts
├── web/                      # Next.js dashboard (Phase 3 — not yet built)
└── backend/                  # Supabase Edge Functions (Phase 2 — not yet built)
```

### Tech stack

| Layer | Choice |
|---|---|
| Extension | React 18 + TypeScript + Vite + CRXJS |
| PDF parsing | pdf.js (client-side) |
| DOCX parsing | mammoth.js (client-side) |
| PDF generation | jsPDF |
| Key encryption | Web Crypto API (AES-GCM) |
| AI — Claude | `claude-haiku-4-5` via Anthropic API |
| AI — OpenAI | `gpt-4o-mini` via OpenAI API |
| Browser polyfill | webextension-polyfill (Firefox-ready) |

---

## Architecture

```
Job page (content script)
  → scrapes title, company, description
  → sends to service worker via chrome.runtime.sendMessage

Service worker (background)
  → decrypts API key from chrome.storage.local
  → fetches resume text from chrome.storage.local
  → builds prompt with job + resume
  → calls Claude or OpenAI directly with user's key
  → saves result to history
  → returns letter to popup

Popup (React)
  → displays editable letter
  → copy to clipboard / download PDF
```

All data flows stay local in BYOK mode. The service worker talks directly to the AI provider — there is no intermediate server.

---

## Self-hosting the backend (coming in Phase 2)

The hosted tier will be fully self-hostable. You will need:

- A [Supabase](https://supabase.com) project (free tier works)
- A [Stripe](https://stripe.com) account (for paid tier)
- An Anthropic API key

Setup instructions and a one-click deploy button will be added when the backend is released. The schema, migrations, and Edge Function code will all be in `backend/`.

---

## Contributing

Contributions are welcome. A few guidelines:

- **Bug fixes and scraper improvements** — open a PR directly
- **New features** — open an issue first to discuss; the scope is intentionally narrow
- **New job board scrapers** — check `src/content/scrapers/` for the pattern; PRs for Greenhouse, Ashby, and Workable dedicated scrapers are especially welcome
- Keep PRs focused — one thing per PR

### Running in development

See [Setup](#setup) above. There are no backend dependencies for BYOK development — the extension is entirely self-contained.

---

## Roadmap

- [x] BYOK MVP — Chrome extension, local storage, Claude + OpenAI
- [x] Manual paste fallback
- [x] Cover letter history
- [x] Editable output + PDF download
- [x] Lever + Workday scrapers
- [ ] Hosted free tier (Supabase auth + backend proxy)
- [ ] Stripe paid tier + web dashboard
- [ ] Firefox support (polyfill already in place)
- [ ] Chrome Web Store release

---

## License

MIT — see [LICENSE](LICENSE).

The extension code is free to use, modify, and self-host. If you build something with it, a star or a mention is appreciated but not required.
