import type { Metadata } from 'next'
import AuthContent from './AuthContent'

export const metadata: Metadata = {
  title: 'Sign In or Create Account',
  description: 'Sign in to your Cover Me account or create a free account to generate AI-powered, ATS-friendly cover letters from any job posting.',
  robots: { index: false, follow: false },
}

export default function AuthPage() {
  return <AuthContent />
}
