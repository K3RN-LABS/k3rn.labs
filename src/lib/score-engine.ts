import { db as prisma } from "./db"
import { deserializeState, ASPECT_KEYS } from "./onboarding-state"
import type { LabType } from "@prisma/client"

const CARD_WEIGHTS: Record<string, { dimension: "market" | "tech" | "finance"; weight: number }> = {
  market_size: { dimension: "market", weight: 20 },
  competitive_analysis: { dimension: "market", weight: 15 },
  validation_interviews: { dimension: "market", weight: 20 },
  positioning_statement: { dimension: "market", weight: 15 },
  user_persona: { dimension: "market", weight: 15 },
  opportunity_map: { dimension: "market", weight: 15 },
  system_architecture: { dimension: "tech", weight: 20 },
  tech_stack: { dimension: "tech", weight: 15 },
  security_model: { dimension: "tech", weight: 15 },
  data_model: { dimension: "tech", weight: 20 },
  api_specification: { dimension: "tech", weight: 15 },
  ux_wireframe: { dimension: "tech", weight: 15 },
  business_model_canvas: { dimension: "finance", weight: 35 },
  financial_projection: { dimension: "finance", weight: 35 },
  pricing_model: { dimension: "finance", weight: 30 },
}

const MAX_SCORE: Record<"market" | "tech" | "finance", number> = {
  market: 100,
  tech: 100,
  finance: 100,
}

export async function computeAndPersistScore(dossierId: string, triggeredByCardId?: string): Promise<{
  marketScore: number
  techScore: number
  financeScore: number
  globalScore: number
}> {
  const subFolders = await prisma.subFolder.findMany({
    where: { dossierId },
    include: { cards: { where: { state: "VALIDATED" } } },
  })

  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId }
  })

  const validatedCards = subFolders.flatMap((sf) => sf.cards)

  let rawMarket = 0
  let rawTech = 0
  let rawFinance = 0

  // 1. Point attribution from onboarding
  if (dossier?.onboardingState) {
    const onboarding = deserializeState(dossier.onboardingState)
    if (onboarding.confirmedAspects.problem?.value) rawMarket += 10
    if (onboarding.confirmedAspects.target?.value) rawMarket += 10
    if (onboarding.confirmedAspects.outcome?.value) rawTech += 10
    if (onboarding.confirmedAspects.constraint?.value) rawTech += 10
  }

  // 2. Point attribution from validated cards
  for (const card of validatedCards) {
    const weight = CARD_WEIGHTS[card.type]
    if (!weight) continue
    if (weight.dimension === "market") rawMarket += weight.weight
    if (weight.dimension === "tech") rawTech += weight.weight
    if (weight.dimension === "finance") rawFinance += weight.weight
  }

  const marketScore = Math.min(100, (rawMarket / MAX_SCORE.market) * 100)
  const techScore = Math.min(100, (rawTech / MAX_SCORE.tech) * 100)
  const financeScore = Math.min(100, (rawFinance / MAX_SCORE.finance) * 100)
  const globalScore = marketScore * 0.4 + techScore * 0.35 + financeScore * 0.25

  await prisma.scoreSnapshot.create({
    data: {
      dossierId,
      marketScore,
      techScore,
      financeScore,
      globalScore,
      triggeredBy: triggeredByCardId,
    },
  })

  return { marketScore, techScore, financeScore, globalScore }
}

export async function getLatestScore(dossierId: string) {
  return prisma.scoreSnapshot.findFirst({
    where: { dossierId },
    orderBy: { createdAt: "desc" },
  })
}
