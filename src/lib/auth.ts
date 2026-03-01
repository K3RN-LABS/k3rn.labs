import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { db as prisma } from "./db"
import type { UserRole } from "@prisma/client"

export interface SessionUser {
  userId: string
  email: string
  role: UserRole
}

export async function verifySession(req?: NextRequest): Promise<SessionUser | null> {
  try {
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
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    let dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { id: user.id, email: user.email!, role: "OWNER" },
      })
    }

    return { userId: dbUser.id, email: dbUser.email, role: dbUser.role }
  } catch {
    return null
  }
}

export function requireAuth(session: SessionUser | null): SessionUser {
  if (!session) throw new Error("UNAUTHORIZED")
  return session
}

export function requireRole(session: SessionUser, role: UserRole): SessionUser {
  const hierarchy: Record<UserRole, number> = { OWNER: 3, COLLABORATOR: 2, VIEWER: 1 }
  if (hierarchy[session.role] < hierarchy[role]) throw new Error("FORBIDDEN")
  return session
}
