import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Cover Me',
  description: 'How Cover Me collects, uses, and protects your data.',
}

const EFFECTIVE_DATE = 'June 4, 2026'
const CONTACT_EMAIL  = 'support@cover-me.dev'

// ── Section heading ────────────────────────────────────────────────────────

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-[22px] font-bold text-foreground tracking-[-0.4px] mt-14 mb-4 scroll-mt-24"
    >
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[16px] font-bold text-foreground tracking-[-0.2px] mt-8 mb-3">
      {children}
    </h3>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] text-muted-foreground leading-[1.8] mb-4">
      {children}
    </p>
  )
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-none space-y-2 mb-4 pl-0">
      {children}
    </ul>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[15px] text-muted-foreground leading-[1.8]">
      <span className="text-brand mt-[3px] shrink-0">→</span>
      <span>{children}</span>
    </li>
  )
}

function PermissionCard({
  name,
  warning,
  children,
}: {
  name: string
  warning?: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-[10px] overflow-hidden mb-4">
      <div className="bg-surface px-5 py-3 flex items-center justify-between gap-4 border-b border-border">
        <code className="text-[13px] font-bold text-brand-light font-mono">{name}</code>
        {warning && (
          <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full shrink-0">
            ⚠ Chrome shows: &ldquo;{warning}&rdquo;
          </span>
        )}
      </div>
      <div className="bg-background px-5 py-4 text-[14px] text-muted-foreground leading-[1.8]">
        {children}
      </div>
    </div>
  )
}

// ── Table of contents ──────────────────────────────────────────────────────

const TOC = [
  { id: 'overview',         label: 'Overview' },
  { id: 'data-collected',   label: 'Information We Collect' },
  { id: 'how-we-use',       label: 'How We Use Your Information' },
  { id: 'permissions',      label: 'Chrome Extension Permissions' },
  { id: 'storage-security', label: 'Data Storage & Security' },
  { id: 'third-parties',    label: 'Third-Party Services' },
  { id: 'retention',        label: 'Data Retention' },
  { id: 'your-rights',      label: 'Your Rights' },
  { id: 'limited-use',      label: 'Limited Use Statement' },
  { id: 'children',         label: "Children's Privacy" },
  { id: 'changes',          label: 'Changes to This Policy' },
  { id: 'contact',          label: 'Contact' },
]

