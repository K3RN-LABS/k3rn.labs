import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { invokeKAEL, generateKAELOpener } from "@/lib/claude"
import { buildProjectMemory } from "@/lib/project-memory"
import { z } from "zod"
import { randomUUID } from "node:crypto"

const schema = z.object({
  dossierId: z.string().min(1),
  message: z.string().min(1).max(4000),
  history: z.array(z.object({ role: z.string(), content: z.string() })).default([]),
  sessionId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error
  const { dossierId, message, history, sessionId } = result.data

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  let activeSessionId = sessionId

  // First time starting a session or no session id provided
  if (activeSessionId) {
    const exists = await prisma.kaelSession.findUnique({ where: { id: activeSessionId } })
    if (!exists) activeSessionId = undefined
  }

  const projectMemory = await buildProjectMemory(dossierId)

  // Construire le contexte des sessions précédentes (continuité)
  let previousSessionContext: string | undefined
  const previousSession = activeSessionId
    ? await prisma.kaelSession.findFirst({
        where: { dossierId, id: { not: activeSessionId } },
        orderBy: { updatedAt: "desc" },
      })
    : await prisma.kaelSession.findFirst({
        where: { dossierId },
        orderBy: { updatedAt: "desc" },
      })

  if (previousSession) {
    const prevMessages = (previousSession.messages ?? []) as Array<{ role: string; content: string }>
    const relevantPrev = prevMessages
      .filter((m) => m.role === "user" || m.role === "kael")
      .slice(-10)
    if (relevantPrev.length > 0) {
      previousSessionContext = relevantPrev
        .map((m) => `${m.role === "user" ? "Utilisateur" : "KAEL"}: ${m.content.slice(0, 300)}`)
        .join("\n")
    }
  }

  if (!activeSessionId) {
    const opener = await generateKAELOpener(dossier.name, projectMemory, previousSessionContext)
    const newSession = await prisma.kaelSession.create({
      data: {
        dossierId,
        labAtCreation: (dossier.labState as any)?.currentLab ?? "DISCOVERY",
        messages: [{ role: "kael", content: opener.message, choices: opener.choices ?? [], id: randomUUID(), timestamp: new Date().toISOString() }],
        status: "ACTIVE"
      }
    })
    activeSessionId = newSession.id
  }

  const kaelResponse = await invokeKAEL(
    dossier.name,
    history.map((m) => ({ ...m, id: randomUUID(), timestamp: new Date().toISOString() }) as any),
    message,
    projectMemory,
    previousSessionContext
  )

  // Append to DB messages — never trust client history to avoid duplication
  const currentSession = await prisma.kaelSession.findUnique({ where: { id: activeSessionId! } })
  const currentMessages = (currentSession?.messages ?? []) as Array<Record<string, unknown>>

  await prisma.kaelSession.update({
    where: { id: activeSessionId },
    data: {
      messages: [
        ...currentMessages,
        { id: randomUUID(), role: "user", content: message, timestamp: new Date().toISOString() },
        {
          id: randomUUID(), role: "kael", content: kaelResponse.message ?? "Réponse.", timestamp: new Date().toISOString(),
          ...(kaelResponse.missionProposal ? { missionProposal: { ...(kaelResponse.missionProposal as any), objective: (kaelResponse.missionProposal as any).initialObjective ?? (kaelResponse.missionProposal as any).objective ?? "" } } : {}),
          ...(kaelResponse.choices?.length ? { choices: kaelResponse.choices } : {}),
          ...(kaelResponse.routedPole ? { routedPole: kaelResponse.routedPole, routedManager: kaelResponse.routedManager ?? undefined, routingReason: kaelResponse.routingReason ?? undefined } : {})
        }
      ]
    }
  })

  // Return session metadata so the frontend can keep track of the session ID
  const responsePayload = { ...kaelResponse, sessionId: activeSessionId }

  if (kaelResponse.routedPole) {
    const pole = await prisma.pole.findFirst({
      where: { code: kaelResponse.routedPole as any },
    })
    return apiSuccess({ ...responsePayload, routedPoleData: pole })
  }

  return apiSuccess(responsePayload)
}
