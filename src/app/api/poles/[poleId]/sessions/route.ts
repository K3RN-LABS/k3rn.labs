import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { buildProjectMemory } from "@/lib/project-memory"
import { invokeN8nPole } from "@/lib/n8n"
import { createAuditLog } from "@/lib/audit"
import { z } from "zod"
import { randomUUID } from "node:crypto"

const schema = z.object({
  dossierId: z.string().min(1),
  userMessage: z.string().min(1).max(4000),
  currentLab: z.string().default("DISCOVERY"),
})

export async function POST(req: NextRequest, { params }: { params: { poleId: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error
  const { dossierId, userMessage, currentLab } = result.data

  const pole = await prisma.pole.findUnique({ where: { id: params.poleId } })
  if (!pole) return apiError("Pole not found", 404)

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  // Vérifier et débiter le budget de missions
  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || (user.missionBudget ?? 0) <= 0) {
    return apiError("Votre budget de missions freemium (30) est épuisé.", 403)
  }

  const projectMemory = await buildProjectMemory(dossierId)

  const n8nResult = await invokeN8nPole(
    {
      poleCode: pole.code,
      managerName: pole.managerName,
      systemPrompt: pole.systemPrompt,
      userMessage,
      projectMemory,
      dossierId,
      labContext: currentLab,
    },
    pole.n8nWebhookUrl
  )

  const initialManagerMessage = {
    id: randomUUID(),
    role: "manager",
    content:
      n8nResult.status === "FALLBACK" && n8nResult.messages[0]
        ? n8nResult.messages[0].content
        : `Bonjour ! Je suis **${pole.managerName}**, ${getPoleRole(pole.code)}. ${getManagerGreeting(pole.managerName)}`,
    timestamp: new Date().toISOString(),
    isManager: true,
  }

  const userMsgObj = {
    id: randomUUID(),
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  }

  const poleSession = await prisma.$transaction(async (tx) => {
    // 1. Débiter le budget
    await tx.user.update({
      where: { id: session.userId },
      data: { missionBudget: { decrement: 1 } }
    })

    // 2. Créer la session
    return await tx.poleSession.create({
      data: {
        poleId: params.poleId,
        dossierId,
        labAtCreation: currentLab as any,
        messages: [userMsgObj, initialManagerMessage],
        n8nExecutionId: n8nResult.executionId,
        n8nStatus: n8nResult.status,
        status: "ACTIVE",
      },
    })
  })

  await createAuditLog({
    userId: session.userId,
    action: "POLE_SESSION_CREATED",
    entity: "PoleSession",
    entityId: poleSession.id,
  })

  return apiSuccess({ session: poleSession, pole })
}

function getPoleRole(code: string): string {
  const roles: Record<string, string> = {
    P01_STRATEGIE: "Directeur Stratégie & Innovation",
    P02_MARKET: "Directrice Market & Intelligence",
    P03_PRODUIT_TECH: "Architecte Produit & Tech",
    P04_FINANCE: "Directrice Financière",
    P05_MARKETING: "Chief Marketing Officer",
    P06_LEGAL: "Conseiller Juridique",
    P07_TALENT_OPS: "Directrice des Opérations",
  }
  return roles[code] ?? code
}

function getManagerGreeting(name: string): string {
  const greetings: Record<string, string> = {
    AXEL: "Dis-moi quelle est l'idée ou le défi stratégique sur lequel tu veux travailler.",
    MAYA: "Quel marché ou secteur veux-tu analyser en priorité ?",
    KAI: "Décris-moi ce que tu veux construire — fonctionnalités, contraintes techniques, MVP visé.",
    ELENA: "Parle-moi de ton modèle économique ou du projet à modéliser financièrement.",
    ZARA: "Quel est le message, la marque ou la stratégie marketing sur laquelle on travaille ?",
    MARCUS: "Quel risque légal ou question de conformité veux-tu traiter ?",
    NOVA: "Quels sont les besoins en ressources, coordination ou suivi opérationnel ?",
  }
  return greetings[name] ?? "Comment puis-je t'aider ?"
}
