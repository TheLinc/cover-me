import Link from 'next/link'
import { fetchApplications, type ApplicationSummary } from '@/lib/applications'
import { ApplicationCard } from './applications/ApplicationCard'

// Pro history (2e). Streams in behind <Suspense> so the rest of the dashboard
// doesn't wait on the applications function. Renders nothing if the call fails.
export async function ProHistory({ accessToken }: { accessToken: string }) {
  const page = await fetchApplications(process.env.NEXT_PUBLIC_SUPABASE_URL!, accessToken, { limit: 5 })
  return page ? <ApplicationHistory applications={page.applications} /> : null
}

// The newest five; the applications page has the rest, with search.
export function ApplicationHistory({ applications }: { applications: ApplicationSummary[] }) {
  return (
    <section className="bg-surface border border-border rounded-[10px] px-7 py-6" style={{ animation: 'fadeUp 0.5s ease 0.32s both' }}>
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h2 className="text-[15px] text-foreground">Your applications</h2>
        {applications.length > 0 && (
          <Link href="/dashboard/applications" className="text-[13px] text-brand-light hover:text-brand transition-colors">
            See all applications
          </Link>
        )}
      </div>
      <p className="text-[13px] text-muted-foreground mb-4">
        {applications.length === 0
          ? 'Letters and tailored resumes you make in the extension appear here, on every device.'
          : 'Your most recent, synced from the extension.'}
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {applications.map((app) => <ApplicationCard key={app.id} app={app} />)}
      </div>
    </section>
  )
}
