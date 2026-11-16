import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { ComponentType } from 'react'
import { CheckIcon, SparkleIcon } from '@phosphor-icons/react/dist/ssr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LocalDate } from '@/app/dashboard/LocalDate'

type Props = { searchParams: Promise<{ first?: string }> }

// ?first=<unix seconds> is an upgrade from a gift trial (#112): nothing is
// charged today, and the first payment is then.
async function firstPaymentDate({ searchParams }: Props): Promise<string | null> {
  const { first } = await searchParams
  return first && /^\d{9,11}$/.test(first) ? new Date(Number(first) * 1000).toISOString() : null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await firstPaymentDate(props)) ? "You're on Pro" : 'Payment received', robots: { index: false } }
}

// One small drawing per Pro item, each a piece of the real product reduced to
// a single shape. Decorative: the row's heading says the same thing.

// 25 a day, one dot per generation.
function Quota() {
  return (
    <div className="grid grid-cols-5 gap-[3px]">
      {Array.from({ length: 25 }, (_, i) => <span key={i} className="size-[6px] rounded-full bg-brand" />)}
    </div>
  )
}

// The same History open on two computers.
function Screen() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-[15px] w-[19px] flex-col justify-center gap-[2px] rounded-[3px] border-[1.5px] border-ink px-[2px]">
        <span className="h-[2.5px] w-full rounded-full bg-brand" />
        <span className="h-[2.5px] w-2/3 rounded-full bg-line" />
      </div>
      <span className="h-[2.5px] w-[23px] rounded-full bg-ink" />
    </div>
  )
}
function Devices() {
  return (
    <div className="flex items-center gap-[3px]">
      <Screen />
      <span className="w-1 border-t border-dashed border-brand" />
      <Screen />
    </div>
  )
}

// A resume page that downloads as Word.
function WordDoc() {
  return (
    <div className="relative -translate-x-1">
      <div className="flex h-[38px] w-[30px] flex-col gap-[4px] rounded-[4px] bg-white p-[5px] pt-[7px] shadow-sm">
        <span className="h-[3px] w-full rounded-full bg-line" />
        <span className="h-[3px] w-full rounded-full bg-line" />
        <span className="h-[3px] w-2/3 rounded-full bg-line" />
      </div>
      <span className="absolute -bottom-1 -right-3 rounded-[4px] bg-brand-strong px-1 text-[8px] font-bold leading-[13px] text-white">DOCX</span>
    </div>
  )
}

// A line being typed, then the saved check.
function EditSaved() {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-[2px]">
        <span className="h-[4px] w-7 rounded-full bg-subtle opacity-40" />
        <span className="h-[12px] w-[2px] bg-brand-strong" />
      </div>
      <span className="flex size-4 items-center justify-center rounded-[5px] bg-brand-tint text-brand-ink">
        <CheckIcon size={10} weight="bold" />
      </span>
    </div>
  )
}

function NewBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-brand-strong px-1.5 py-0.5 text-[10px] font-semibold text-white">
      <SparkleIcon size={10} weight="fill" /> NEW
    </span>
  )
}

// Only what Pro adds, each checked against the code that gates it (#227).
// The job board and Word export are on every account, so the Word row names
// the Pro part: resumes downloaded from the dashboard in the user's own design.
// Pricing.tsx's PRO list says the same in three lines.
const ITEMS: { title: string; hint: string; Visual: ComponentType }[] = [
  { title: 'Up to 25 a day', hint: 'Letters or tailored resumes, instead of 5 a week', Visual: Quota },
  { title: 'Saved to your account', hint: 'Every letter and resume, in History on any computer', Visual: Devices },
  { title: 'Full letters and resumes', hint: 'On your dashboard. Resumes download as Word in your design', Visual: WordDoc },
  { title: 'Edits save to your account', hint: 'In the resume editor', Visual: EditSaved },
  { title: 'New features first', hint: 'Early access', Visual: NewBadge },
]

// Stripe Checkout's success_url. Needs no sign-in: the extension picks up the
// new tier from the server on its next request. Stripe's webhook can land a
// few seconds after this page, so the copy doesn't promise Pro is already on.
export default async function UpgradedPage(props: Props) {
  const firstPayment = await firstPaymentDate(props)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* /dashboard sends signed-out visitors to /auth, which lands on the dashboard after sign-in. */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Cover Me" width={26} height={26} className="rounded-md" />
            <span className="font-bold text-[15px] tracking-[-0.3px]">Cover Me</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[520px] px-5 py-16 max-md:py-10">
        <div className="text-center">
          <Badge variant="outline" className="gap-2 border-transparent bg-white px-3.5 py-1.5 text-[13px] font-normal text-ink-2 shadow-sm">
            {firstPayment ? (
              <>No charge until <LocalDate iso={firstPayment} options={{ month: 'short', day: 'numeric', year: 'numeric' }} /></>
            ) : (
              <>
                <span aria-hidden="true" className="relative flex size-2.5">
                  <span className="pulse absolute inset-0 rounded-full bg-brand opacity-60" />
                  <span className="relative size-2.5 rounded-full bg-brand" />
                </span>
                Pro turns on within a minute
              </>
            )}
          </Badge>
          <h1 className="mt-5 text-[clamp(34px,8vw,48px)] leading-[1.05]">{firstPayment ? "You're on Pro" : 'Payment received'}</h1>
        </div>

        <Card className="mt-10 rounded-[24px] border-0">
          <ul className="divide-y divide-line">
            {ITEMS.map(({ title, hint, Visual }, i) => (
              <li key={title} className="flex animate-fade-up items-center gap-4 px-5 py-4" style={{ animationDelay: `${150 + i * 70}ms` }}>
                <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-panel"><Visual /></span>
                <div>
                  <h2 className="text-[16px] leading-tight">{title}</h2>
                  <p className="text-[13px] leading-snug text-subtle">{hint}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          {/* #226's "save the applications in this browser" button goes beside this one. */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link href="/dashboard">Go to dashboard</Link></Button>
          </div>
          <p className="text-[14px] text-subtle">Upgraded from the extension? You can close this tab.</p>
        </div>
      </main>
    </div>
  )
}
