import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // クッキーに保存された招待トークンがあればそちらを優先
      const pendingInvite = cookieStore.get('kai_pending_invite')
      if (pendingInvite?.value) {
        const response = NextResponse.redirect(`${origin}/invite/${pendingInvite.value}`)
        response.cookies.delete('kai_pending_invite')
        return response
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] exchangeCodeForSession error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=${encodeURIComponent(error.message)}`)
  }

  console.error('[auth/callback] no code in query params')
  return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=no_code`)
}
