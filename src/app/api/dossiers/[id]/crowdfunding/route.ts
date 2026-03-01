import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({ where: { id, ownerId: session.userId } })
  if (!dossier) return apiError("Dossier not found", 404)

  const campaign = await prisma.crowdfundingCampaign.findUnique({
    where: { dossierId: id },
    include: { investments: { orderBy: { createdAt: "desc" } } },
  })

  if (!campaign) {
    const latestScore = await prisma.scoreSnapshot.findFirst({
      where: { dossierId: id },
      orderBy: { createdAt: "desc" },
    })
    return apiSuccess({ state: (latestScore?.globalScore ?? 0) > 60 ? "ELIGIBLE" : "LOCKED" })
  }

  return apiSuccess(campaign)
}
