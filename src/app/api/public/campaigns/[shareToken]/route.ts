import { NextRequest } from "next/server"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(req: NextRequest, { params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params

  const campaign = await prisma.crowdfundingCampaign.findUnique({
    where: { shareToken },
    include: { dossier: { select: { name: true } } },
  })

  if (!campaign) return apiError("Campaign not found", 404)

  return apiSuccess({
    id: campaign.id,
    state: campaign.state,
    goal: campaign.goal,
    raised: campaign.raised,
    dossierName: campaign.dossier.name,
    shareToken: campaign.shareToken,
    createdAt: campaign.createdAt,
  })
}
