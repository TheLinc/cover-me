import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SiteNav } from '@/components/site/SiteNav'
import { appLinks } from '@/components/site/app-links'
import { SignOutButton } from '@/components/site/SignOutButton'
import { ApplicationsBrowser } from './ApplicationsBrowser'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = { title: 'Your applications', robots: { index: false } }

// Pro only: free and BYOK history lives in the extension, not on the server.
export default async function ApplicationsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/dashboard/applications')
  const { data: userData } = await supabase.from('users').select('tier').eq('id', user.id).single()
  if (userData?.tier !== 'hosted_pro') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <SiteNav links={appLinks(true)} actions={<SignOutButton />} />
      <main className="relative z-[1] px-5 pb-24 pt-12">
        <div className="mx-auto flex max-w-[1040px] flex-col gap-5">
          <header className="flex flex-col gap-1.5">
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink">Applications</h1>
            <p className="text-[14px] text-ink-2">Every letter and tailored resume you&apos;ve made, synced from the extension.</p>
          </header>
          <ApplicationsBrowser />
        </div>
      </main>
      <Toaster />
    </div>
  )
}
