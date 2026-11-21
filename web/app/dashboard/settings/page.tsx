import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { CreditCardIcon, EnvelopeSimpleIcon, StarIcon, TrashIcon, UserCircleIcon } from '@phosphor-icons/react/dist/ssr'
import { getServerUser } from '@/lib/supabase-server'
import { avatarUrl } from '@/lib/avatar'
import { SiteNav } from '@/components/site/SiteNav'
import { APP_LINKS } from '@/components/site/app-links'
import { AccountMenu } from '@/components/site/AccountMenu'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { readPlan } from '@/lib/stripe-plan'
import type { PlanState } from '@/lib/stripe-tier'
import { DaysLeft, LocalDate } from '../LocalDate'
import { DeleteAccount } from './DeleteAccount'
import { ManageBilling } from './ManageBilling'
import { ProductUpdatesSwitch } from './ProductUpdatesSwitch'

export const metadata: Metadata = { title: 'Settings', robots: { index: false } }

const DAY: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }

const TILE = 'flex flex-col items-start gap-2.5 rounded-[20px] border border-line bg-surface px-6 py-5 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)]'

function Section({ title, icon: SectionIcon, children }: { title: string; icon: Icon; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section aria-labelledby={id} className={TILE}>
      <h2 id={id} className="flex items-center gap-1.5 text-[12.5px] font-normal text-subtle">
        <SectionIcon size={15} aria-hidden />
        <span className="cap-center">{title}</span>
      </h2>
      {children}
    </section>
  )
}

type Next = { status: ReactNode; tone: BadgeProps['variant']; sub: string; event: string; date: string; then: string }

function nextFor(plan: PlanState): Next | null {
  if (plan.giftTrialEnd) {
    const status = <>Trial<DaysLeft iso={plan.giftTrialEnd} /></>
    return { status, tone: 'tint', sub: 'Free for a week, from a gift link.', event: 'Ends', date: plan.giftTrialEnd, then: "Then you're back on the free plan." }
  }
  if (plan.firstPayment) return { status: 'Trial', tone: 'tint', sub: plan.firstPayment.price, event: 'First payment', date: plan.firstPayment.date, then: 'Nothing is charged before then.' }
  if (plan.renews) return { status: 'Active', tone: 'active', sub: plan.renews.price, event: 'Renews', date: plan.renews.date, then: 'Cancel any time before then.' }
  if (plan.endsAt) return { status: 'Ending', tone: 'free', sub: "You won't be charged again.", event: 'Ends', date: plan.endsAt, then: "Then you're back on the free plan." }
  return null
}

function ProPlan({ plan }: { plan: PlanState }) {
  const next = nextFor(plan)
  return (
    <>
      <div className="flex w-full items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink">
          Pro <StarIcon size={16} weight="fill" className="text-brand-strong" aria-hidden />
        </p>
        {next && (
          <Badge variant={next.tone} className="h-6 gap-1.5 whitespace-nowrap px-2.5 font-semibold">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            <span>{next.status}</span>
          </Badge>
        )}
      </div>
      {next && <p className="text-[14px] text-ink-2">{next.sub}</p>}
      <div className={cn('flex w-full flex-wrap items-center justify-between gap-4', next && 'mt-1.5 border-t border-line pt-3.5')}>
        {next && (
          <p className="text-[14px] leading-snug text-ink-2">
            <strong className="block text-[15px] font-semibold text-ink">{next.event} <LocalDate iso={next.date} options={DAY} /></strong>
            {next.then}
          </p>
        )}
        <div className="flex flex-col items-start gap-2"><ManageBilling /></div>
      </div>
    </>
  )
}

// Account details, plan and emails (#133), moved off the dashboard.
export default async function SettingsPage() {
  const { supabase, user } = await getServerUser()
  if (!user) redirect('/auth?next=/dashboard/settings')
  const { data: userData } = await supabase.from('users').select('tier, created_at, product_updates, stripe_customer_id').eq('id', user.id).single()
  const email = user.email ?? ''
  const plan = await readPlan(userData?.tier === 'hosted_pro' ? userData.stripe_customer_id : null)

  return (
    <div className="min-h-screen bg-background">
      <SiteNav links={APP_LINKS} actions={<AccountMenu email={email} avatar={avatarUrl(user.user_metadata)} />} />
      <main className="relative z-[1] px-5 pb-24 pt-12">
        <div className="mx-auto flex max-w-[1040px] flex-col gap-5">
          <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink">Settings</h1>
          <div className="flex max-w-[640px] flex-col gap-5">
          <Section title="Account" icon={UserCircleIcon}>
            <p className="break-all text-[15px] font-medium text-ink">{email}</p>
            <p className="text-[13.5px] text-ink-2">
              Member since <LocalDate iso={userData?.created_at ?? user.created_at} options={{ month: 'long', year: 'numeric' }} />
            </p>
          </Section>
          <Section title="Plan" icon={CreditCardIcon}>
            {userData?.tier === 'hosted_pro' ? (
              <ProPlan plan={plan} />
            ) : (
              <>
                <Badge variant="free">Free plan</Badge>
                <Link href="/dashboard#upgrade" className="text-[13.5px] font-medium text-brand-strong underline-offset-4 hover:underline">
                  See Pro plans
                </Link>
              </>
            )}
          </Section>
          <Section title="Emails" icon={EnvelopeSimpleIcon}>
            <ProductUpdatesSwitch initial={userData?.product_updates ?? false} />
          </Section>
          <Section title="Delete account" icon={TrashIcon}>
            <DeleteAccount pro={userData?.tier === 'hosted_pro'} />
          </Section>
          </div>
        </div>
      </main>
    </div>
  )
}
