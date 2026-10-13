import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchApplications, queryFromParams } from '@/lib/applications'

// The applications page's searches. The session's token stays on the server;
// the function checks it and the Pro tier.
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const page = await fetchApplications(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    session.access_token,
    queryFromParams(req.nextUrl.searchParams),
    req.signal,
  )
  if (!page) {
    // A lapsed subscription looks like any other failure from here; tell the
    // page, so it leaves instead of offering a retry that can't work.
    const { data: userData } = await supabase.from('users').select('tier').eq('id', user.id).single()
    if (userData && userData.tier !== 'hosted_pro') return NextResponse.json({ error: 'Pro only' }, { status: 403 })
    return NextResponse.json({ error: 'Could not load applications' }, { status: 502 })
  }
  return NextResponse.json(page)
}
