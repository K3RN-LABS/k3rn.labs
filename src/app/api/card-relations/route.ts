import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { z } from "zod"

const createSchema = z.object({
  fromCardId: z.string().min(1),
  toCardId: z.string().min(1),
  type: z.enum(["DERIVED_FROM", "SUPPORTS", "IMPLEMENTS", "REFINES"]),
})

async function getCardOwner(cardId: string): Promise<string | null> {
  const card = await db.card.findUnique({
    where: { id: cardId },
    include: {
      subFolder: { include: { dossier: true } },
      dossier: true,
    },
  })
  if (!card) return null
  return (card.subFolder as any)?.dossier?.ownerId ?? (card.dossier as any)?.ownerId ?? null
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(createSchema, req)
  if ("error" in result) return result.error

  const { fromCardId, toCardId, type } = result.data
  if (fromCardId === toCardId) return apiError("Cannot relate a card to itself", 422)

  const [fromOwner, toOwner] = await Promise.all([
    getCardOwner(fromCardId),
    getCardOwner(toCardId),
  ])

  if (!fromOwner) return apiError("fromCard not found", 404)
  if (!toOwner) return apiError("toCard not found", 404)
  if (fromOwner !== session.userId || toOwner !== session.userId) return apiError("Forbidden", 403)

  const relation = await db.cardRelation.create({
    data: { fromCardId, toCardId, type },
  })

  return apiSuccess(relation, 201)
}
