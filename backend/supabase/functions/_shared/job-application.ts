import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

interface Job {
  title?: string
  company?: string
  url?: string
}

// Find an existing job_application for this user+job, or create one.
// Match priority: URL (covered by partial unique index) → company+title (manual entries).
// Non-concurrent — extension users don't generate two things simultaneously.
export async function findOrCreateJobApplication(
  supabase: SupabaseClient,
  userId: string,
  job: Job,
): Promise<string> {
  const url = job.url || null
  const title = job.title || null
  const company = job.company || null

  if (url) {
    const { data } = await supabase
      .from('job_applications')
      .select('id')
      .eq('user_id', userId)
      .eq('url', url)
      .maybeSingle()
    if (data?.id) return data.id
  } else if (company || title) {
    let q = supabase
      .from('job_applications')
      .select('id')
      .eq('user_id', userId)
      .is('url', null)
    if (company) q = q.eq('company', company)
    if (title)   q = q.eq('title', title)
    const { data } = await q.maybeSingle()
    if (data?.id) return data.id
  }

  const { data, error } = await supabase
    .from('job_applications')
    .insert({ user_id: userId, title, company, url })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Failed to create job application: ${error?.message ?? 'unknown'}`)
  return data.id
}
