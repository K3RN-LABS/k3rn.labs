import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { z } from "zod"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({
    where: { id, ownerId: session.userId },
    include: {
      subFolders: true,
      labState: true,
      exportRecord: true,
      crowdfundingCampaign: true,
      scoreSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!dossier) return apiError("Dossier not found", 404)
  return apiSuccess(dossier)
}

const patchSchema = z.object({
  archived: z.boolean().optional(),
  macroState: z.string().optional(),
  name: z.string().min(1).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const result = await validateBody(patchSchema, req)
  if ("error" in result) return result.error

  const dossier = await prisma.dossier.findFirst({ where: { id, ownerId: session.userId } })
  if (!dossier) return apiError("Dossier not found", 404)

  const updated = await prisma.dossier.update({
    where: { id },
    data: result.data as Record<string, unknown>,
  })

  await createAuditLog({
    userId: session.userId,
    dossierId: id,
    action: result.data.archived ? "ARCHIVE" : "UPDATE",
    entity: "Dossier",
    entityId: id,
    metadata: result.data as Record<string, unknown>,
  })

  return apiSuccess(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({ where: { id, ownerId: session.userId } })
  if (!dossier) return apiError("Dossier not found", 404)

  await prisma.dossier.delete({ where: { id } })

  await createAuditLog({
    userId: session.userId,
    action: "DELETE",
    entity: "Dossier",
    entityId: id,
    metadata: {},
  })

  return apiSuccess({ success: true })
}
