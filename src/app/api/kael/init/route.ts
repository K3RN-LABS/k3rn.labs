import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { generateKAELOpener } from "@/lib/claude"
import { buildProjectMemory } from "@/lib/project-memory"
import { randomUUID } from "node:crypto"

/**
 * GET /api/kael/init?dossierId=X
 * Idempotent — returns existing active session or creates one with opener.
 * Called on workspace mount to proactively generate the KAEL opener.
 */
export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const dossierId = searchParams.get("dossierId")
  if (!dossierId) return apiError("dossierId required", 400)

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  // Return existing active session — badge if last message is from KAEL (unread)
  const existing = await prisma.kaelSession.findFirst({
    where: { dossierId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  })
  if (existing) {
    const messages = (existing.messages ?? []) as Array<{ role: string }>
    const lastMsg = messages[messages.length - 1]
    const hasUnread = !!lastMsg && (lastMsg.role === "kael" || lastMsg.role === "kael_note")
    return apiSuccess({ sessionId: existing.id, isNew: false, hasUnread })
  }

  // Create new session with opener
  const [projectMemory, previousSession] = await Promise.all([
    buildProjectMemory(dossierId),
    prisma.kaelSession.findFirst({
      where: { dossierId },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  let previousSessionContext: string | undefined
  if (previousSession) {
    const prevMessages = (previousSession.messages ?? []) as Array<{ role: string; content: string }>
    const relevant = prevMessages
      .filter((m) => m.role === "user" || m.role === "kael")
      .slice(-10)
    if (relevant.length > 0) {
      previousSessionContext = relevant
        .map((m) => `${m.role === "user" ? "Utilisateur" : "KAEL"}: ${m.content.slice(0, 300)}`)
        .join("\n")
    }
  }

  const opener = await generateKAELOpener(dossier.name, projectMemory, previousSessionContext)

  const newSession = await prisma.kaelSession.create({
    data: {
      dossierId,
      labAtCreation: (dossier.labState as any)?.currentLab ?? "DISCOVERY",
      messages: [{
        id: randomUUID(),
        role: "kael",
        content: opener.message,
        choices: opener.choices ?? [],
        timestamp: new Date().toISOString(),
      }],
      status: "ACTIVE",
    },
  })

  return apiSuccess({ sessionId: newSession.id, isNew: true })
}
