import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const relation = await db.cardRelation.findUnique({
    where: { id },
    include: {
      fromCard: {
        include: {
          subFolder: { include: { dossier: true } },
          dossier: true,
        },
      },
    },
  })
  if (!relation) return apiError("Relation not found", 404)

  const fromCard = (relation as any).fromCard
  const ownerId = fromCard?.subFolder?.dossier?.ownerId ?? fromCard?.dossier?.ownerId
  if (ownerId !== session.userId) return apiError("Forbidden", 403)

  await db.cardRelation.delete({ where: { id } })

  return apiSuccess({ success: true })
}
