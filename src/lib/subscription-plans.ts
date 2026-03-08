/**
 * Plans d'abonnement K3RN
 * Solo : 29€/mois — 60 missions/mois
 * Studio : 79€/mois — 200 missions/mois
 *
 * Les Price IDs Stripe sont lus depuis les variables d'environnement.
 * Créer les produits/prices dans le dashboard Stripe, puis les référencer ici.
 */

export type SubscriptionTier = "FREE" | "SOLO" | "STUDIO"

export interface SubscriptionPlan {
  tier: SubscriptionTier
  name: string
  tagline: string
  priceEur: number
  missionsPerMonth: number
  stripePriceId: string | undefined
  highlight?: boolean
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "FREE",
    name: "Early Access",
    tagline: "Découvrez K3RN gratuitement",
    priceEur: 0,
    missionsPerMonth: 5,
    stripePriceId: undefined,
  },
  {
    tier: "SOLO",
    name: "Solo",
    tagline: "Un fondateur, une vision, tous les experts",
    priceEur: 29,
    missionsPerMonth: 60,
    stripePriceId: process.env.STRIPE_PRICE_SOLO,
    highlight: true,
  },
  {
    tier: "STUDIO",
    name: "Studio",
    tagline: "Multi-projets, usage intensif, scale-up",
    priceEur: 79,
    missionsPerMonth: 200,
    stripePriceId: process.env.STRIPE_PRICE_STUDIO,
  },
]

export function getPlanByTier(tier: SubscriptionTier): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.tier === tier)
}

export function getPlanByPriceId(priceId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.stripePriceId === priceId)
}
