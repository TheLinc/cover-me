import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { avatarUrl } from '@/lib/avatar'
import { readTrial } from '@/lib/read-trial'
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
  const { data: userData } = await supabase.from('users').select('tier, stripe_customer_id').eq('id', user.id).single()
  const email = user.email ?? ''
  // The preview's subject matches the server's plan label: a gift trial reads "Trial".
  const pro = userData?.tier === 'hosted_pro'
  const trial = pro && userData.stripe_customer_id ? (await readTrial(userData.stripe_customer_id)).giftTrialEnd : null

  return (
    <div className="min-h-screen bg-background">
      <SiteNav links={APP_LINKS} actions={<AccountMenu email={email} avatar={avatarUrl(user.user_metadata)} />} />
      <main className="relative z-[1] px-5 pb-24 pt-12">
        <div className="mx-auto max-w-[1040px]">
          <SupportForm email={email} plan={trial ? 'Trial' : pro ? 'Pro' : 'Free'} />
        </div>
      </main>
    </div>
  )
}
