import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { checkRateLimit } from "@/lib/rate-limit"
import { createInitialState } from "@/lib/onboarding-state"
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

  const dossier = await prisma.$transaction(async (tx) => {
    // Créer le dossier avec l'état initial d'onboarding déjà persisté
    // La création de dossier est gratuite (0 mission consommée)
    const d = await tx.dossier.create({
      data: {
        name: result.data.name,
        ownerId: session.userId,
        macroState: "WORKSPACE_IDLE",
        onboardingState: createInitialState() as unknown as Record<string, unknown>,
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
