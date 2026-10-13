import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SiteNav } from '@/components/site/SiteNav'
import { appLinks } from '@/components/site/app-links'
import { SignOutButton } from '@/components/site/SignOutButton'
import { ApplicationsBrowser } from './ApplicationsBrowser'

export const metadata: Metadata = { title: 'Your applications', robots: { index: false } }

// Pro only: free and BYOK history lives in the extension, not on the server.
export default async function ApplicationsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')
  const { data: userData } = await supabase.from('users').select('tier').eq('id', user.id).single()
  if (userData?.tier !== 'hosted_pro') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <SiteNav links={appLinks(true)} actions={<SignOutButton />} />
      <main className="px-5 pt-14 pb-24 relative z-[1]">
        <div className="max-w-[860px] mx-auto flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-[clamp(28px,3.8vw,40px)] leading-none text-foreground">Your applications</h1>
            <p className="text-[13.5px] text-muted-foreground">Every letter and tailored resume you&apos;ve made, synced from the extension.</p>
          </header>
          <section className="bg-surface border border-border rounded-[10px] px-7 py-6">
            <ApplicationsBrowser />
          </section>
        </div>
      </main>
    </div>
  )
}
