import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const card = await db.card.findUnique({
    where: { id },
    include: {
      subFolder: { include: { dossier: true } },
      dossier: true,
    },
  })
  if (!card) return apiError("Card not found", 404)

  const ownerId = (card.subFolder as any)?.dossier?.ownerId ?? (card.dossier as any)?.ownerId
  if (ownerId !== session.userId) return apiError("Forbidden", 403)

  const [outgoing, incoming] = await Promise.all([
    db.cardRelation.findMany({
      where: { fromCardId: id },
      include: { toCard: true },
    }),
    db.cardRelation.findMany({
      where: { toCardId: id },
      include: { fromCard: true },
    }),
  ])

  return apiSuccess({ outgoing, incoming })
}
