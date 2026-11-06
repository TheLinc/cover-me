import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { StarIcon } from '@phosphor-icons/react/dist/ssr'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { avatarUrl } from '@/lib/avatar'
import { SiteNav } from '@/components/site/SiteNav'
import { APP_LINKS } from '@/components/site/app-links'
import { AccountMenu } from '@/components/site/AccountMenu'
import { Badge } from '@/components/ui/badge'
import { LocalDate } from '../LocalDate'
import { DeleteAccount } from './DeleteAccount'
import { ManageBilling } from './ManageBilling'
import { ProductUpdatesSwitch } from './ProductUpdatesSwitch'

export const metadata: Metadata = { title: 'Settings', robots: { index: false } }

const TILE = 'flex flex-col items-start gap-2.5 rounded-[20px] border border-line bg-surface px-6 py-5 shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)]'

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section aria-labelledby={id} className={TILE}>
      <h2 id={id} className="text-[12.5px] font-normal text-subtle">{title}</h2>
      {children}
    </section>
  )
}

// Account details, plan and emails (#133), moved off the dashboard.
export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/dashboard/settings')
  const { data: userData } = await supabase.from('users').select('tier, created_at, product_updates').eq('id', user.id).single()
  const email = user.email ?? ''

  return (
    <div className="min-h-screen bg-background">
      <SiteNav links={APP_LINKS} actions={<AccountMenu email={email} avatar={avatarUrl(user.user_metadata)} />} />
      <main className="relative z-[1] px-5 pb-24 pt-12">
        <div className="mx-auto flex max-w-[1040px] flex-col gap-5">
          <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink">Settings</h1>
          <div className="flex max-w-[640px] flex-col gap-5">
          <Section title="Account">
            <p className="break-all text-[15px] font-medium text-ink">{email}</p>
            <p className="text-[13.5px] text-ink-2">
              Member since <LocalDate iso={userData?.created_at ?? user.created_at} options={{ month: 'long', year: 'numeric' }} />
            </p>
          </Section>
          <Section title="Plan">
            {userData?.tier === 'hosted_pro' ? (
              <>
                <Badge variant="pro">Pro <StarIcon size={11} weight="fill" aria-hidden /></Badge>
                <ManageBilling />
              </>
            ) : (
              <>
                <Badge variant="free">Free plan</Badge>
                <Link href="/dashboard#upgrade" className="text-[13.5px] font-medium text-brand-strong underline-offset-4 hover:underline">
                  See Pro plans
                </Link>
              </>
            )}
          </Section>
          <Section title="Emails">
            <ProductUpdatesSwitch initial={userData?.product_updates ?? false} />
          </Section>
          <Section title="Delete account">
            <DeleteAccount pro={userData?.tier === 'hosted_pro'} />
          </Section>
          </div>
        </div>
      </main>
    </div>
  )
}
