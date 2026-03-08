import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"

/**
 * GET /api/kael/unread?dossierId=X
 * Retourne les clés avec messages non lus (dernier message = manager/kael).
 * Utilisé au mount du workspace pour allumer les badges.
 */
export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const dossierId = searchParams.get("dossierId")
  if (!dossierId) return apiError("dossierId required", 400)

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const unread: string[] = []

  // KAEL — session active
  const kaelSession = await prisma.kaelSession.findFirst({
    where: { dossierId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  })
  if (kaelSession) {
    const messages = (kaelSession.messages ?? []) as Array<{ role: string }>
    const last = messages[messages.length - 1]
    if (last?.role === "kael" || last?.role === "kael_note") {
      unread.push("kael")
    }
  }

  // Pôles — sessions actives par pôle
  const poleSessions = await prisma.poleSession.findMany({
    where: { dossierId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    include: { pole: true },
  })

  // Garder seulement la session la plus récente par pôle
  const seenPoles = new Set<string>()
  for (const ps of poleSessions) {
    if (seenPoles.has(ps.poleId)) continue
    seenPoles.add(ps.poleId)

    const messages = (ps.messages ?? []) as Array<{ role: string }>
    const last = messages[messages.length - 1]
    if (last?.role === "manager") {
      // La clé dans le store est le poleId
      unread.push(ps.poleId)
    }
  }

  return apiSuccess({ unread })
}
