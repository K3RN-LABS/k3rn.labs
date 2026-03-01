import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { campaignId } = await params
  const campaign = await prisma.crowdfundingCampaign.findUnique({
    where: { id: campaignId },
    include: { dossier: true },
  })
  if (!campaign) return apiError("Campaign not found", 404)
  if (campaign.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)
  if (campaign.state !== "ACTIVE") return apiError("Campaign is not active", 422)

  const updated = await prisma.crowdfundingCampaign.update({
    where: { id: campaignId },
    data: { state: "CLOSED", closedAt: new Date() },
  })

  await createAuditLog({
    userId: session.userId,
    dossierId: campaign.dossierId,
    action: "CROWDFUNDING_CLOSED",
    entity: "CrowdfundingCampaign",
    entityId: campaignId,
    metadata: { raised: campaign.raised, goal: campaign.goal },
  })

  return apiSuccess(updated)
}
