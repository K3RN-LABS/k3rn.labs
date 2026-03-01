import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { z } from "zod"

const createSchema = z.object({
  dossierId: z.string().min(1),
  title: z.string().min(1).max(500),
  content: z.record(z.string(), z.unknown()).optional().default({}),
  cardType: z.enum(["IDEA", "DECISION", "TASK", "ANALYSIS", "HYPOTHESIS", "PROBLEM", "VISION"]).optional(),
  poleCode: z.enum([
    "P01_STRATEGIE", "P02_MARKET", "P03_PRODUIT_TECH",
    "P04_FINANCE", "P05_MARKETING", "P06_LEGAL", "P07_TALENT_OPS",
  ]).optional(),
  source: z.enum(["USER", "EXPERT", "SYSTEM"]).optional().default("USER"),
  subFolderId: z.string().optional(),
  lab: z.enum([
    "DISCOVERY", "STRUCTURATION", "VALIDATION_MARCHE",
    "DESIGN_PRODUIT", "ARCHITECTURE_TECHNIQUE", "BUSINESS_FINANCE",
  ]).optional(),
})

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(createSchema, req)
  if ("error" in result) return result.error

  const { dossierId, title, content, cardType, poleCode, source, subFolderId, lab } = result.data

  const dossier = await db.dossier.findFirst({
    where: { id: dossierId, ownerId: session.userId },
  })
  if (!dossier) return apiError("Dossier not found", 404)

  if (subFolderId) {
    const sf = await db.subFolder.findFirst({ where: { id: subFolderId, dossierId } })
    if (!sf) return apiError("SubFolder not found or doesn't belong to this dossier", 404)
  }

  const card = await db.card.create({
    data: {
      dossierId,
      title,
      content,
      cardType: cardType ?? null,
      source: source ?? "USER",
      poleCode: poleCode ?? null,
      subFolderId: subFolderId ?? null,
      lab: lab ?? null,
      state: "DRAFT",
    },
  })

  await createAuditLog({
    userId: session.userId,
    dossierId,
    action: "CREATE",
    entity: "Card",
    entityId: card.id,
    metadata: { cardType, poleCode, source },
  })

  return apiSuccess(card, 201)
}

export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const dossierId = searchParams.get("dossierId")
  if (!dossierId) return apiError("dossierId is required", 400)

  const dossier = await db.dossier.findFirst({
    where: { id: dossierId, ownerId: session.userId },
  })
  if (!dossier) return apiError("Dossier not found", 404)

  const cards = await db.card.findMany({
    where: { dossierId },
    orderBy: { createdAt: "desc" },
    include: {
      outgoingRelations: true,
      incomingRelations: true,
    },
  })

  return apiSuccess(cards)
}
