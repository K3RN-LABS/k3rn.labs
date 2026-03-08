import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { getStripe } from "@/lib/stripe"

export async function POST(_req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return apiError("Utilisateur introuvable", 404)

  const customerId = (user as any).stripeCustomerId as string | null
  if (!customerId) return apiError("Aucun abonnement trouvé", 400)

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings?tab=subscription`,
  })

  return apiSuccess({ url: portalSession.url })
}
