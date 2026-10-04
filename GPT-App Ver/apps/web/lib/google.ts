import type { OAuthExchange } from '@impulse/api'

export const exchangeGoogle: OAuthExchange = async (code, codeVerifier) => {
  const url = process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Google sign-in is not configured.')
  if (!codeVerifier) throw new Error('Missing PKCE verifier.')
  const response = await fetch(`${url}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: { apikey: anon, authorization: `Bearer ${anon}`, 'content-type': 'application/json' },
    body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
  })
  if (!response.ok) throw new Error('Google sign-in was rejected.')
  const body = (await response.json()) as {
    user?: { id: string; email?: string; user_metadata?: { full_name?: string; name?: string } }
  }
  const user = body.user
  if (!user?.email) throw new Error('Google did not return an email.')
  return {
    providerId: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
  }
}
