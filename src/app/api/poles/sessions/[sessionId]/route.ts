import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { buildProjectMemory } from "@/lib/project-memory"
import { invokeN8nPole } from "@/lib/n8n"
import { z } from "zod"
import { randomUUID } from "node:crypto"

const schema = z.object({
  userMessage: z.string().min(1).max(4000),
})

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const poleSession = await prisma.poleSession.findUnique({
    where: { id: params.sessionId },
    include: { pole: true, dossier: true },
  })
  if (!poleSession) return apiError("Session not found", 404)
  if (poleSession.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const messages = poleSession.messages as Array<Record<string, any>>
  const projectMemory = await buildProjectMemory(poleSession.dossierId)

  // Nettoyage de l'historique pour n8n (on ne garde que role et content)
  const cleanHistory = messages.map((m) => ({
    role: m.role === "manager" ? "assistant" : m.role,
    content: (m.content as string) ?? "",
  }))

  const n8nResult = await invokeN8nPole(
    {
      poleCode: poleSession.pole.code,
      managerName: poleSession.pole.managerName,
      systemPrompt: poleSession.pole.systemPrompt,
      userMessage: result.data.userMessage,
      history: cleanHistory,
      projectMemory,
      dossierId: poleSession.dossierId,
      labContext: poleSession.labAtCreation,
    },
    poleSession.pole.n8nWebhookUrl
  )

  const userMsg = {
    id: randomUUID(),
    role: "user",
    content: result.data.userMessage,
    timestamp: new Date().toISOString(),
  }

  const newMessages = [...messages, userMsg]

  // Persister la réponse si elle est disponible immédiatement (COMPLETED ou FALLBACK)
  if (n8nResult.messages && n8nResult.messages.length > 0) {
    n8nResult.messages.forEach(msg => {
      newMessages.push({
        id: randomUUID(),
        role: "manager",
        content: msg.content,
        timestamp: new Date().toISOString(),
      })
    })
  }

  const updated = await prisma.poleSession.update({
    where: { id: params.sessionId },
    data: {
      messages: newMessages,
      n8nExecutionId: n8nResult.executionId ?? poleSession.n8nExecutionId,
      n8nStatus: n8nResult.status,
    },
  })

  // Récupérer le dernier message du manager pour la réponse API
  const lastManagerMsg = [...newMessages].reverse().find((m) => m.role === "manager")

  return apiSuccess({
    session: updated,
    managerResponse: lastManagerMsg ?? null,
    n8nStatus: n8nResult.status,
    executionId: n8nResult.executionId,
  })
}

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const poleSession = await prisma.poleSession.findUnique({
    where: { id: params.sessionId },
    include: { pole: true, dossier: true },
  })
  if (!poleSession) return apiError("Not found", 404)
  if (poleSession.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  return apiSuccess(poleSession)
}
