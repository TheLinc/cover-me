import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SiteNav } from '@/components/site/SiteNav'
import { APP_LINKS } from '@/components/site/app-links'
import { SignOutButton } from '@/components/site/SignOutButton'
import { ApplicationsBrowser } from './ApplicationsBrowser'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = { title: 'Your applications', robots: { index: false } }

// Every account's jobs; letters and resumes too for Pro. An account that
// only uses its own API key sends nothing here, so its board stays empty.
export default async function ApplicationsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/dashboard/applications')
  const { data: userData } = await supabase.from('users').select('tier').eq('id', user.id).single()
  const pro = userData?.tier === 'hosted_pro'

  return (
    <div className="min-h-screen bg-background">
      <SiteNav links={APP_LINKS} actions={<SignOutButton />} />
      <main className="relative z-[1] px-5 pb-24 pt-12">
        <div className="mx-auto flex max-w-[1040px] flex-col gap-5">
          <header className="flex flex-col gap-1.5">
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink">Applications</h1>
            <p className="text-[14px] text-ink-2">{pro ? 'Every letter and tailored resume you’ve made, synced from the extension.' : 'Every job you’ve made a letter or resume for in the extension.'}</p>
          </header>
          <ApplicationsBrowser pro={pro} />
        </div>
      </main>
      <Toaster />
    </div>
  )
}
