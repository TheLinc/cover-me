// The profile picture Google sends with a Google sign-in (Supabase keeps it in
// user_metadata). Email sign-ins have none, and the caller shows the initial.
export function avatarUrl(metadata: Record<string, unknown> | undefined): string | null {
  const url = metadata?.avatar_url || metadata?.picture
  return typeof url === 'string' && url.startsWith('https://') ? url : null
}
