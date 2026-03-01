import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { z } from "zod"

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  cardType: z.enum(["IDEA", "DECISION", "TASK", "ANALYSIS", "HYPOTHESIS", "PROBLEM", "VISION"]).optional(),
  poleCode: z.enum([
    "P01_STRATEGIE", "P02_MARKET", "P03_PRODUIT_TECH",
    "P04_FINANCE", "P05_MARKETING", "P06_LEGAL", "P07_TALENT_OPS",
  ]).optional(),
})

async function resolveCardAndVerify(id: string, userId: string) {
  const card = await db.card.findUnique({
    where: { id },
    include: {
      subFolder: { include: { dossier: true } },
      dossier: true,
    },
  })
  if (!card) return { card: null, error: apiError("Card not found", 404), dossierId: null }

  const ownerId = (card.subFolder as any)?.dossier?.ownerId ?? (card.dossier as any)?.ownerId
  const dossierId = (card as any).subFolderId
    ? (card.subFolder as any)?.dossierId
    : (card as any).dossierId
  if (ownerId !== userId) return { card: null, error: apiError("Forbidden", 403), dossierId: null }

  return { card, error: null, dossierId: dossierId as string | null }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const { card, error } = await resolveCardAndVerify(id, session.userId)
  if (error) return error

  const fullCard = await db.card.findUnique({
    where: { id },
    include: {
      transitionLogs: true,
      outgoingRelations: { include: { toCard: true } },
      incomingRelations: { include: { fromCard: true } },
    },
  })

  return apiSuccess(fullCard)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const { error, dossierId } = await resolveCardAndVerify(id, session.userId)
  if (error) return error

  const result = await validateBody(patchSchema, req)
  if ("error" in result) return result.error

  const updateData: Record<string, unknown> = {}
  if (result.data.title !== undefined) updateData.title = result.data.title
  if (result.data.content !== undefined) updateData.content = result.data.content
  if (result.data.cardType !== undefined) updateData.cardType = result.data.cardType
  if (result.data.poleCode !== undefined) updateData.poleCode = result.data.poleCode

  const updated = await db.card.update({ where: { id }, data: updateData })

  await createAuditLog({
    userId: session.userId,
    dossierId: dossierId ?? undefined,
    action: "UPDATE",
    entity: "Card",
    entityId: id,
    metadata: result.data as Record<string, unknown>,
  })

  return apiSuccess(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const { card, error, dossierId } = await resolveCardAndVerify(id, session.userId)
  if (error) return error

  if ((card as any).state !== "DRAFT") return apiError("Only DRAFT cards can be deleted", 422)

  await db.card.delete({ where: { id } })

  await createAuditLog({
    userId: session.userId,
    dossierId: dossierId ?? undefined,
    action: "DELETE",
    entity: "Card",
    entityId: id,
    metadata: {},
  })

  return apiSuccess({ success: true })
}
