import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { getStripe } from "@/lib/stripe"
import { getPlanByTier, type SubscriptionTier } from "@/lib/subscription-plans"
import { z } from "zod"

const schema = z.object({
  tier: z.enum(["SOLO", "STUDIO"]),
})

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const tier = result.data.tier as SubscriptionTier
  const plan = getPlanByTier(tier)
  if (!plan?.stripePriceId) return apiError("Plan introuvable ou non configuré", 400)

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return apiError("Utilisateur introuvable", 404)

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  // Récupérer ou créer le customer Stripe
  let customerId = (user as any).stripeCustomerId as string | null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      metadata: { userId: session.userId },
    })
    customerId = customer.id
    await (prisma as any).user.update({
      where: { id: session.userId },
      data: { stripeCustomerId: customerId },
    })
  }

  // Si abonnement actif → rediriger vers le portal pour changer de plan
  const existingSubId = (user as any).stripeSubscriptionId as string | null
  if (existingSubId) {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings?tab=subscription`,
    })
    return apiSuccess({ url: portalSession.url, mode: "portal" })
  }

  // Créer une nouvelle session checkout pour l'abonnement
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    metadata: { userId: session.userId, tier },
    subscription_data: {
      metadata: { userId: session.userId, tier },
    },
    success_url: `${appUrl}/dashboard?subscription=success&tier=${tier}`,
    cancel_url: `${appUrl}/settings?tab=subscription&subscription=cancelled`,
  })

  return apiSuccess({ url: checkoutSession.url, mode: "checkout" })
}
