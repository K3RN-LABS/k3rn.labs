import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { checkRateLimit } from "@/lib/rate-limit"
import { invokeExpertChat } from "@/lib/claude"
import type { ChatMessage } from "@/lib/claude"
import { randomUUID } from "crypto"
import { z } from "zod"
import { queueCardIngestion } from "@/lib/card-ingestion"

const schema = z.object({
  message: z.string().min(1).max(4000),
  attachments: z
    .array(z.object({ name: z.string(), type: z.string(), size: z.number().optional() }))
    .optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const rl = await checkRateLimit("experts", session.userId)
  if (!rl.success) return apiError("Rate limit exceeded", 429)

  const { sessionId } = await params
  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const expertSession = await prisma.expertSession.findUnique({
    where: { id: sessionId },
    include: {
      expert: true,
      dossier: { include: { subFolders: { include: { cards: { where: { state: "VALIDATED" } } } } } },
    },
  })
  if (!expertSession) return apiError("Session not found", 404)
  if (expertSession.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const contextCards = expertSession.dossier.subFolders.flatMap((sf: any) =>
    sf.cards.map((c: any) => ({ type: c.type, title: c.title, content: c.content }))
  )

  const history = (expertSession.messages ?? []) as ChatMessage[]

  const userMsg: ChatMessage = {
    id: randomUUID(),
    role: "user",
    content: result.data.message,
    timestamp: new Date().toISOString(),
    attachments: result.data.attachments,
  }

  const aiResponse = await invokeExpertChat(
    expertSession.expert.systemPrompt,
    history,
    contextCards,
    result.data.message,
    expertSession.expert.name
  )

  const expertMsg: ChatMessage = {
    id: randomUUID(),
    role: "expert",
    content: aiResponse.message,
    timestamp: new Date().toISOString(),
    choices: aiResponse.choices,
    proposedCard: aiResponse.proposedCard,
    confidence: aiResponse.confidence,
  }

  // Fire-and-forget ingestion
  queueCardIngestion({
    dossierId: expertSession.dossier.id,
    messageId: userMsg.id,
    source: "USER",
    actorType: "EXPERT",
    actorId: expertSession.expert.id,
    userId: session.userId,
    content: userMsg.content
  });

  queueCardIngestion({
    dossierId: expertSession.dossier.id,
    messageId: expertMsg.id,
    source: "AI",
    actorType: "EXPERT",
    actorId: expertSession.expert.id,
    userId: session.userId,
    content: expertMsg.content
  });

  const updatedMessages = [...history, userMsg, expertMsg]

  const updated = await prisma.expertSession.update({
    where: { id: sessionId },
    data: {
      messages: updatedMessages as any,
      status: aiResponse.proposedCard ? "WAITING_VALIDATION" : "PENDING",
      proposedCard: aiResponse.proposedCard as any,
    },
  })

  return apiSuccess({ session: updated, response: aiResponse, messages: updatedMessages })
}
