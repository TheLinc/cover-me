import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Payment received | Cover Me',
  robots: { index: false },
}

// Stripe Checkout's success_url. Needs no sign-in: the extension picks up the
// new tier from the server on its next request. Stripe's webhook can land a
// few seconds after this page, so the copy doesn't promise Pro is already on.
export default function UpgradedPage() {
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

      <main className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-1.2px]">Payment received</h1>
        <p className="mt-4 text-muted-foreground">
          Pro turns on as soon as Stripe confirms the payment, usually within a minute. Then go back to the job
          posting and open Cover Me: your next letter or resume runs with up to 25 generations a day.
        </p>
        <p className="mt-2 text-muted-foreground">You can close this tab.</p>
      </main>
    </div>
  )
}
