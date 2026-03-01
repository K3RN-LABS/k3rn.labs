import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { createStripeProduct, isStripeConfigured } from "@/lib/stripe"
import { z } from "zod"

const schema = z.object({
  goal: z.number().positive(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({ where: { id, ownerId: session.userId } })
  if (!dossier) return apiError("Dossier not found", 404)

  const latestScore = await prisma.scoreSnapshot.findFirst({
    where: { dossierId: id },
    orderBy: { createdAt: "desc" },
  })
  if ((latestScore?.globalScore ?? 0) <= 60) {
    return apiError("Crowdfunding requires global score > 60", 403)
  }

  const existing = await prisma.crowdfundingCampaign.findUnique({ where: { dossierId: id } })
  if (existing && existing.state !== "LOCKED") {
    return apiError("Campaign already exists", 422)
  }

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const stripeProductId = isStripeConfigured()
    ? await createStripeProduct(dossier.name, `Crowdfunding campaign for ${dossier.name}`)
    : null

  const campaign = await prisma.crowdfundingCampaign.upsert({
    where: { dossierId: id },
    create: {
      dossierId: id,
      state: "ACTIVE",
      goal: result.data.goal,
      raised: 0,
      stripeProductId,
    },
    update: {
      state: "ACTIVE",
      goal: result.data.goal,
      stripeProductId,
    },
  })

  await createAuditLog({
    userId: session.userId,
    dossierId: id,
    action: "CROWDFUNDING_CREATED",
    entity: "CrowdfundingCampaign",
    entityId: campaign.id,
    metadata: { goal: result.data.goal },
  })

  return apiSuccess(campaign, 201)
}
