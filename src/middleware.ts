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
  const isWebhook = path.startsWith("/api/webhooks/")
  const isPublicCampaign = path.startsWith("/api/public/")
  const isPublicInvest = path.startsWith("/invest/")
  const isAuthPage = path.startsWith("/auth/")

  if (isWebhook || isPublicCampaign) return supabaseResponse

  if (isApiRoute && !isAuthRoute && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isLandingPage = path === "/"
  if (!isApiRoute && !isAuthPage && !isPublicInvest && !isLandingPage && !user) {
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
