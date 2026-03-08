import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 })
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    return NextResponse.next()
  }

  const path = request.nextUrl.pathname
  const isApiRoute = path.startsWith("/api/")
  const isAuthRoute = path.startsWith("/api/auth/")
  const isWebhook = path.startsWith("/api/webhooks/") || path === "/api/billing/webhook"
  const isPublicCampaign = path.startsWith("/api/public/")
  const isOgRoute = path.startsWith("/api/og/")
  const isPublicInvest = path.startsWith("/invest/")
  const isAuthPage = path.startsWith("/auth/")

  // Invite/referral — cookie set must happen in middleware, not in Server Component
  const inviteMatch = path.match(/^\/invite\/([^/]+)$/)
  if (inviteMatch) {
    const code = inviteMatch[1]
    const redirectUrl = new URL(`/?ref=${code}`, request.url)
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set("referral_code", code, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    })
    return response
  }

  if (isWebhook || isPublicCampaign || isOgRoute) return supabaseResponse

  if (isApiRoute && !isAuthRoute && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isLandingPage = path === "/"
  const isInvitePage = path.startsWith("/invite/")
  if (!isApiRoute && !isAuthPage && !isPublicInvest && !isLandingPage && !isInvitePage && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)).*)"],
}
