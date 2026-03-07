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

  if (!activeSessionId) {
    const opener = await generateKAELOpener(dossier.name, projectMemory)
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
    projectMemory
  )

  // Save the new interaction to the session
  await prisma.kaelSession.update({
    where: { id: activeSessionId },
    data: {
      messages: [
        ...history,
        { id: randomUUID(), role: "user", content: message, timestamp: new Date().toISOString() },
        { id: randomUUID(), role: "kael", content: kaelResponse.message ?? "Réponse.", timestamp: new Date().toISOString() }
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
