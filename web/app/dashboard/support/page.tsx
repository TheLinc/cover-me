import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { avatarUrl } from '@/lib/avatar'
import { SiteNav } from '@/components/site/SiteNav'
import { APP_LINKS } from '@/components/site/app-links'
import { AccountMenu } from '@/components/site/AccountMenu'
import { SupportForm } from './SupportForm'

export const metadata: Metadata = { title: 'Support', robots: { index: false } }

// The signed-in support form (#133): the support function emails it to us
// with the account attached. Signed-out visitors keep the mailto on /support.
export default async function SupportPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/dashboard/support')
  const email = user.email ?? ''

  return (
    <div className="min-h-screen bg-background">
      <SiteNav links={APP_LINKS} actions={<AccountMenu email={email} avatar={avatarUrl(user.user_metadata)} />} />
      <main className="relative z-[1] px-5 pb-24 pt-12">
        <div className="mx-auto flex max-w-[640px] flex-col gap-6">
          <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink">Support</h1>
          <SupportForm email={email} />
        </div>
      </main>
    </div>
  )
}