// ── Page ───────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-[rgba(13,17,23,0.92)] backdrop-blur-2xl border-b border-border">
        <div className="max-w-[1160px] mx-auto px-12 h-[58px] flex items-center justify-between max-md:px-5">
          <Link href="/" className="flex items-center gap-[9px] text-[15px] font-bold text-foreground tracking-[-0.3px]">
            <Image src="/logo.png" width={22} height={22} alt="Cover Me" />
            Cover Me
          </Link>
          <Link href="/" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>
      </nav>

      <div className="max-w-[1160px] mx-auto px-12 py-16 max-md:px-5">
        <div className="grid grid-cols-[220px_1fr] gap-16 max-lg:grid-cols-1">

          {/* Sidebar TOC — sticky on desktop */}
          <aside className="max-lg:hidden">
            <div className="sticky top-24">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4">
                On this page
              </p>
              <nav className="flex flex-col gap-1">
                {TOC.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="text-[13px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0">

            {/* Header */}
            <div className="mb-10 pb-10 border-b border-border">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand mb-4 block">
                Legal
              </span>
              <h1 className="text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-1.5px] text-foreground leading-none mb-4">
                Privacy Policy
              </h1>
              <p className="text-[15px] text-muted-foreground">
                Effective date: <strong className="text-foreground">{EFFECTIVE_DATE}</strong>
              </p>
            </div>

            {/* ── 1. Overview ─────────────────────────────────────────── */}
            <H2 id="overview">Overview</H2>
            <P>
              Cover Me (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is an open-source Chrome
              extension that generates tailored cover letters from job postings using your resume and an
              AI model. This Privacy Policy explains what information we collect, how we use it, and your
              rights regarding that data.
            </P>
            <P>
              Cover Me operates in two distinct modes with fundamentally different data handling
              characteristics:
            </P>
            <Ul>
              <Li>
                <strong className="text-foreground">BYOK (Bring Your Own Key) — free, unlimited.</strong>{' '}
                You supply your own Claude or OpenAI API key. Your resume, API key, and cover letter
                history are stored exclusively on your device in encrypted local storage. No account is
                required and no data is sent to our servers.
              </Li>
              <Li>
                <strong className="text-foreground">Hosted (Free &amp; Pro).</strong>{' '}
                You create an account. Your resume is encrypted and stored on our backend. Cover letter
                generation is handled by our server-side proxy using our API key. Pro subscribers are
                billed through Stripe.
              </Li>
            </Ul>
            <P>
              Where this policy applies differently by mode, it is clearly noted.
            </P>

            {/* ── 2. Information We Collect ───────────────────────────── */}
            <H2 id="data-collected">Information We Collect</H2>

            <H3>Information you provide directly</H3>
            <Ul>
              <Li>
                <strong className="text-foreground">Resume text.</strong> When you upload a PDF or DOCX
                file, text is extracted client-side on your device. The raw binary file is never stored or
                transmitted. In BYOK mode, the extracted text is stored only in your browser&apos;s local
                storage. In Hosted mode, the extracted text is transmitted to our server over HTTPS and
                stored in an encrypted database.
              </Li>
              <Li>
                <strong className="text-foreground">Account credentials (Hosted mode only).</strong>{' '}
                Your email address and password are used to create and authenticate your account, managed
                by Supabase Auth. Passwords are hashed using bcrypt and are never stored in plaintext.
              </Li>
              <Li>
                <strong className="text-foreground">API keys (BYOK mode only).</strong>{' '}
                Your Claude or OpenAI API key is encrypted on your device using AES-256-GCM via the
                Web Crypto API before being written to local storage. It is decrypted only at the moment
                of an API call and immediately discarded from memory. It is never transmitted to our
                servers, logged, or included in error messages.
              </Li>
            </Ul>

            <H3>Information collected automatically</H3>
            <Ul>
              <Li>
                <strong className="text-foreground">Job posting data.</strong> When you activate the
                extension on a job posting, the extension reads the page content of the active tab
                (job title, company name, and job description) solely to generate your cover letter.
                This data is processed transiently — it is passed to the AI model and then discarded.
                It is not logged, stored on our servers, or used for any purpose beyond generating
                your cover letter.
              </Li>
              <Li>
                <strong className="text-foreground">Cover letter history.</strong> Generated cover
                letters are saved locally in your browser storage (BYOK and Hosted Free modes) or
                synced to our encrypted backend (Hosted Pro mode) for cross-device access.
              </Li>
              <Li>
                <strong className="text-foreground">Authentication session tokens (Hosted mode only).</strong>{' '}
                A JWT access token and refresh token are stored in your browser&apos;s local storage
                to maintain your session. These tokens are transmitted to our backend with each
                generation request to authenticate you.
              </Li>
              <Li>
                <strong className="text-foreground">Usage count (Hosted Free mode only).</strong>{' '}
                We record the number of cover letters generated per day per account for the purpose
                of enforcing the 10 letters/day free tier limit. Only the count is stored — no content
                or metadata about individual letters is recorded server-side for Free users.
              </Li>
              <Li>
                <strong className="text-foreground">Billing information (Pro subscribers only).</strong>{' '}
                If you subscribe to Cover Me Pro, your payment is processed by Stripe. We store only your
                Stripe Customer ID and subscription status in our database. Full payment details
                (card numbers, CVV, etc.) are never transmitted to or stored by our servers.
              </Li>
            </Ul>

            <H3>Information we do NOT collect</H3>
            <Ul>
              <Li>We do not track your browsing history or the URLs of pages you visit.</Li>
              <Li>We do not collect analytics, telemetry, or usage metrics.</Li>
              <Li>We do not use cookies for tracking or advertising.</Li>
              <Li>We do not collect any data from tabs other than the active job posting tab, and only when you explicitly activate the extension.</Li>
              <Li>We do not sell, rent, or trade your data to any third party.</Li>
            </Ul>

            {/* ── 3. How We Use Your Information ──────────────────────── */}
            <H2 id="how-we-use">How We Use Your Information</H2>
            <P>We use the information we collect exclusively to provide the Cover Me service:</P>
            <Ul>
              <Li>To generate tailored cover letters by combining your resume text with the job posting data you activate the extension on.</Li>
              <Li>To authenticate you and maintain your session (Hosted mode).</Li>
              <Li>To enforce the daily generation limit for Free tier accounts (Hosted mode).</Li>
              <Li>To sync your cover letter history across devices (Pro mode only).</Li>
              <Li>To process subscription billing through Stripe (Pro mode only).</Li>
              <Li>To respond to support requests you initiate by contacting us directly.</Li>
            </Ul>
            <P>
              We do not use your data for advertising, profiling, training AI models, or any purpose
              beyond what is listed above.
            </P>

            {/* ── 4. Chrome Extension Permissions ─────────────────────── */}
            <H2 id="permissions">Chrome Extension Permissions</H2>
            <P>
              The following section details every permission declared in Cover Me&apos;s{' '}
              <code className="text-[13px] text-brand-light bg-elevated px-1.5 py-0.5 rounded font-mono">manifest.json</code>,
              why it is necessary, and exactly how it is used. No permission is requested beyond what is
              strictly required to deliver the extension&apos;s single stated purpose: generating cover
              letters from job postings.
            </P>

            <H3>Declared permissions</H3>

            <PermissionCard name="storage">
              <strong className="text-foreground">Why it is needed:</strong> The extension must persist
              user data between browser sessions and popup opens/closes. Without storage access, settings,
              resume text, API keys, cover letter history, and auth session tokens would be lost every
              time the popup is closed.
              <br /><br />
              <strong className="text-foreground">Exactly how it is used:</strong>
              <ul className="mt-2 space-y-1 pl-4 list-disc">
                <li>Stores user settings (AI provider, mode selection) in <code className="text-brand-light font-mono text-[12px]">chrome.storage.local</code></li>
                <li>Stores the AES-GCM encrypted API key (BYOK mode) in <code className="text-brand-light font-mono text-[12px]">chrome.storage.local</code></li>
                <li>Stores extracted resume text (BYOK mode) in <code className="text-brand-light font-mono text-[12px]">chrome.storage.local</code></li>
                <li>Stores cover letter history in <code className="text-brand-light font-mono text-[12px]">chrome.storage.local</code></li>
                <li>Stores JWT session tokens (Hosted mode) in <code className="text-brand-light font-mono text-[12px]">chrome.storage.local</code></li>
              </ul>
              <br />
              <code className="text-brand-light font-mono text-[12px]">chrome.storage.sync</code> is
              deliberately never used to avoid any cloud synchronisation of sensitive data. All storage
              is local to your device.
            </PermissionCard>

            <PermissionCard name="activeTab">
              <strong className="text-foreground">Why it is needed:</strong> When you click
              &ldquo;Generate&rdquo;, the service worker needs to identify and communicate with the
              content script running on your current tab. The{' '}
              <code className="text-brand-light font-mono text-[12px]">activeTab</code> permission
              grants temporary access to the active tab at the moment of user action — specifically,
              it allows{' '}
              <code className="text-brand-light font-mono text-[12px]">chrome.tabs.query(&#123;active: true, currentWindow: true&#125;)</code>{' '}
              to return the tab&apos;s <code className="text-brand-light font-mono text-[12px]">id</code>,
              which is then used to route a message to the content script on that tab.
              <br /><br />
              <strong className="text-foreground">Exactly how it is used:</strong> The service worker
              retrieves the active tab&apos;s ID and sends a <code className="text-brand-light font-mono text-[12px]">SCRAPE_JOB</code> message
              to the content script on that specific tab. The content script reads the page DOM to
              extract the job title, company name, and description, then returns that data to the
              service worker. No tab URLs, titles, or other metadata are accessed, stored, or
              transmitted — only the tab ID is used, and only for message routing.
              <br /><br />
              <strong className="text-foreground">Access is strictly user-initiated:</strong>{' '}
              Access is granted only at the moment you click Generate and expires immediately after.
              The extension does not have persistent access to any tab between actions.
            </PermissionCard>

            <H3>Content script host access</H3>
            <P>
              In addition to declared permissions, Cover Me registers a content script that runs on
              web pages. This is what Chrome displays as{' '}
              <strong className="text-foreground">&ldquo;Read and change all your data on all websites&rdquo;</strong>{' '}
              during installation.
            </P>

            <PermissionCard
              name={"<all_urls> content script"}
              warning="Read and change all your data on all websites"
            >
              <strong className="text-foreground">Why Chrome shows this warning:</strong> Cover Me
              registers a content script with <code className="text-brand-light font-mono text-[12px]">matches: [&quot;&lt;all_urls&gt;&quot;]</code>,
              which Chrome surfaces as &ldquo;Read and change all your data on all websites.&rdquo;
              This warning reflects the technical scope of the permission, not Cover Me&apos;s
              actual behaviour.
              <br /><br />
              <strong className="text-foreground">Why all URLs are needed:</strong> Cover Me is
              designed to work on any job posting — not just LinkedIn or Indeed, but Greenhouse,
              Lever, Workday, Ashby, and any company&apos;s own careers page. Restricting the
              content script to a fixed list of domains would prevent it from working on the
              hundreds of job boards and ATS-hosted postings that exist. The broad match is
              required to deliver the extension&apos;s core promise: one tool for every job posting.
              <br /><br />
              <strong className="text-foreground">What the content script actually does:</strong> The
              script registers a single message listener ({' '}
              <code className="text-brand-light font-mono text-[12px]">chrome.runtime.onMessage</code>)
              and does nothing else passively. It only reads page content when it receives a{' '}
              <code className="text-brand-light font-mono text-[12px]">SCRAPE_JOB</code> message from
              the service worker — which only happens when you explicitly click Generate. It reads
              only the job title, company name, and job description from the DOM of the active tab.
              It does not modify any page content, inject any UI, monitor navigation, or transmit
              any data independently.
              <br /><br />
              <strong className="text-foreground">What we do NOT do:</strong>
              <ul className="mt-2 space-y-1 pl-4 list-disc">
                <li>We do not read content from any tab other than the one you activate Generate on.</li>
                <li>We do not monitor, log, or transmit the URLs or titles of pages you visit.</li>
                <li>We do not modify, inject into, or interact with web pages in any way beyond reading job posting data on explicit user request.</li>
                <li>We do not track your browsing history or build any profile of the sites you visit.</li>
              </ul>
            </PermissionCard>

            <H3>Host permissions</H3>
            <P>
              Host permissions allow the extension to make network requests to specific domains. Cover Me
              requests the minimum set of domains required for each operating mode.
            </P>

            <PermissionCard name="https://api.anthropic.com/*">
              <strong className="text-foreground">Used by:</strong> BYOK mode only (when you select
              Claude as your AI provider and supply your own API key).
              <br /><br />
              <strong className="text-foreground">Why it is needed:</strong> In BYOK mode, the
              service worker calls the Anthropic Claude API directly from your browser using your own
              API key to generate cover letters. The request contains your API key (in the
              Authorization header), the job description, and your resume text. No Cover Me server
              is involved — the request goes directly from your browser to Anthropic.
              <br /><br />
              <strong className="text-foreground">Not used in Hosted mode.</strong>
            </PermissionCard>

            <PermissionCard name="https://api.openai.com/*">
              <strong className="text-foreground">Used by:</strong> BYOK mode only (when you select
              OpenAI as your AI provider and supply your own API key).
              <br /><br />
              <strong className="text-foreground">Why it is needed:</strong> Same rationale as the
              Anthropic permission above — direct browser-to-OpenAI API calls using your own key in
              BYOK mode.
              <br /><br />
              <strong className="text-foreground">Not used in Hosted mode.</strong>
            </PermissionCard>

            <PermissionCard name="https://*.supabase.co/*">
              <strong className="text-foreground">Used by:</strong> Hosted mode only.
              <br /><br />
              <strong className="text-foreground">Why it is needed:</strong> In Hosted mode, the
              extension communicates with our Supabase backend for three purposes:
              <ul className="mt-2 space-y-1 pl-4 list-disc">
                <li>Authentication — signing in, signing up, and refreshing JWT session tokens via the Supabase Auth API.</li>
                <li>Cover letter generation — sending the job data and session token to our backend Edge Function, which retrieves your encrypted resume, calls the Claude API with our key, and returns the generated letter.</li>
                <li>Resume sync — uploading your resume text to encrypted backend storage when you sign in, so it is available to the backend proxy.</li>
              </ul>
              <br />
              <strong className="text-foreground">Not used in BYOK mode.</strong>
            </PermissionCard>

            {/* ── 5. Data Storage & Security ──────────────────────────── */}
            <H2 id="storage-security">Data Storage &amp; Security</H2>

            <H3>On-device storage (all modes)</H3>
            <Ul>
              <Li>All on-device data is stored in <code className="text-brand-light font-mono text-[13px]">chrome.storage.local</code> — never in <code className="text-brand-light font-mono text-[13px]">chrome.storage.sync</code>, cookies, or <code className="text-brand-light font-mono text-[13px]">localStorage</code>.</Li>
              <Li>API keys (BYOK mode) are encrypted with AES-256-GCM using a key derived via the Web Crypto API before being written to storage. The plaintext key exists in memory only for the duration of a single API call.</Li>
              <Li>Resume text and cover letter history are stored unencrypted in local storage (BYOK mode) since they never leave your device.</Li>
            </Ul>

            <H3>Server-side storage (Hosted mode only)</H3>
            <Ul>
              <Li>Resume text is encrypted with AES-256-GCM before being stored in our Supabase Postgres database. The encryption key is derived from a server-side secret. Plaintext resume text is never persisted to disk.</Li>
              <Li>Generated cover letters (Pro mode) are encrypted with AES-256-GCM before storage.</Li>
              <Li>All data in transit is protected by TLS 1.2 or higher (enforced by Supabase and Vercel).</Li>
              <Li>Database access is protected by Supabase Row-Level Security policies. Users can only access their own data rows.</Li>
              <Li>The Supabase service-role key (which bypasses RLS) is used only server-side in webhook handlers and is never exposed to clients.</Li>
            </Ul>

            {/* ── 6. Third-Party Services ─────────────────────────────── */}
            <H2 id="third-parties">Third-Party Services</H2>
            <P>
              Cover Me integrates with the following third-party services. Each service receives only
              the data necessary for its function.
            </P>

            <div className="space-y-4">
              {[
                {
                  name: 'Anthropic',
                  url: 'https://www.anthropic.com/privacy',
                  when: 'BYOK mode (Claude provider) and Hosted mode (our key)',
                  receives: 'Your resume text and the job posting data. In BYOK mode, requests are made with your own API key and are subject to your agreement with Anthropic. In Hosted mode, requests are made with our key.',
                },
                {
                  name: 'OpenAI',
                  url: 'https://openai.com/policies/privacy-policy',
                  when: 'BYOK mode only (OpenAI provider)',
                  receives: 'Your resume text and the job posting data, using your own API key. Requests are subject to your agreement with OpenAI.',
                },
                {
                  name: 'Supabase',
                  url: 'https://supabase.com/privacy',
                  when: 'Hosted mode only',
                  receives: 'Email address, hashed password, encrypted resume text, encrypted cover letters (Pro), session tokens, and usage counts. Supabase hosts our authentication system and database.',
                },
                {
                  name: 'Stripe',
                  url: 'https://stripe.com/privacy',
                  when: 'Pro subscribers only',
                  receives: 'Payment information (card details, billing address). Stripe processes all payments; we receive only a customer ID and subscription status. We never see or store your raw card details.',
                },
                {
                  name: 'Vercel',
                  url: 'https://vercel.com/legal/privacy-policy',
                  when: 'All users who visit the web dashboard',
                  receives: 'Standard web server access logs (IP address, browser, requested URL) for the dashboard at covermeweb.com. Vercel hosts our Next.js web application.',
                },
              ].map((svc) => (
                <div key={svc.name} className="bg-surface border border-border rounded-[10px] px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-bold text-foreground">{svc.name}</span>
                    <a
                      href={svc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] text-brand-light hover:text-foreground transition-colors"
                    >
                      Privacy Policy ↗
                    </a>
                  </div>
                  <p className="text-[12.5px] text-muted-foreground mb-1">
                    <span className="text-foreground font-medium">When used:</span> {svc.when}
                  </p>
                  <p className="text-[12.5px] text-muted-foreground">
                    <span className="text-foreground font-medium">Data received:</span> {svc.receives}
                  </p>
                </div>
              ))}
            </div>

            {/* ── 7. Data Retention ───────────────────────────────────── */}
            <H2 id="retention">Data Retention</H2>
            <Ul>
              <Li><strong className="text-foreground">BYOK mode:</strong> All data resides on your device. You can delete it at any time by removing the extension or clearing extension storage in Chrome settings. We hold no copy of it.</Li>
              <Li><strong className="text-foreground">Hosted account data:</strong> Your account, resume, and cover letter history are retained for as long as your account is active. You may request deletion at any time by contacting us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-light hover:text-foreground transition-colors">{CONTACT_EMAIL}</a>. We will permanently delete all your data within 30 days of a verified deletion request.</Li>
              <Li><strong className="text-foreground">Usage count records:</strong> Daily generation counts are deleted after 90 days.</Li>
              <Li><strong className="text-foreground">Stripe billing records:</strong> Stripe retains transaction records as required by financial regulations. We cannot delete data held directly by Stripe.</Li>
            </Ul>

            {/* ── 8. Your Rights ──────────────────────────────────────── */}
            <H2 id="your-rights">Your Rights</H2>
            <P>
              Depending on your jurisdiction, you may have the following rights regarding your personal data:
            </P>
            <Ul>
              <Li><strong className="text-foreground">Access:</strong> Request a copy of all data we hold about you.</Li>
              <Li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate data.</Li>
              <Li><strong className="text-foreground">Deletion:</strong> Request permanent deletion of your account and all associated data.</Li>
              <Li><strong className="text-foreground">Portability:</strong> Request your data in a machine-readable format.</Li>
              <Li><strong className="text-foreground">Objection:</strong> Object to processing of your data.</Li>
              <Li><strong className="text-foreground">Restriction:</strong> Request restriction of processing while a dispute is resolved.</Li>
            </Ul>
            <P>
              To exercise any of these rights, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-light hover:text-foreground transition-colors">
                {CONTACT_EMAIL}
              </a>. We will respond within 30 days. We may need to verify your identity before processing a request.
            </P>

            {/* ── 9. Limited Use Statement ────────────────────────────── */}
            <H2 id="limited-use">Limited Use Statement</H2>
            <P>
              Cover Me&apos;s use of information received from Chrome extension APIs, browser storage,
              and user-provided data is limited to the practices disclosed in this Privacy Policy.
              Specifically:
            </P>
            <Ul>
              <Li>Data collected is used solely to provide and improve the cover letter generation feature you have explicitly requested.</Li>
              <Li>We do not use data to develop, improve, or train AI or machine learning models other than passing it transiently to third-party AI APIs (Anthropic/OpenAI) in real time as part of the generation request.</Li>
              <Li>We do not use data for personalised advertising or retargeting of any kind.</Li>
              <Li>We do not sell or transfer user data to third parties for purposes unrelated to providing the Cover Me service.</Li>
              <Li>We do not allow humans to read user-generated content (resumes, cover letters, job postings) except with explicit user consent, for security and fraud prevention, to meet legal obligations, or in aggregate anonymised form.</Li>
              <Li>We do not use data to determine creditworthiness or for lending decisions.</Li>
            </Ul>
            <div className="bg-surface border border-[rgba(99,102,241,0.25)] rounded-[10px] px-5 py-4 mt-4">
              <p className="text-[14px] text-muted-foreground leading-[1.8]">
                The use of information received from Chrome extension APIs will adhere to the{' '}
                <a
                  href="https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-light hover:text-foreground transition-colors"
                >
                  Chrome Web Store User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </div>

            {/* ── 10. Children's Privacy ──────────────────────────────── */}
            <H2 id="children">Children&apos;s Privacy</H2>
            <P>
              Cover Me is not directed at children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you believe we have inadvertently collected
              such information, please contact us immediately and we will delete it.
            </P>

            {/* ── 11. Changes ─────────────────────────────────────────── */}
            <H2 id="changes">Changes to This Policy</H2>
            <P>
              We may update this Privacy Policy from time to time. When we do, we will update the
              effective date at the top of this page. For material changes, we will notify Hosted mode
              users via email. Continued use of Cover Me after a policy change constitutes acceptance of
              the updated policy.
            </P>
            <P>
              Because Cover Me is open source, all historical versions of this policy are visible in the
              public GitHub repository commit history.
            </P>

            {/* ── 12. Contact ─────────────────────────────────────────── */}
            <H2 id="contact">Contact</H2>
            <P>
              If you have any questions about this Privacy Policy, wish to exercise your data rights, or
              want to report a security concern, please contact:
            </P>
            <div className="bg-surface border border-border rounded-[10px] px-5 py-4">
              <p className="text-[15px] font-bold text-foreground mb-1">Lincoln Laylor</p>
              <p className="text-[14px] text-muted-foreground mb-1">Developer, Cover Me</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-brand-light hover:text-foreground transition-colors text-[14px]"
              >
                {CONTACT_EMAIL}
              </a>
            </div>

            {/* Footer note */}
            <div className="mt-16 pt-8 border-t border-border">
              <p className="text-[12.5px] text-muted-foreground">
                Cover Me is open-source software released under the MIT License.
                The source code is available at{' '}
                <a
                  href="https://github.com/TheLinc/cover-me"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-light hover:text-foreground transition-colors"
                >
                  github.com/TheLinc/cover-me
                </a>
                .
              </p>
            </div>

          </main>
        </div>
      </div>
    </div>
  )
}
