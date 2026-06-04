import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Cover Me — AI cover letters in seconds',
  description: 'Cover Me reads the job posting and generates a tailored, human-sounding cover letter from your resume. One click. Zero clichés.',
  openGraph: {
    title: 'Cover Me — AI cover letters in seconds',
    description: 'One click on any job board. A tailored, human-sounding cover letter built from your resume in seconds.',
    type: 'website',
    siteName: 'Cover Me',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me — AI cover letters in seconds',
    description: 'One click on any job board. A tailored, human-sounding cover letter built from your resume in seconds.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
