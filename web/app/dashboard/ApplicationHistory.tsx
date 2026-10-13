import Link from 'next/link'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr'
import { fetchApplications, type ApplicationSummary } from '@/lib/applications'
import { ApplicationCard } from './applications/ApplicationCard'

// Pro history (2e). Streams in behind <Suspense> so the rest of the dashboard
// doesn't wait on the applications function. Renders nothing if the call fails.
export async function ProHistory({ accessToken }: { accessToken: string }) {
  const page = await fetchApplications(process.env.NEXT_PUBLIC_SUPABASE_URL!, accessToken, { limit: 6 })
  return page ? <ApplicationHistory applications={page.applications} /> : null
}

// The newest six as tiles; the applications page has the rest, with search.
export function ApplicationHistory({ applications }: { applications: ApplicationSummary[] }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="recent-applications">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recent-applications" className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Recent applications</h2>
        {applications.length > 0 && (
          <Link href="/dashboard/applications" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-brand-strong underline-offset-4 hover:underline">
            See all <ArrowRightIcon size={13} aria-hidden />
          </Link>
        )}
      </div>
      {applications.length === 0 ? (
        <div className="flex flex-col items-start gap-1.5 rounded-[20px] border border-dashed border-line px-6 py-7">
          <p className="text-[15px] font-semibold text-ink">No applications yet</p>
          <p className="max-w-[46ch] text-[13.5px] text-ink-2">Letters and tailored resumes you make in the extension appear here, on every device.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {applications.map((app) => <ApplicationCard key={app.id} app={app} />)}
        </div>
      )}
    </section>
  )
}
