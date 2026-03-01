import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { getSignedExportUrl } from "@/lib/supabase-storage"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({ where: { id, ownerId: session.userId } })
  if (!dossier) return apiError("Dossier not found", 404)

  const exportRecord = await prisma.exportRecord.findUnique({ where: { dossierId: id } })

  if (!exportRecord) {
    const latestScore = await prisma.scoreSnapshot.findFirst({
      where: { dossierId: id },
      orderBy: { createdAt: "desc" },
    })
    const eligible = (latestScore?.globalScore ?? 0) > 90
    return apiSuccess({ state: eligible ? "ELIGIBLE" : "LOCKED", storageUrl: null })
  }

  return apiSuccess(exportRecord)
}
