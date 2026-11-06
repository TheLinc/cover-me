import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { stripe, StripeError } from '../_shared/stripe.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!

// Self-serve account deletion (#144), from the dashboard's Settings page.
// DELETE with the user's token removes the Stripe customer, which cancels any
// subscription at once with no refund, then the auth user. Every table
// cascades from auth.users. Stripe goes first so a failure never leaves a
// subscription billing an account that's gone; a retry after a later failure
// finds the customer already deleted (404) and carries on.
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  if (req.method !== 'DELETE') return json({ error: 'Method not allowed' }, 405)

  const { data: row, error: readError } = await supabase.from('users').select('stripe_customer_id').eq('id', user.id).maybeSingle()
  if (readError) {
    console.error('[account] user read failed')
    return json({ error: 'Could not delete your account. Please try again.' }, 500)
  }

  const customerId = row?.stripe_customer_id as string | null | undefined
  if (customerId) {
    try {
      await stripe(`customers/${encodeURIComponent(customerId)}`, {}, { method: 'DELETE' })
    } catch (err) {
      if (!(err instanceof StripeError && err.code === 'resource_missing')) {
        console.error('[account]', err instanceof Error ? err.message : 'unknown error')
        return json({ error: 'Could not reach billing. Your account was not deleted. Please try again.' }, 502)
      }
    }
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[account] deleteUser failed:', error.message)
    return json({ error: 'Could not delete your account. Please try again.' }, 500)
  }
  return json({ deleted: true })
})
