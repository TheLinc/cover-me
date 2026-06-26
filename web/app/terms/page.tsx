import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing your use of the Cover Me Chrome extension and web dashboard. MIT-licensed, open source, governed by Ontario law.',
  alternates: { canonical: `${BASE}/terms` },
  openGraph: {
    title: 'Terms of Service — Cover Me',
    description: 'Terms governing your use of the Cover Me Chrome extension and web dashboard.',
    url: `${BASE}/terms`,
    siteName: 'Cover Me',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service — Cover Me',
    description: 'Terms governing your use of the Cover Me Chrome extension and web dashboard.',
  },
}

const EFFECTIVE_DATE = 'June 4, 2026'
const CONTACT_EMAIL  = 'support@cover-me.dev'

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

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] text-muted-foreground leading-[1.8] mb-4">
      {children}
    </p>
  )
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-none space-y-2 mb-4">{children}</ul>
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[15px] text-muted-foreground leading-[1.8]">
      <span className="text-brand mt-[3px] shrink-0">→</span>
      <span>{children}</span>
    </li>
  )
}

const TOC = [
  { id: 'acceptance',   label: 'Acceptance of Terms' },
  { id: 'service',      label: 'Description of Service' },
  { id: 'accounts',     label: 'Accounts' },
  { id: 'acceptable',   label: 'Acceptable Use' },
  { id: 'payment',      label: 'Payment & Cancellation' },
  { id: 'open-source',  label: 'Open Source & MIT License' },
  { id: 'no-warranty',  label: 'No Warranty' },
  { id: 'liability',    label: 'Limitation of Liability' },
  { id: 'termination',  label: 'Termination' },
  { id: 'changes',      label: 'Changes to These Terms' },
  { id: 'governing',    label: 'Governing Law' },
  { id: 'contact',      label: 'Contact' },
]

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'Terms of Service', item: `${BASE}/terms` },
  ],
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

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

          {/* Sidebar TOC */}
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
                Terms of Service
              </h1>
              <p className="text-[15px] text-muted-foreground">
                Effective date: <strong className="text-foreground">{EFFECTIVE_DATE}</strong>
              </p>
            </div>

            {/* ── 1. Acceptance ───────────────────────────────────────── */}
            <H2 id="acceptance">Acceptance of Terms</H2>
            <P>
              By installing the Cover Me Chrome extension, creating an account, or using the Cover Me
              web dashboard, you agree to be bound by these Terms of Service. If you do not agree,
              do not use Cover Me.
            </P>
            <P>
              These terms apply to all users, including BYOK (free, no account) users who install the
              extension, Hosted Free account holders, and Hosted Pro subscribers.
            </P>

            {/* ── 2. Description of Service ───────────────────────────── */}
            <H2 id="service">Description of Service</H2>
            <P>
              Cover Me is a Chrome extension and companion web dashboard that generates tailored
              cover letters from job postings using AI. It operates in two modes:
            </P>
            <Ul>
              <Li>
                <strong className="text-foreground">BYOK (Bring Your Own Key).</strong> You supply your
                own Claude or OpenAI API key. All processing occurs on your device. No account is
                required. This mode is free and unlimited, subject to your API provider&apos;s own
                usage limits and terms.
              </Li>
              <Li>
                <strong className="text-foreground">Hosted (Free &amp; Pro).</strong> You create an
                account. Cover letter generation is handled by our backend using our API key. The Free
                tier allows 10 letters per day. The Pro tier ($4/month) provides unlimited generation
                and cross-device history sync.
              </Li>
            </Ul>
            <P>
              We reserve the right to modify, suspend, or discontinue any part of the service at any
              time. We will provide reasonable notice for material changes where practicable.
            </P>

            {/* ── 3. Accounts ─────────────────────────────────────────── */}
            <H2 id="accounts">Accounts</H2>
            <Ul>
              <Li>
                You must provide an accurate email address when creating an account. You are
                responsible for maintaining the confidentiality of your password.
              </Li>
              <Li>
                You are responsible for all activity that occurs under your account. Notify us
                immediately at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-light hover:text-foreground transition-colors">
                  {CONTACT_EMAIL}
                </a>{' '}
                if you suspect unauthorised access.
              </Li>
              <Li>
                One account per person. You may not create accounts on behalf of others without
                their consent.
              </Li>
              <Li>
                You must be at least 13 years old to create an account. By creating an account you
                represent that you meet this requirement.
              </Li>
            </Ul>

            {/* ── 4. Acceptable Use ───────────────────────────────────── */}
            <H2 id="acceptable">Acceptable Use</H2>
            <P>You agree not to use Cover Me to:</P>
            <Ul>
              <Li>Generate content that is fraudulent, misleading, or misrepresents your qualifications to employers.</Li>
              <Li>Violate any applicable law or regulation.</Li>
              <Li>Attempt to reverse-engineer, decompile, or extract our proprietary backend systems. (The extension source code is MIT-licensed and freely available on GitHub — no circumvention is needed or permitted beyond what the license grants.)</Li>
              <Li>Abuse the hosted service by automating requests, sharing accounts, or circumventing rate limits.</Li>
              <Li>Transmit malicious code, viruses, or any content intended to harm our systems or other users.</Li>
              <Li>Resell, sublicense, or provide access to the hosted service to third parties.</Li>
            </Ul>
            <P>
              We reserve the right to suspend or terminate accounts that violate these terms without
              prior notice.
            </P>

            {/* ── 5. Payment & Cancellation ───────────────────────────── */}
            <H2 id="payment">Payment &amp; Cancellation</H2>
            <Ul>
              <Li>
                <strong className="text-foreground">Billing.</strong> Cover Me Pro is billed at
                $4 USD per month as a recurring subscription. Payment is processed by Stripe.
                By subscribing you authorise Stripe to charge your payment method on a recurring
                monthly basis until you cancel.
              </Li>
              <Li>
                <strong className="text-foreground">Cancellation.</strong> You may cancel your
                subscription at any time through the billing portal accessible from your dashboard.
                Cancellation takes effect at the end of the current billing period. You retain
                Pro access until that date.
              </Li>
              <Li>
                <strong className="text-foreground">Refunds.</strong> We do not offer refunds for
                partial billing periods. If you experience a billing error, contact us within 30 days
                and we will investigate and issue a refund if appropriate.
              </Li>
              <Li>
                <strong className="text-foreground">Price changes.</strong> We may change the
                subscription price with at least 30 days&apos; notice. Continued use after a price
                change constitutes acceptance of the new price.
              </Li>
              <Li>
                <strong className="text-foreground">Taxes.</strong> Prices are exclusive of taxes.
                You are responsible for any applicable sales tax, VAT, or similar charges in your
                jurisdiction.
              </Li>
            </Ul>

            {/* ── 6. Open Source & MIT License ────────────────────────── */}
            <H2 id="open-source">Open Source &amp; MIT License</H2>
            <P>
              The Cover Me Chrome extension and backend source code are released under the{' '}
              <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noreferrer"
                className="text-brand-light hover:text-foreground transition-colors"
              >
                MIT License
              </a>
              . You are free to inspect, fork, modify, and self-host the code subject to the terms
              of that licence.
            </P>
            <P>
              The MIT licence governs the source code. These Terms of Service govern your use of
              the hosted service operated by us. Self-hosting the code does not grant you access
              to our hosted infrastructure, our API keys, or our Supabase or Stripe accounts.
            </P>

            {/* ── 7. No Warranty ──────────────────────────────────────── */}
            <H2 id="no-warranty">No Warranty</H2>
            <P>
              Cover Me is provided <strong className="text-foreground">&ldquo;as is&rdquo;</strong> and{' '}
              <strong className="text-foreground">&ldquo;as available&rdquo;</strong> without warranty
              of any kind, express or implied. To the fullest extent permitted by law, we disclaim all
              warranties including, without limitation:
            </P>
            <Ul>
              <Li>Warranties of merchantability, fitness for a particular purpose, and non-infringement.</Li>
              <Li>That the service will be uninterrupted, error-free, or secure.</Li>
              <Li>That generated cover letters will be accurate, effective, or suitable for any specific job application.</Li>
              <Li>That the service will meet your requirements or produce any particular outcome in a job search.</Li>
            </Ul>
            <P>
              You are solely responsible for reviewing and editing any generated content before
              submitting it to employers. Cover Me is a writing tool, not a guarantee of employment.
            </P>

            {/* ── 8. Limitation of Liability ──────────────────────────── */}
            <H2 id="liability">Limitation of Liability</H2>
            <P>
              To the fullest extent permitted by applicable law, Cover Me and its developer shall not
              be liable for any indirect, incidental, special, consequential, or punitive damages,
              including but not limited to loss of employment opportunity, loss of income, loss of
              data, or loss of goodwill, arising from your use of or inability to use the service.
            </P>
            <P>
              Our total aggregate liability for any claim arising out of or relating to these Terms
              or the service shall not exceed the greater of (a) the total amount you paid us in the
              12 months preceding the claim, or (b) $10 USD.
            </P>
            <P>
              Some jurisdictions do not allow the exclusion or limitation of certain warranties or
              liabilities. In such jurisdictions, our liability is limited to the maximum extent
              permitted by law.
            </P>

            {/* ── 9. Termination ──────────────────────────────────────── */}
            <H2 id="termination">Termination</H2>
            <Ul>
              <Li>
                <strong className="text-foreground">By you.</strong> You may delete your account at
                any time by contacting us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-light hover:text-foreground transition-colors">
                  {CONTACT_EMAIL}
                </a>
                . Account deletion cancels any active Pro subscription at the end of the current
                billing period and permanently removes your data within 30 days.
              </Li>
              <Li>
                <strong className="text-foreground">By us.</strong> We may suspend or terminate your
                account immediately if you violate these Terms, if required by law, or if we
                determine that continued access poses a risk to other users or our systems. Where
                practicable we will notify you and give you an opportunity to remedy the breach.
              </Li>
              <Li>
                <strong className="text-foreground">Effect of termination.</strong> Upon termination,
                your right to access the hosted service ceases. Sections covering No Warranty,
                Limitation of Liability, and Governing Law survive termination.
              </Li>
            </Ul>

            {/* ── 10. Changes ─────────────────────────────────────────── */}
            <H2 id="changes">Changes to These Terms</H2>
            <P>
              We may update these Terms of Service from time to time. When we do, we will update
              the effective date at the top of this page. For material changes, we will notify
              Hosted mode users via email at least 14 days before the changes take effect. Continued
              use of Cover Me after that date constitutes acceptance of the updated Terms.
            </P>

            {/* ── 11. Governing Law ───────────────────────────────────── */}
            <H2 id="governing">Governing Law</H2>
            <P>
              These Terms are governed by and construed in accordance with the laws of the Province
              of Ontario, Canada, without regard to its conflict of law provisions. Any disputes
              arising under these Terms shall be subject to the exclusive jurisdiction of the courts
              of Ontario, Canada.
            </P>

            {/* ── 12. Contact ─────────────────────────────────────────── */}
            <H2 id="contact">Contact</H2>
            <P>Questions about these Terms should be directed to:</P>
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
              <p className="text-[12.5px] text-dim">
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
