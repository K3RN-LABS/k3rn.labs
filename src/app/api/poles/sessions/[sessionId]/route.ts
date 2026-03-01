import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { buildProjectMemory } from "@/lib/project-memory"
import { invokeN8nPole } from "@/lib/n8n"
import { z } from "zod"

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

  const messages = poleSession.messages as Array<Record<string, unknown>>
  const projectMemory = await buildProjectMemory(poleSession.dossierId)

  const n8nResult = await invokeN8nPole(
    {
      poleCode: poleSession.pole.code,
      managerName: poleSession.pole.managerName,
      systemPrompt: poleSession.pole.systemPrompt,
      userMessage: result.data.userMessage,
      projectMemory,
      dossierId: poleSession.dossierId,
      labContext: poleSession.labAtCreation,
    },
    poleSession.pole.n8nWebhookUrl
  )

  const userMsg = {
    id: crypto.randomUUID(),
    role: "user",
    content: result.data.userMessage,
    timestamp: new Date().toISOString(),
  }

  const newMessages = [...messages, userMsg]

  if (n8nResult.status === "FALLBACK" && n8nResult.messages[0]) {
    newMessages.push({
      id: crypto.randomUUID(),
      role: "manager",
      content: n8nResult.messages[0].content,
      timestamp: new Date().toISOString(),
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
