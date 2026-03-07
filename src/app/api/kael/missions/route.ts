import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { env } from "@/lib/env"
import { broadcastToChannel } from "@/lib/realtime"
import { z } from "zod"
import { randomUUID } from "node:crypto"

const schema = z.object({
  dossierId: z.string().min(1),
  kaelSessionId: z.string().min(1),
  poleCode: z.string().min(1),
  managerName: z.string().min(1),
  objective: z.string().min(1),
  estimatedCost: z.number().int().min(1).max(5),
  briefFinal: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const { dossierId, kaelSessionId, poleCode, managerName, objective, estimatedCost, briefFinal } = result.data

  // Vérifier budget suffisant
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user || (user.missionBudget ?? 0) < estimatedCost) {
    return apiError(`Budget insuffisant. Cette mission coûte ${estimatedCost} missions.`, 403)
  }

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  // Récupérer le systemPrompt du pôle
  const pole = await prisma.pole.findFirst({ where: { code: poleCode as any } })
  if (!pole) return apiError("Pole not found", 404)

  // Transaction : créer la mission + débiter le budget
  const mission = await prisma.$transaction(async (tx: any) => {
    await tx.user.update({
      where: { id: session.userId },
      data: { missionBudget: { decrement: estimatedCost } },
    })

    const m = await tx.autonomousMission.create({
      data: {
        dossierId,
        kaelSessionId,
        poleCode,
        managerName,
        objective,
        estimatedCost,
        actualCost: estimatedCost,
        status: "PENDING",
      },
    })

    // Ajouter un message de confirmation dans la KaelSession
    const kaelSession = await tx.kaelSession.findUnique({ where: { id: kaelSessionId } })
    const messages = (kaelSession?.messages ?? []) as Array<Record<string, unknown>>
    messages.push({
      id: randomUUID(),
      role: "kael",
      content: `Mission lancée — **${managerName}** est en route. Je te tiendrai informé de sa progression.`,
      timestamp: new Date().toISOString(),
      missionId: m.id,
      isMissionStatus: true,
    })
    await tx.kaelSession.update({
      where: { id: kaelSessionId },
      data: { messages },
    })

    return m
  })

  // Broadcast Realtime : mission créée
  broadcastToChannel(dossierId, "mission", {
    type: "mission_created",
    missionId: mission.id,
    managerName,
    status: "PENDING",
  }).catch(() => undefined)

  // Fire n8n async — ne bloque pas la réponse
  const n8nWebhookUrl = pole.n8nWebhookUrl
    ? `${pole.n8nWebhookUrl.replace("k3rn-pole-router", "k3rn-expert-mission")}`
    : `${env.N8N_BASE_URL}/webhook/k3rn-expert-mission`

  fetch(n8nWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      missionId: mission.id,
      dossierId,
      kaelSessionId,
      poleCode,
      managerName,
      systemPrompt: pole.systemPrompt,
      objective: briefFinal,
      appCallbackUrl: env.NEXT_PUBLIC_APP_URL,
    }),
  }).catch(() => {
    // Si n8n ne répond pas, on marque FAILED via un job séparé
    prisma.autonomousMission.update({
      where: { id: mission.id },
      data: { status: "FAILED" },
    }).catch(() => undefined)
  })

  return apiSuccess({ mission, status: "RUNNING" })
}

export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const dossierId = searchParams.get("dossierId")
  if (!dossierId) return apiError("dossierId required", 400)

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const missions = await prisma.autonomousMission.findMany({
    where: { dossierId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return apiSuccess(missions)
}
