import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getServerUser } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { SiteNav } from '@/components/site/SiteNav'
import { APP_LINKS } from '@/components/site/app-links'
import { AccountMenu } from '@/components/site/AccountMenu'
import { avatarUrl } from '@/lib/avatar'
import { RedeemTrial } from './RedeemTrial'

// A gift trial link from `pnpm trial-links` (#112). Not in sitemap.ts.
export const metadata: Metadata = {
  title: 'A free week of Pro',
  robots: { index: false },
}

export default async function RedeemPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const { supabase, user } = await getServerUser()
  const { data: row } = user ? await supabase.from('users').select('tier').eq('id', user.id).single() : { data: null }
  const here = `/redeem/${code}`

  return (
    <div className="min-h-screen bg-background text-foreground">
      {user ? (
        // Signed in: the account nav, so it's clear whose account this is.
        // Signing out comes back here, so the link can go to another account.
        <SiteNav links={APP_LINKS} actions={<AccountMenu email={user.email ?? ''} avatar={avatarUrl(user.user_metadata)} signOutTo={here} />} />
      ) : (
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Cover Me" width={26} height={26} className="rounded-md" />
              <span className="font-bold text-[15px] tracking-[-0.3px]">Cover Me</span>
            </Link>
          </div>
        </header>
      )}

      <main className="max-w-xl mx-auto px-6 py-20 text-center">
        {!user ? (
          <>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">You&apos;ve been given a free week of Pro</h1>
            <p className="mt-4 text-[15px] text-muted-foreground">
              25 letters and resumes a day for 7 days. No card needed, and it ends on its own.
              Sign in or create an account to start it.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href={`/auth?next=${encodeURIComponent(here)}`}>Sign in or create an account</Link>
            </Button>
          </>
        ) : row?.tier === 'hosted_pro' ? (
          // Known before any click: billing would refuse it, so don't offer it.
          <>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">You&apos;re already on Pro</h1>
            <p className="mt-4 text-[15px] text-muted-foreground">
              {user.email} already has Pro, so this free week isn&apos;t needed. The link is still unused: pass it on,
              or sign out and use it on another account.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </>
        ) : (
          <RedeemTrial code={code} email={user.email ?? ''} />
        )}
      </main>
    </div>
  )
}
