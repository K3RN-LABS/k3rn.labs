import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const subFolder = await prisma.subFolder.findUnique({
    where: { id },
    include: {
      dossier: true,
      cards: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!subFolder) return apiError("SubFolder not found", 404)
  if (subFolder.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  return apiSuccess(subFolder)
}
