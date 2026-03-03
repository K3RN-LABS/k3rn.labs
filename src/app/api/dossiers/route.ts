import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { checkRateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const createDossierSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const showArchived = new URL(req.url).searchParams.get("archived") === "true"
  const dossiers = await prisma.dossier.findMany({
    where: { ownerId: session.userId, archived: showArchived },
    include: {
      labState: true,
      _count: { select: { subFolders: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return apiSuccess(dossiers)
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const rl = await checkRateLimit("mutations", session.userId)
  if (!rl.success) return apiError("Rate limit exceeded", 429)

  const result = await validateBody(createDossierSchema, req)
  if ("error" in result) return result.error

  // Vérifier le budget de missions
  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || (user.missionBudget ?? 0) <= 0) {
    return apiError("Votre budget de missions freemium (30) est épuisé. Veuillez passer à une offre supérieure.", 403)
  }

  const dossier = await prisma.$transaction(async (tx) => {
    // 1. Débiter le budget
    await tx.user.update({
      where: { id: session.userId },
      data: { missionBudget: { decrement: 1 } }
    })

    // 2. Créer le dossier
    const d = await tx.dossier.create({
      data: {
        name: result.data.name,
        ownerId: session.userId,
        macroState: "WORKSPACE_IDLE",
      },
    })

    await tx.subFolder.createMany({
      data: [
        { dossierId: d.id, type: "PRODUIT" },
        { dossierId: d.id, type: "MARCHE" },
        { dossierId: d.id, type: "TECHNOLOGIE" },
        { dossierId: d.id, type: "BUSINESS" },
      ],
    })

    await tx.labState.create({
      data: {
        dossierId: d.id,
        currentLab: "DISCOVERY",
        transitionAllowed: false,
      },
    })

    return d
  })

  await createAuditLog({
    userId: session.userId,
    dossierId: dossier.id,
    action: "CREATE",
    entity: "Dossier",
    entityId: dossier.id,
    metadata: { name: dossier.name },
  })

  return apiSuccess(dossier, 201)
}
