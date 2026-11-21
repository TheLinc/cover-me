import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerUser } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { LogoHeader, SiteNav } from '@/components/site/SiteNav'
import { APP_LINKS } from '@/components/site/app-links'
import { AccountMenu } from '@/components/site/AccountMenu'
import { avatarUrl } from '@/lib/avatar'
import { Ambient } from '@/components/landing/Ambient'
import { GiftBadge, RedeemTrial } from './RedeemTrial'

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
        // Signing out comes back here, so the link can go to another account. (#112)
        <SiteNav links={APP_LINKS} actions={<AccountMenu email={user.email ?? ''} avatar={avatarUrl(user.user_metadata)} signOutTo={here} />} />
      ) : (
        <LogoHeader />
      )}

      <main className="relative isolate max-w-xl mx-auto px-6 py-20 text-center">
        <Ambient
          glows={[{ left: 0, top: -160, size: 560, tone: 'brand' }, { right: 0, top: 120, size: 360, tone: 'warm' }]}
          dots={{ left: 'calc(50% - 210px)', top: 0, w: 420, h: 220 }}
        />
        {!user ? (
          <>
            <GiftBadge />
            <h1 className="text-balance text-[34px] font-semibold leading-tight tracking-[-0.03em]">
              You&apos;ve been given a <span className="text-brand-strong">free week</span> of Pro
            </h1>
            <p className="mt-4 text-[15px] text-muted-foreground">
              25 letters and resumes a day for 7 days. No card needed, and it ends on its own.
              Sign in or create an account to start it.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href={`/auth?next=${encodeURIComponent(here)}`}>Sign in or create an account</Link>
            </Button>
          </>
        ) : row?.tier === 'hosted_pro' ? (
          // Known before any click: billing would refuse it, so don't offer it. (#112)
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
