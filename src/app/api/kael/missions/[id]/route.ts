import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const mission = await prisma.autonomousMission.findUnique({
    where: { id: params.id },
    include: { dossier: { select: { ownerId: true } } },
  })
  if (!mission) return apiError("Not found", 404)
  if (mission.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  return apiSuccess(mission)
}
