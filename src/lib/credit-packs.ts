export interface CreditPack {
  id: string
  name: string
  tagline: string
  credits: number
  priceEur: number
  priceId?: string // Stripe Price ID (optional, we use price_data inline)
  highlight?: boolean
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "bootstrapped",
    name: "Bootstrapped",
    tagline: "Un fondateur, une idée, un garage",
    credits: 30,
    priceEur: 12,
  },
  {
    id: "funded",
    name: "Funded",
    tagline: "Seed levé, équipe constituée",
    credits: 100,
    priceEur: 29,
    highlight: true,
  },
  {
    id: "series_b",
    name: "Series B",
    tagline: "Scale-up en croissance active",
    credits: 300,
    priceEur: 69,
  },
  {
    id: "ipo",
    name: "IPO Ready",
    tagline: "Opérations multi-marchés, ambition globale",
    credits: 1000,
    priceEur: 149,
  },
]

export function getPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id)
}
