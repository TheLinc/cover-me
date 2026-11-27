import Link from 'next/link'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr'
import { fetchApplications, type ApplicationSummary } from '@/lib/applications'
import { ApplicationCard } from './applications/ApplicationCard'
import { TileSkeletons } from './applications/TileSkeletons'
import { EmptyApplications } from './applications/EmptyApplications'

// Recent applications (2e; every account since #101). Streams in behind
// <Suspense> so the rest of the dashboard doesn't wait on the applications
// function. Renders nothing if the call fails.
export async function RecentApplications({ accessToken, pro }: { accessToken: string; pro: boolean }) {
  const page = await fetchApplications(process.env.NEXT_PUBLIC_SUPABASE_URL!, accessToken, { limit: 6 })
  return page ? <ApplicationHistory applications={page.applications} pro={pro} /> : null
}

export function RecentApplicationsSkeleton() {
  return (
    <section className="flex flex-col gap-4" aria-label="Loading recent applications">
      <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Recent applications</h2>
      <TileSkeletons count={2} label="Loading" />
    </section>
  )
}

export function ApplicationHistory({ applications, pro }: { applications: ApplicationSummary[]; pro: boolean }) {
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
        <EmptyApplications pro={pro} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {applications.map((app) => <ApplicationCard key={app.id} app={app} pro={pro} />)}
        </div>
      )}
    </section>
  )
}
