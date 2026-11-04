import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchApplications, queryFromParams } from '@/lib/applications'

// The applications page's requests. The session's token stays on the server;
// the function checks it, and the Pro tier for an application's documents.
async function signedIn() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { token: session.access_token } : null
}

const notSignedIn = () => NextResponse.json({ error: 'Not signed in' }, { status: 401 })

// One application's detail, a stage change and delete pass straight
// through: the function's answer and status are the page's.
async function forward(token: string, method: string, params: Record<string, string>, body?: unknown, signal?: AbortSignal) {
  const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/applications`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const timeout = AbortSignal.timeout(10_000)
  try {
    const res = await fetch(url, {
      method,
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    if (data === null) return NextResponse.json({ error: 'Could not reach applications' }, { status: 502 })
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Could not reach applications' }, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  const s = await signedIn()
  if (!s) return notSignedIn()
  const detail = req.nextUrl.searchParams.get('detail')
  if (detail) return forward(s.token, 'GET', { detail }, undefined, req.signal)

  const page = await fetchApplications(process.env.NEXT_PUBLIC_SUPABASE_URL!, s.token, queryFromParams(req.nextUrl.searchParams), req.signal)
  if (!page) {
    // The page aborted it (a newer search): nobody reads this answer.
    if (req.signal.aborted) return new NextResponse(null, { status: 499 })
    return NextResponse.json({ error: 'Could not load applications' }, { status: 502 })
  }
  return NextResponse.json(page)
}

export async function PATCH(req: NextRequest) {
  const s = await signedIn()
  if (!s) return notSignedIn()
  const body = await req.json().catch(() => null)
  return forward(s.token, 'PATCH', { id: req.nextUrl.searchParams.get('id') ?? '' }, body)
}

export async function DELETE(req: NextRequest) {
  const s = await signedIn()
  if (!s) return notSignedIn()
  return forward(s.token, 'DELETE', { id: req.nextUrl.searchParams.get('id') ?? '' })
}
