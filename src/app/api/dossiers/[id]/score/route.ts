import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { computeAndPersistScore } from "@/lib/score-engine"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({ where: { id, ownerId: session.userId } })
  if (!dossier) return apiError("Dossier not found", 404)

  const latest = await prisma.scoreSnapshot.findFirst({
    where: { dossierId: id },
    orderBy: { createdAt: "desc" },
  })

  const history = await prisma.scoreSnapshot.findMany({
    where: { dossierId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return apiSuccess({ latest, history })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({ where: { id, ownerId: session.userId } })
  if (!dossier) return apiError("Dossier not found", 404)

  const score = await computeAndPersistScore(id)
  return apiSuccess(score)
}
