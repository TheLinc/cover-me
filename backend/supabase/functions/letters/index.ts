import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt, encrypt } from '../_shared/encrypt.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  const userId = user.id

  const { data: userData } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single()

  if (userData?.tier !== 'hosted_pro') {
    return json({ error: 'History sync requires a Pro subscription.' }, 403)
  }

  const url = new URL(req.url)
  const letterId = url.searchParams.get('id')

  // GET — fetch history
  if (req.method === 'GET') {
    const { data: rows, error } = await supabase
      .from('cover_letters')
      .select('id, company, role, letter_encrypted, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return json({ error: 'Failed to fetch history' }, 500)

    const letters: unknown[] = []
    for (const row of rows ?? []) {
      try {
        const letter = await decrypt(row.letter_encrypted)
        letters.push({
          id: row.id,
          job: { title: row.role ?? '', company: row.company ?? '', description: '', url: '' },
          letter,
          createdAt: row.created_at,
        })
      } catch {
        // Skip letters that fail to decrypt rather than aborting the whole response
      }
    }

    return json({ letters })
  }

  // POST — save letter
  if (req.method === 'POST') {
    let body: { id: string; job: { title: string; company: string }; letter: string; createdAt: string }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid request body' }, 400)
    }

    if (!body?.id || !body?.letter) return json({ error: 'Missing required fields' }, 400)

    const letter_encrypted = await encrypt(body.letter)

    const { error } = await supabase.from('cover_letters').upsert({
      id: body.id,
      user_id: userId,
      company: body.job?.company ?? null,
      role: body.job?.title ?? null,
      letter_encrypted,
      created_at: body.createdAt,
    })

    if (error) return json({ error: 'Failed to save letter' }, 500)
    return json({ success: true })
  }

  // DELETE — remove letter by id query param
  if (req.method === 'DELETE') {
    if (!letterId) return json({ error: 'Missing id' }, 400)

    const { error } = await supabase
      .from('cover_letters')
      .delete()
      .eq('id', letterId)
      .eq('user_id', userId)

    if (error) return json({ error: 'Failed to delete letter' }, 500)
    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})
