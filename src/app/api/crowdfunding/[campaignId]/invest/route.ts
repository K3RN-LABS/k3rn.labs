import { NextRequest } from "next/server"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createPaymentIntent, isStripeConfigured } from "@/lib/stripe"
import { z } from "zod"

const schema = z.object({
  amount: z.number().positive().min(1),
  email: z.string().email(),
  currency: z.string().length(3).default("usd"),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params
  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const campaign = await prisma.crowdfundingCampaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return apiError("Campaign not found", 404)
  if (campaign.state !== "ACTIVE") return apiError("Campaign is not active", 422)

  if (!isStripeConfigured()) {
    return apiError("Payment processing not configured", 503)
  }

  const { clientSecret, paymentIntentId } = await createPaymentIntent(
    result.data.amount,
    result.data.currency,
    { campaignId, investorEmail: result.data.email }
  )

  await prisma.investment.create({
    data: {
      campaignId,
      investorEmail: result.data.email,
      amount: result.data.amount,
      stripePaymentIntentId: paymentIntentId,
      status: "PENDING",
    },
  })

  return apiSuccess({ clientSecret })
}
