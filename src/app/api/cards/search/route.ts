import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { apiError, apiSuccess } from "@/lib/validate"

const CARD_COLUMNS = "id,title,content,cardType,type,state,source,poleCode,lab,dossierId,subFolderId,createdAt,updatedAt"

export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const dossierId = searchParams.get("dossierId")
  const q = searchParams.get("q")?.trim()
  const cardType = searchParams.get("type")
  const state = searchParams.get("state")
  const poleCode = searchParams.get("poleCode")
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)

  if (!dossierId) return apiError("dossierId is required", 400)

  const dossier = await db.dossier.findFirst({
    where: { id: dossierId, ownerId: session.userId },
  })
  if (!dossier) return apiError("Dossier not found", 404)

  // Get subFolder IDs for this dossier (for OR filter)
  const subFolders = await db.subFolder.findMany({ where: { dossierId } })
  const subFolderIds = (subFolders as Array<{ id: string }>).map((sf) => sf.id)

  const orFilter = [
    `dossierId.eq.${dossierId}`,
    subFolderIds.length > 0 ? `subFolderId.in.(${subFolderIds.join(",")})` : null,
  ]
    .filter(Boolean)
    .join(",")

  let queryBuilder = supabaseAdmin
    .from("Card")
    .select(CARD_COLUMNS)
    .or(orFilter)

  if (cardType) queryBuilder = queryBuilder.eq("cardType", cardType)
  if (state) queryBuilder = queryBuilder.eq("state", state)
  if (poleCode) queryBuilder = queryBuilder.eq("poleCode", poleCode)

  if (q && q.length >= 2) {
    // GIN-backed full-text search
    queryBuilder = queryBuilder.textSearch("title", q, { type: "websearch", config: "english" })
  }

  queryBuilder = queryBuilder
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error } = await queryBuilder
  if (error) return apiError("Search failed", 500)

  return apiSuccess({ cards: data ?? [], q: q ?? null, total: (data ?? []).length })
}
