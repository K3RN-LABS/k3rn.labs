import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { getStripe } from "@/lib/stripe"
import { getPackById } from "@/lib/credit-packs"
import { z } from "zod"

const schema = z.object({
  packId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const pack = getPackById(result.data.packId)
  if (!pack) return apiError("Pack introuvable", 400)

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return apiError("Utilisateur introuvable", 404)

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: pack.priceEur * 100,
          product_data: {
            name: `K3RN Labs — Pack ${pack.name}`,
            description: `${pack.credits} missions · ${pack.tagline}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.userId,
      packId: pack.id,
      credits: String(pack.credits),
    },
    customer_email: user.email,
    success_url: `${appUrl}/dashboard?credits=success&pack=${pack.id}`,
    cancel_url: `${appUrl}/settings?tab=subscription&credits=cancelled`,
  })

  if (!checkoutSession.url) return apiError("Impossible de créer la session Stripe", 500)

  return apiSuccess({ url: checkoutSession.url })
}
