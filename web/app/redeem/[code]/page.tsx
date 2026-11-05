import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { RedeemTrial } from './RedeemTrial'

// A gift trial link from `pnpm trial-links` (#112). Not in sitemap.ts.
export const metadata: Metadata = {
  title: 'A free week of Pro',
  robots: { index: false },
}

export default async function RedeemPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Cover Me" width={26} height={26} className="rounded-md" />
            <span className="font-bold text-[15px] tracking-[-0.3px]">Cover Me</span>
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-20 text-center">
        {user ? (
          <RedeemTrial code={code} email={user.email ?? ''} />
        ) : (
          <>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">You&apos;ve been given a free week of Pro</h1>
            <p className="mt-4 text-[15px] text-muted-foreground">
              25 letters and resumes a day for 7 days. No card needed, and it ends on its own.
              Sign in or create an account to start it.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href={`/auth?next=${encodeURIComponent(`/redeem/${code}`)}`}>Sign in or create an account</Link>
            </Button>
          </>
        )}
      </main>
    </div>
  )
}
