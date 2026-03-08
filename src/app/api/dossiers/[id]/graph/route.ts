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

  // Fetch card relations
  const cardIds = cards.map((c: { id: string }) => c.id)
  let relations: unknown[] = []
  if (cardIds.length > 0) {
    const { data: allRelations } = await supabaseAdmin
      .from("CardRelation")
      .select("id,fromCardId,toCardId,type,createdAt")
      .or(`fromCardId.in.(${cardIds.join(",")}),toCardId.in.(${cardIds.join(",")})`)
    relations = (allRelations ?? []).filter(
      (r: { fromCardId: string; toCardId: string }) =>
        cardIds.includes(r.fromCardId) && cardIds.includes(r.toCardId)
    )
  }

  // Fetch poles (hubs) — use supabaseAdmin directly (no dossierId FK)
  const { data: polesData } = await supabaseAdmin
    .from("Pole")
    .select("id,code,managerName,managerSlug")
    .order("code", { ascending: true })
  const poles = polesData ?? []

  // Fetch expert documents
  const { data: documents } = await supabaseAdmin
    .from("ExpertDocument")
    .select("id,type,title,producedBy,poleCode,sourceKind,sourceId,content,metadata,createdAt,validatedAt")
    .eq("dossierId", dossierId)
    .order("createdAt", { ascending: false })
    .limit(100)

  // Fetch tasks (non-cancelled)
  const { data: tasks } = await supabaseAdmin
    .from("Task")
    .select("id,title,description,status,origin,assignedPole,relatedDocuments,relatedCards,createdAt")
    .eq("dossierId", dossierId)
    .neq("status", "CANCELLED")
    .order("createdAt", { ascending: false })
    .limit(100)

  return apiSuccess({
    cards,
    relations,
    poles: poles ?? [],
    documents: documents ?? [],
    tasks: tasks ?? [],
  })
}
