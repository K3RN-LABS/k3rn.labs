import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { buildProjectMemory } from "@/lib/project-memory"
import { invokeExpertDirect } from "@/lib/claude"
import { z } from "zod"
import { randomUUID } from "node:crypto"

const schema = z.object({
  dossierId: z.string().min(1),
  kaelSessionId: z.string().min(1),
  poleCode: z.string().min(1),
  managerName: z.string().min(1),
  objective: z.string().min(1),
  briefFinal: z.string().min(1),
  estimatedCost: z.number().int().min(1).max(5),
})

/**
 * POST /api/kael/missions/brief
 *
 * Crée une PoleSession avec le brief comme premier message utilisateur,
 * appelle l'expert pour générer son plan (phase gratuite — sans débit budget),
 * persiste la réponse avec isMissionPlan: true,
 * et crée un AutonomousMission avec status BRIEFING.
 *
 * NE DÉBITE PAS le budget — c'est /confirm qui débite.
 */
export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const { dossierId, kaelSessionId, poleCode, managerName, objective, briefFinal, estimatedCost } = result.data

  // Verify ownership
  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  // Verify kael session
  const kaelSession = await prisma.kaelSession.findUnique({ where: { id: kaelSessionId } })
  if (!kaelSession || kaelSession.dossierId !== dossierId) return apiError("Session not found", 404)

  // Find the pole
  const pole = await prisma.pole.findFirst({ where: { code: poleCode as any } })
  if (!pole) return apiError("Pole not found", 404)

  // Get current lab context
  const labState = await prisma.labState.findUnique({ where: { dossierId } })
  const labContext = labState?.currentLab ?? "DISCOVERY"

  // Build project memory for expert context
  const projectMemory = await buildProjectMemory(dossierId)

  // 1. Create PoleSession with brief as first user message
  const userMsgId = randomUUID()
  const initialMessages = [
    {
      id: userMsgId,
      role: "user",
      content: briefFinal,
      timestamp: new Date().toISOString(),
    },
  ]

  const poleSession = await prisma.poleSession.create({
    data: {
      poleId: pole.id,
      dossierId,
      missionId: null,
      labAtCreation: labContext as any,
      messages: initialMessages,
      status: "ACTIVE",
    },
  })

  // 2. Call the expert for their plan (free phase — no budget debit)
  const planSystemPrompt = `${pole.systemPrompt}

Tu reçois un brief de mission de KAEL (Chief of Staff). Réponds avec :
1. Ton PLAN DE MISSION détaillé — étapes, méthode, sources que tu vas utiliser, livrables attendus
2. Ce que tu vas produire exactement
3. Le délai estimé ou la complexité

Structure ta réponse clairement. Sois précis sur ta méthode — l'utilisateur doit comprendre ce que tu vas faire avant de confirmer.`

  const planText = await invokeExpertDirect({
    managerName,
    systemPrompt: planSystemPrompt,
    userMessage: briefFinal,
    history: [],
    projectMemory,
    labContext,
  })

  // 3. Add expert plan message with isMissionPlan: true
  const planMsgId = randomUUID()
  const updatedMessages = [
    ...initialMessages,
    {
      id: planMsgId,
      role: "manager",
      content: planText,
      timestamp: new Date().toISOString(),
      isMissionPlan: true,
      estimatedCost,
    },
  ]

  await prisma.poleSession.update({
    where: { id: poleSession.id },
    data: { messages: updatedMessages },
  })

  // 4. Create AutonomousMission with BRIEFING status (no budget debit yet)
  const mission = await prisma.autonomousMission.create({
    data: {
      dossierId,
      kaelSessionId,
      poleSessionId: poleSession.id,
      poleCode,
      managerName,
      objective,
      estimatedCost,
      actualCost: 0,
      status: "BRIEFING",
    },
  })

  // 5. Mark the pole session unread (badge in Dock)
  // Store missionId in pole session for reference
  await prisma.poleSession.update({
    where: { id: poleSession.id },
    data: { missionId: null }, // mission tracked via AutonomousMission.poleSessionId
  })

  return apiSuccess({
    poleSessionId: poleSession.id,
    poleId: pole.id,
    missionId: mission.id,
    managerName,
    poleCode,
  })
}
