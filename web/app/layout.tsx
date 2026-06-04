import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cover Me — AI cover letters in seconds',
  description: 'Cover Me reads the job posting and generates a tailored, human-sounding cover letter from your resume. One click. Zero clichés.',
  openGraph: {
    title: 'Cover Me',
    description: 'AI cover letters that sound like you.',
    type: 'website',
    images: ['/logo.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
