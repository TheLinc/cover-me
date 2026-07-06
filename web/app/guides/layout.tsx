import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-20 bg-[rgba(13,17,23,0.92)] backdrop-blur-2xl border-b border-border">
        <div className="max-w-[900px] mx-auto px-8 h-[58px] flex items-center justify-between max-md:px-5">
          <Link href="/" className="flex items-center gap-[9px] text-[15px] font-bold text-foreground tracking-[-0.3px]">
            <Image src="/logo.png" width={22} height={22} alt="Cover Me" />
            Cover Me
          </Link>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-brand text-white font-semibold text-[13px] px-4 py-2 rounded-[7px] hover:bg-brand/90 transition-colors"
          >
            Install free
          </a>
        </div>
      </nav>

      {children}

      <footer className="border-t border-border mt-8">
        <div className="max-w-[900px] mx-auto px-8 py-8 max-md:px-5 flex items-center justify-between text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">← Cover Me</Link>
          <div className="flex gap-5">
            <Link href="/guides" className="hover:text-foreground transition-colors">All guides</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
