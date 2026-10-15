import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Cover Me collects, uses, and protects your data. Your resume is encrypted at rest on our servers, never sold, and never used for AI training.',
  alternates: { canonical: `${BASE}/privacy` },
  openGraph: {
    title: 'Privacy Policy — Cover Me',
    description: 'How Cover Me collects, uses, and protects your data. Your resume is encrypted at rest on our servers, never sold, and never used for AI training.',
    url: `${BASE}/privacy`,
    siteName: 'Cover Me',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy — Cover Me',
    description: 'How Cover Me collects, uses, and protects your data. Your resume is encrypted at rest on our servers, never sold, and never used for AI training.',
  },
}

const EFFECTIVE_DATE = 'October 15, 2026'
const CONTACT_EMAIL  = 'support@cover-me.dev'

// ── Section heading ────────────────────────────────────────────────────────

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-[26px] text-foreground mt-14 mb-4 scroll-mt-24"
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
          <span className="text-[11px] font-semibold text-brand-deep bg-surface border border-[rgba(99,102,241,0.25)] px-2.5 py-1 rounded-full shrink-0">
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

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'Privacy Policy', item: `${BASE}/privacy` },
  ],
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <SiteNav />

      <div className="max-w-[1160px] mx-auto px-12 py-16 max-md:px-5">
        <div className="grid grid-cols-[220px_1fr] gap-16 max-lg:grid-cols-1">

          {/* Sidebar TOC — sticky on desktop */}
          <aside className="max-lg:hidden">
            <div className="sticky top-24">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 mb-4">
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
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 mb-4 block">
                Legal
              </span>
              <h1 className="text-[clamp(32px,4vw,48px)] text-foreground leading-none mb-4">
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
              extension that reads a job posting, tailors your resume to it, and writes a matching
              cover letter, using an AI model. This Privacy Policy explains what information we collect, how we use it, and your
              rights regarding that data.
            </P>
            <P>
              Cover Me operates in two distinct modes with fundamentally different data handling
              characteristics:
            </P>
            <Ul>
              <Li>
                <strong className="text-foreground">BYOK (Bring Your Own Key) — free, unlimited.</strong>{' '}
                You supply your own Claude or OpenAI API key. No account is required. Your resume,
                API key and history are stored on your device, and only the API key is encrypted. Your
                resume goes only to the AI provider whose key you use. From version 1.3.0, once you
                agree, the job page you use the extension on is also sent to our server so it can read
                the posting (see Job posting data below).
              </Li>
              <Li>
                <strong className="text-foreground">Hosted (Free &amp; Pro).</strong>{' '}
                You create an account. Your resume is encrypted and stored on our backend. Our server
                sends it to Anthropic, with our API key, to read it and to write your cover letters and
                tailored resumes. Pro subscribers are billed through Stripe. From version 1.3.0, once
                you agree, the job page is also sent to our server to read the posting, as in BYOK.
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
                transmitted; in Hosted mode its file name is stored, unencrypted, with your resume. In BYOK mode, the extracted text is stored only in your browser&apos;s local
                storage. In Hosted mode, the extracted text is transmitted to our server over HTTPS and
                stored in an encrypted database, and a copy is kept in local storage on each browser you
                sign in from, so you don&apos;t upload it again on a new device. When you upload a new
                resume, our server sends it to Anthropic right away to read its structure, so tailoring
                can start at once.
              </Li>
              <Li>
                <strong className="text-foreground">Account credentials (Hosted mode only).</strong>{' '}
                Your email address and password are used to create and authenticate your account, managed
                by Supabase Auth. Passwords are hashed using bcrypt and are never stored in plaintext.
                If you choose Continue with Google instead, there is no password: Google confirms who
                you are, and we receive your email address, name, profile picture link and Google
                account ID (see Third-Party Services below).
                Versions before 1.3.0 offered &ldquo;Remember me&rdquo;, which saved your password on
                your device, encrypted with AES-256-GCM, to pre-fill the sign-in form. Version 1.3.0
                removes that feature and deletes any saved password when it updates.
              </Li>
              <Li>
                <strong className="text-foreground">API keys (BYOK mode only).</strong>{' '}
                Your Claude or OpenAI API key is encrypted on your device using AES-256-GCM via the
                Web Crypto API before being written to local storage. It is decrypted only at the moment
                of an API call and immediately discarded from memory. It is never transmitted to our
                servers, logged, or included in error messages.
              </Li>
              <Li>
                <strong className="text-foreground">Facts you add.</strong>{' '}
                Anything you type to give the AI more context, such as a referrer&apos;s name or
                experience missing from your resume, is saved in your browser and sent with each
                generation request: to our server in Hosted mode, or to your AI provider with your own
                key.
              </Li>
            </Ul>

            <H3>Information collected automatically</H3>
            <Ul>
              <Li>
                <strong className="text-foreground">Job posting data.</strong> From version 1.3.0,
                when you click Generate or Tailor Resume on a job posting, the extension copies the page
                you are looking at and sends it, with the full address of the page (and of each frame copied), including any query string, to our server over HTTPS,
                in every mode including BYOK, once you agree. The extension asks when you open it until
                you choose, and reads postings on your device only until you agree. You can turn this on or off at
                any time in the extension&apos;s Settings. The
                server reads the job title, company name, and job description from it and sends those
                back; the page itself is discarded as soon as it is read and is never logged or
                stored. The copy covers the page and any frames in it from the same site or from the six
                job-board services listed below. Scripts (except the posting&apos;s structured data), form
                fields, images, LinkedIn&apos;s messaging panel and the data sites embed in them are
                removed in your browser before anything is sent, but the rest of the page is sent as
                is: its text, including parts not on screen, its link addresses and short attribute
                values, which on sites you are signed in to can include your name or a link to your
                profile. If our server can&apos;t be reached,
                the extension reads the posting on your device instead. The job details are then used
                only to generate your cover letter or tailored resume and, on Pro, to label your saved
                applications.
              </Li>
              <Li>
                <strong className="text-foreground">Application history.</strong> Generated cover
                letters and tailored resumes are grouped by job application and saved locally in your
                browser storage (BYOK and Hosted Free modes) or also synced to our backend (Hosted Pro
                mode) for cross-device access. On our backend the letters and resumes are encrypted; the
                job title, company, posting address, dates, interview mark, ATS match score and missing
                keywords that go with them are not, so you can search and filter them.
              </Li>
              <Li>
                <strong className="text-foreground">Authentication session tokens (Hosted mode only).</strong>{' '}
                A JWT access token and refresh token are stored in your browser&apos;s local storage
                to maintain your session. These tokens are transmitted to our backend with each
                generation request to authenticate you.
              </Li>
              <Li>
                <strong className="text-foreground">Usage count (Hosted mode).</strong>{' '}
                We record the number of AI generations (cover letters and resume tailoring combined)
                per day per account to enforce the free allowance and Pro's fair-use limit. Apart from Supabase&apos;s
                short-lived request logs (see Third-Party Services), only the count is stored: no content
                of individual generations is recorded server-side for Free users.
              </Li>
              <Li>
                <strong className="text-foreground">Rate-limit counter (all modes).</strong>{' '}
                To stop abuse of the posting reader, our server counts requests per IP address. It
                stores a keyed hash (HMAC) of the address, never the address itself. When it reads a
                newly uploaded resume, it also counts per account, keyed by a hash of your account ID.
                A counter not updated for two days is deleted at the next cleanup, which runs during later requests.
              </Li>
              <Li>
                <strong className="text-foreground">Billing information (when you click Upgrade, and Pro subscribers).</strong>{' '}
                When you click Upgrade, we send Stripe your email address and Cover Me account ID to
                start checkout, and Stripe processes your payment. We store only your Stripe Customer ID
                and subscription status in our database. Full payment details
                (card numbers, CVV, etc.) are never transmitted to or stored by our servers.
              </Li>
            </Ul>

            <H3>Information we do NOT collect</H3>
            <Ul>
              <Li>We do not track your browsing history. We receive a page&apos;s address only when you activate the extension on it.</Li>
              <Li>The extension contains no analytics or telemetry code. In BYOK mode the only thing it sends to Cover Me is the job page you activate it on, once you have agreed, so we can read the posting. Your resume and API key never reach us.</Li>
              <Li>In hosted mode our servers count how many letters and resumes you generate, to enforce the generation limits, and log errors. Logs never contain your resume, letters, or job descriptions.</Li>
              <Li>We do not use cookies for tracking or advertising.</Li>
              <Li>We do not collect any data from tabs other than the active job posting tab, and only when you explicitly activate the extension.</Li>
              <Li>We do not sell, rent, or trade your data to any third party.</Li>
            </Ul>

            {/* ── 3. How We Use Your Information ──────────────────────── */}
            <H2 id="how-we-use">How We Use Your Information</H2>
            <P>We use the information we collect exclusively to provide the Cover Me service:</P>
            <Ul>
              <Li>To read the job posting on the page you ask the extension to read.</Li>
              <Li>To protect the service from abuse, with rate limits.</Li>
              <Li>To tailor your resume to that posting and write a matching cover letter, using your resume and any facts you add.</Li>
              <Li>To authenticate you and maintain your session (Hosted mode).</Li>
              <Li>To enforce the generation limits: the free allowance and Pro&apos;s fair-use cap (Hosted mode).</Li>
              <Li>To sync your application history (cover letters and tailored resumes) across devices (Pro mode only).</Li>
              <Li>To process subscription billing through Stripe (Pro mode only).</Li>
              <Li>To respond to support requests you initiate by contacting us directly.</Li>
              <Li>To count, in aggregate, how many accounts sign up and use the service.</Li>
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
              strictly required to deliver the extension&apos;s single stated purpose: helping you apply
              for a job by tailoring your resume to the posting and writing a matching cover letter.
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
                <li>User settings (AI provider, mode selection)</li>
                <li>AES-256-GCM encrypted API key (BYOK mode)</li>
                <li>Extracted resume text and parsed resume structure</li>
                <li>Application history — cover letters and tailored resumes grouped by job</li>
                <li>JWT session tokens (Hosted mode)</li>
                <li>Facts you add for your letters, such as a referrer&apos;s name</li>
                <li>Cached account tier to avoid redundant network requests</li>
                <li>Transient in-flight generation state so results survive the popup closing mid-generation</li>
                <li>The popup&apos;s last inputs and results, so they&apos;re still there when you reopen it</li>
                <li>Your choice about sending job pages to our server to be read</li>
              </ul>
              <br />
              <code className="text-brand-light font-mono text-[12px]">chrome.storage.sync</code> is
              deliberately never used to avoid any cloud synchronisation of sensitive data. All storage
              is local to your device.
            </PermissionCard>

            <PermissionCard name="activeTab">
              <strong className="text-foreground">Why it is needed:</strong> The{' '}
              <code className="text-brand-light font-mono text-[12px]">activeTab</code> permission
              grants temporary host access to the tab the user is currently viewing. This is what
              allows <code className="text-brand-light font-mono text-[12px]">chrome.scripting.executeScript</code>{' '}
              to read the job posting in that tab. It is why Cover Me can work on job postings across
              thousands of sites without asking for access to all websites.
              <br /><br />
              <strong className="text-foreground">Exactly how it is used:</strong> When you click
              Generate or Tailor Resume, the service worker injects the job-posting reader from the
              extension&apos;s own package into the page you are viewing and reads the job title,
              company name, and description. From version 1.3.0 it also sends the page&apos;s address
              and a stripped copy of the page to our server to read the posting (see Job posting data
              above). It reads no cookies, browsing history or other tabs.
              <br /><br />
              <strong className="text-foreground">Access is strictly user-initiated:</strong>{' '}
              Chrome grants this access when you click the Cover Me icon, and it ends when you leave
              the page or close the tab. The extension uses it only when you click Generate or Tailor
              Resume. It has no access to any other tab.
            </PermissionCard>

            <PermissionCard name="scripting">
              <strong className="text-foreground">Why it is needed:</strong> From version 1.3.0, Cover
              Me runs no code on web pages until you ask. Its job-posting reader is injected only when
              you click Generate or Tailor Resume, using{' '}
              <code className="text-brand-light font-mono text-[12px]">chrome.scripting.executeScript</code>.
              <br /><br />
              <strong className="text-foreground">Exactly how it is used:</strong> On your click, the
              service worker injects the reader (a file inside the extension&apos;s own package,{' '}
              <code className="text-brand-light font-mono text-[12px]">content.js</code>) into the
              active tab. If that fails, it injects a smaller self-contained scraper function from
              the same bundle. No code is fetched from any remote source. Both read only DOM text
              and JSON-LD structured data to extract job title, company name, and description. From
              version 1.3.0 the reader also returns the page&apos;s address and a copy of the page with
              scripts (except the posting&apos;s structured data), form fields, images and link query
              strings removed, which our server reads with
              the latest version of the reader. They do not write to the page, access cookies or
              localStorage, or persist anything.
              <br /><br />
              <strong className="text-foreground">Access is strictly user-initiated:</strong>{' '}
              Injection is gated by <code className="text-brand-light font-mono text-[12px]">activeTab</code>{' '}
              and only triggered when you click Generate or Tailor Resume. No scripts are injected in
              the background. Earlier versions loaded a small listener into every page that did nothing
              until you clicked Generate or Tailor Resume; Chrome shows those versions as able to read
              and change your data on all websites.
            </PermissionCard>

            <PermissionCard name="identity">
              <strong className="text-foreground">Why it is needed:</strong> It lets you sign in with
              your Google account through Chrome&apos;s own sign-in window, using{' '}
              <code className="text-brand-light font-mono text-[12px]">chrome.identity.launchWebAuthFlow</code>.
              <br /><br />
              <strong className="text-foreground">Exactly how it is used:</strong> Only when you click
              Continue with Google, Chrome opens Google&apos;s sign-in page. After you approve, Supabase
              Auth receives the email address, name, profile picture link and Google account ID Google
              shares, and the
              extension receives a Cover Me session. The extension reads nothing else from your Google
              account or from Chrome&apos;s signed-in profile. The{' '}
              <code className="text-brand-light font-mono text-[12px]">identity.email</code> permission
              is not requested.
            </PermissionCard>

            <H3>Job board host access</H3>
            <P>
              From version 1.3.0, Cover Me does not run on the websites you visit. It reads a page only when you click
              Generate or Tailor Resume, through the <code className="text-brand-light font-mono text-[12px]">activeTab</code>{' '}
              permission above. Six job-board domains are listed as host permissions so Cover Me can
              also read postings that a company&apos;s careers page embeds from those services. Together
              with the API domains below, Chrome shows this during installation as{' '}
              <strong className="text-foreground">&ldquo;Read and change your data on a number of websites.&rdquo;</strong>
            </P>

            <PermissionCard
              name="greenhouse.io, lever.co, myworkdayjobs.com, ashbyhq.com, bamboohr.com, workable.com"
              warning="Read and change your data on a number of websites"
            >
              <strong className="text-foreground">Why it is needed:</strong> Many company careers
              pages show the job posting inside an embedded frame served by an applicant tracking
              system (Greenhouse, Lever, Workday, Ashby, BambooHR, or Workable). Chrome&apos;s{' '}
              <code className="text-brand-light font-mono text-[12px]">activeTab</code> permission only
              covers the page you are on, not frames from other sites inside it, so reading those
              embedded postings requires access to these six domains.
              <br /><br />
              <strong className="text-foreground">Exactly how it is used:</strong> Only when you click
              Generate or Tailor Resume, the job-posting reader is injected into the embedded posting
              frame and reads the job title, company name, and description. From version 1.3.0, nothing
              runs on these domains at any other time. The reader does not modify the page, inject any UI, monitor
              navigation, or transmit data independently.
              <br /><br />
              <strong className="text-foreground">What we do NOT do:</strong>
              <ul className="mt-2 space-y-1 pl-4 list-disc">
                <li>We do not read content from any tab other than the one you activate Generate on.</li>
                <li>We do not monitor the pages you visit. We receive a page&apos;s address and content only when you click Generate or Tailor Resume on it.</li>
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
              API key to write cover letters and tailor resumes, and the first time you tailor after uploading a resume, to read
              your resume&apos;s structure. The request contains your API key (in the
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

            <PermissionCard name="https://ncnmkxzrygnwjiciyxqs.supabase.co/*">
              <strong className="text-foreground">Used by:</strong> Every mode, to read job postings
              (from version 1.3.0). Everything else is Hosted mode only.
              <br /><br />
              <strong className="text-foreground">Why it is needed:</strong> The extension
              communicates with our Supabase backend for the following user-initiated purposes:
              <ul className="mt-2 space-y-1 pl-4 list-disc">
                <li>Reading the job posting (every mode) — sending the stripped copy of the page you click Generate or Tailor Resume on, and getting back the job title, company and description. The page is not stored.</li>
                <li>Authentication — signing in, signing up, signing out, and refreshing JWT session tokens.</li>
                <li>Account tier — fetching your plan after sign-in and when the Settings or History page opens.</li>
                <li>Upgrade — getting a Stripe checkout page when you click an Upgrade button.</li>
                <li>Cover letter &amp; resume generation — sending job data and your session token to our backend Edge Functions, which retrieve your encrypted resume, call the Claude API with our key, and return the generated output.</li>
                <li>Application history sync (Pro mode) — saving each new cover letter and tailored resume, uploading ones already in the extension when you agree, and fetching and deleting them on the History page.</li>
                <li>Resume sync — downloading your saved resume after sign-in, and uploading a new one to encrypted backend storage. The server then reads its structure with Anthropic.</li>
              </ul>
            </PermissionCard>

            {/* ── 5. Data Storage & Security ──────────────────────────── */}
            <H2 id="storage-security">Data Storage &amp; Security</H2>

            <H3>On-device storage (all modes)</H3>
            <Ul>
              <Li>All on-device data is stored in <code className="text-brand-light font-mono text-[13px]">chrome.storage.local</code> — never in <code className="text-brand-light font-mono text-[13px]">chrome.storage.sync</code>, cookies, or <code className="text-brand-light font-mono text-[13px]">localStorage</code> — plus one &ldquo;Not now&rdquo; flag in <code className="text-brand-light font-mono text-[13px]">chrome.storage.session</code>, cleared when Chrome restarts.</Li>
              <Li>API keys (BYOK mode) are encrypted with AES-256-GCM through the Web Crypto API before being written to storage. The random key that encrypts them is stored alongside them, so this keeps the key from being read at a glance, not from someone with access to your browser profile. The plaintext key exists in memory only for the duration of a single API call.</Li>
              <Li>Resume text and cover letter history are stored unencrypted in your browser&apos;s local storage, in every mode. In Hosted mode the copies on our server are encrypted; the local copies stay on your device.</Li>
            </Ul>

            <H3>Server-side storage</H3>
            <Ul>
              <Li>Resume text, and a parsed copy of its structure, are encrypted with AES-256-GCM before being stored in our Supabase Postgres database. The encryption key is derived from a server-side secret. Plaintext resume text is never persisted to disk.</Li>
              <Li>Cover letters and tailored resumes (Pro mode) are encrypted with AES-256-GCM before storage. The job title, company, posting address, dates, interview mark, ATS match score and missing keywords that go with them are stored unencrypted so you can search and filter them. Your resume's file name is stored unencrypted too.</Li>
              <Li>Rate-limit counters (all modes) hold only a keyed hash of an IP address, or a hash of your account ID when a new resume is read, and a counter not updated for two days is deleted at the next cleanup.</Li>
              <Li>All data in transit is protected by TLS 1.2 or higher (enforced by Supabase and Vercel).</Li>
              <Li>Database access is protected by Supabase Row-Level Security policies. Users can only access their own data rows.</Li>
              <Li>The Supabase service-role key (which bypasses RLS) is used only on our servers (the backend functions and the Stripe webhook) and is never exposed to clients.</Li>
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
                  receives: 'Your resume text, the job posting data and any facts you add. In Hosted mode, also your resume on its own when you upload a new one, and in BYOK mode the first time you tailor after uploading one, so its structure can be read. In BYOK mode, requests are made with your own API key and are subject to your agreement with Anthropic. In Hosted mode, requests are made with our key.',
                },
                {
                  name: 'OpenAI',
                  url: 'https://openai.com/policies/privacy-policy',
                  when: 'BYOK mode only (OpenAI provider)',
                  receives: 'Your resume text, the job posting data and any facts you add, plus your resume on its own the first time you tailor after uploading it, to read its structure. Requests use your own API key and are subject to your agreement with OpenAI.',
                },
                {
                  name: 'Supabase',
                  url: 'https://supabase.com/privacy',
                  when: 'Every mode (reading job postings, from version 1.3.0); everything else Hosted mode only',
                  receives: 'Copies of the job pages you ask us to read, which are processed and not stored, and rate-limit counters keyed by a hash of your IP address. In Hosted mode also: the job details, any facts you add and, when you regenerate, the previous tailored resume, sent with each generation request (not stored, except Pro history); email address, hashed password (email sign-in only), encrypted resume text, encrypted cover letters and tailored resumes with the unencrypted fields that go with them (Pro), your resume&apos;s file name, your Stripe customer ID, your Google name, picture link and account ID, session tokens, usage counts, and the account-keyed counter used when a new resume is read (see Information We Collect for each). Supabase Auth also records the IP address and browser of each signed-in session, kept with your account. Supabase hosts our backend functions, authentication system and database, and keeps standard request logs (IP address, browser, time, and the address requested, which can include a dashboard search) for a short period.',
                },
                {
                  name: 'Google',
                  url: 'https://policies.google.com/privacy',
                  when: 'If you choose "Continue with Google", and, before version 1.3.0, whenever the popup opens',
                  receives: 'Google confirms who you are and sends us your email address, name, profile picture link and Google account ID. We use the email address to create and sign in to your account, and show the picture as your account avatar in the extension and on the dashboard. Your browser loads the picture from Google\'s servers. The name is stored with your account but not used. We never see your Google password. Versions before 1.3.0 load the popup\'s fonts from Google Fonts, so Google receives your IP address and browser details each time the popup opens; from 1.3.0 the fonts ship inside the extension.',
                },
                {
                  name: 'Stripe',
                  url: 'https://stripe.com/privacy',
                  when: 'When you click Upgrade, and for Pro subscribers',
                  receives: 'Your email address and Cover Me account ID when you start checkout, then the payment information you enter on Stripe\'s page (card details, billing address). Stripe processes all payments. Its notifications to our website include the checkout details it holds (such as your email, name and billing country or postal code); we keep only a customer ID and subscription status. We never see or store your raw card details.',
                },
                {
                  name: 'Vercel',
                  url: 'https://vercel.com/legal/privacy-policy',
                  when: 'Anyone who visits cover-me.dev',
                  receives: 'Standard web server access logs (IP address, browser, requested URL) for every page of cover-me.dev. Vercel also runs the website\'s server code: for anyone signed in to the dashboard it reads your email, profile picture link, sign-up date, plan and usage from our backend to build the page; for Pro users it passes your saved applications (job details, cover letters and tailored resumes) from our backend to your browser; and it receives Stripe\'s billing notifications (your customer ID, subscription status and the checkout details Stripe holds). It stores none of these.',
                },
                {
                  name: 'Sentry',
                  url: 'https://sentry.io/privacy/',
                  when: 'Visitors to cover-me.dev (the website, not the extension)',
                  receives: 'Error reports and page-load timing from the website: the error, page URL, browser version, and your user ID if you are signed in. Form contents, cookies, and email addresses are removed before sending.',
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
              <Li><strong className="text-foreground">BYOK mode:</strong> Your resume, API key and history stay on your device, and we hold no copy of them. You can delete them at any time by removing the extension or clearing extension storage in Chrome settings. The only BYOK data on our side are the rate-limit counters and Supabase&apos;s request logs described above.</Li>
              <Li><strong className="text-foreground">Hosted account data:</strong> Your account, resume, and application history (cover letters and tailored resumes) are retained for as long as your account is active. You may request deletion at any time by contacting us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-light hover:text-foreground transition-colors">{CONTACT_EMAIL}</a>. We will permanently delete all your data within 30 days of a verified deletion request.</Li>
              <Li><strong className="text-foreground">Usage count records:</strong> Kept for as long as your account exists, because the free allowance counts generations over the life of the account. They are deleted with your account.</Li>
              <Li><strong className="text-foreground">Rate-limit counters:</strong> A counter not updated for two days is deleted at the next cleanup, which runs during later requests.</Li>
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
              <Li>Data collected is used solely to provide and improve the features you explicitly request: reading a job posting, tailoring your resume to it, and writing a cover letter.</Li>
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
      <SiteFooter />
    </div>
  )
}
