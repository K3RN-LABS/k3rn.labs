import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { checkRateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const createCardSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const subFolder = await prisma.subFolder.findUnique({
    where: { id },
    include: { dossier: { include: { labState: true } } },
  })
  if (!subFolder) return apiError("SubFolder not found", 404)
  if (subFolder.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const currentLab = subFolder.dossier.labState?.currentLab
  const cards = await prisma.card.findMany({
    where: { subFolderId: id, ...(currentLab ? { lab: currentLab } : {}) },
    orderBy: { createdAt: "desc" },
  })

  return apiSuccess(cards)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const rl = await checkRateLimit("mutations", session.userId)
  if (!rl.success) return apiError("Rate limit exceeded", 429)

  const { id } = await params
  const subFolder = await prisma.subFolder.findUnique({
    where: { id },
    include: { dossier: { include: { labState: true } } },
  })
  if (!subFolder) return apiError("SubFolder not found", 404)
  if (subFolder.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const currentLab = subFolder.dossier.labState?.currentLab
  if (!currentLab) return apiError("No active LAB found", 422)

  const result = await validateBody(createCardSchema, req)
  if ("error" in result) return result.error

  const card = await prisma.card.create({
    data: {
      subFolderId: id,
      lab: currentLab,
      type: result.data.type,
      title: result.data.title,
      content: result.data.content,
      state: "DRAFT",
    },
  })

  await createAuditLog({
    userId: session.userId,
    dossierId: subFolder.dossierId,
    action: "CREATE",
    entity: "Card",
    entityId: card.id,
    metadata: { type: card.type, lab: currentLab },
  })

  return apiSuccess(card, 201)
}
