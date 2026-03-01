import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id: dossierId } = await params

  const dossier = await db.dossier.findFirst({
    where: { id: dossierId, ownerId: session.userId },
  })
  if (!dossier) return apiError("Dossier not found", 404)

  // Get all subFolder IDs for this dossier
  const subFolders = await db.subFolder.findMany({ where: { dossierId } })
  const subFolderIds = (subFolders as Array<{ id: string }>).map((sf) => sf.id)

  // Fetch all cards: direct dossierId + subFolder-linked cards
  const { data: allCards } = await supabaseAdmin
    .from("Card")
    .select("id,title,content,cardType,type,state,source,poleCode,lab,dossierId,subFolderId,createdAt,updatedAt")
    .or(
      [
        `dossierId.eq.${dossierId}`,
        subFolderIds.length > 0 ? `subFolderId.in.(${subFolderIds.join(",")})` : null,
      ]
        .filter(Boolean)
        .join(",")
    )
    .order("createdAt", { ascending: true })

  const cards = allCards ?? []

  if (cards.length === 0) {
    return apiSuccess({ cards: [], relations: [] })
  }

  // Collect all card IDs
  const cardIds = cards.map((c: { id: string }) => c.id)

  // Fetch all relations where either fromCard or toCard is in our set
  const { data: allRelations } = await supabaseAdmin
    .from("CardRelation")
    .select("id,fromCardId,toCardId,type,createdAt")
    .or(`fromCardId.in.(${cardIds.join(",")}),toCardId.in.(${cardIds.join(",")})`)

  const relations = (allRelations ?? []).filter(
    (r: { fromCardId: string; toCardId: string }) =>
      cardIds.includes(r.fromCardId) && cardIds.includes(r.toCardId)
  )

  return apiSuccess({ cards, relations })
}
