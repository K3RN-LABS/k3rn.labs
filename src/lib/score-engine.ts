import { db as prisma } from "./db"
import { deserializeState } from "./onboarding-state"
import type { LabType } from "@prisma/client"

// ─── Dimensions ─────────────────────────────────────────────────────────────

/**
 * 4 dimensions alignées sur les frameworks réels (YC, BCG, Fortune 500 stage-gate) :
 * - Marché     : Problem × TAM (YC #1 criterion)
 * - Produit    : Feasibility & desirability (BCG Product Viability)
 * - Finance    : Business viability & unit economics (BCG Strategic Fit)
 * - Validation : Traction signal — YC #1 signal post-seed
 *
 * Note: `techScore` column conservé en DB pour la dimension Produit (pas de rename cassant).
 */
export type ScoreDimension = "market" | "product" | "finance" | "validation"

// ─── Lab-weighted pondérations ───────────────────────────────────────────────
// Pondérations évoluent selon la phase du projet pour refléter les priorités réelles.
// Source : stage-gate Fortune 500 + YC batch priorités par stade.

const LAB_WEIGHTS: Record<LabType, Record<ScoreDimension, number>> = {
  DISCOVERY:              { market: 0.50, product: 0.15, finance: 0.20, validation: 0.15 },
  STRUCTURATION:          { market: 0.40, product: 0.25, finance: 0.20, validation: 0.15 },
  VALIDATION_MARCHE:      { market: 0.30, product: 0.20, finance: 0.20, validation: 0.30 },
  DESIGN_PRODUIT:         { market: 0.25, product: 0.35, finance: 0.20, validation: 0.20 },
  ARCHITECTURE_TECHNIQUE: { market: 0.20, product: 0.40, finance: 0.20, validation: 0.20 },
  BUSINESS_FINANCE:       { market: 0.20, product: 0.20, finance: 0.45, validation: 0.15 },
}

// ─── Card weights ────────────────────────────────────────────────────────────

const CARD_WEIGHTS: Record<string, { dimension: ScoreDimension; weight: number }> = {
  // Marché — Problem × TAM
  market_size:           { dimension: "market", weight: 20 },
  competitive_analysis:  { dimension: "market", weight: 15 },
  positioning_statement: { dimension: "market", weight: 15 },
  user_persona:          { dimension: "market", weight: 15 },
  opportunity_map:       { dimension: "market", weight: 15 },
  // Produit — Feasibility & desirability (ex-Tech)
  system_architecture:   { dimension: "product", weight: 20 },
  tech_stack:            { dimension: "product", weight: 15 },
  security_model:        { dimension: "product", weight: 15 },
  data_model:            { dimension: "product", weight: 20 },
  api_specification:     { dimension: "product", weight: 15 },
  ux_wireframe:          { dimension: "product", weight: 15 },
  // Finance — Business viability
  business_model_canvas: { dimension: "finance", weight: 35 },
  financial_projection:  { dimension: "finance", weight: 35 },
  pricing_model:         { dimension: "finance", weight: 30 },
  // Validation — Traction signal (déplacé de Marché)
  validation_interviews: { dimension: "validation", weight: 40 },
}

const MAX_RAW: Record<ScoreDimension, number> = {
  market: 100,
  product: 100,
  finance: 100,
  validation: 100,
}

// ─── Score labels ────────────────────────────────────────────────────────────

export type ScoreTier = "embryonnaire" | "en_structuration" | "en_developpement" | "solide" | "mature"

export function getScoreTier(score: number): ScoreTier {
  if (score <= 20) return "embryonnaire"
  if (score <= 40) return "en_structuration"
  if (score <= 60) return "en_developpement"
  if (score <= 80) return "solide"
  return "mature"
}

export function getScoreLabel(score: number): string {
  const labels: Record<ScoreTier, string> = {
    embryonnaire: "Embryonnaire",
    en_structuration: "En structuration",
    en_developpement: "En développement",
    solide: "Solide",
    mature: "Mature",
  }
  return labels[getScoreTier(score)]
}

export function getScoreTierColor(score: number): string {
  const colors: Record<ScoreTier, string> = {
    embryonnaire: "text-red-400",
    en_structuration: "text-amber-400",
    en_developpement: "text-yellow-400",
    solide: "text-green-400",
    mature: "text-emerald-400",
  }
  return colors[getScoreTier(score)]
}

// ─── Main compute function ───────────────────────────────────────────────────

export async function computeAndPersistScore(
  dossierId: string,
  triggeredByCardId?: string
): Promise<{
  marketScore: number
  techScore: number        // mapped to "product" — column name kept for DB compat
  financeScore: number
  validationScore: number
  globalScore: number
}> {
  const [subFolders, dossier] = await Promise.all([
    prisma.subFolder.findMany({
      where: { dossierId },
      include: { cards: { where: { state: "VALIDATED" } } },
    }),
    prisma.dossier.findUnique({ where: { id: dossierId } }),
  ])

  const currentLab = ((dossier as any)?.labState?.currentLab ?? "DISCOVERY") as LabType
  const weights = LAB_WEIGHTS[currentLab] ?? LAB_WEIGHTS.DISCOVERY

  const validatedCards = subFolders.flatMap((sf) => sf.cards)

  let rawMarket = 0
  let rawProduct = 0
  let rawFinance = 0
  let rawValidation = 0

  // ── 1. Onboarding aspects → contribution croisée sur 4 dimensions ──────────
  //
  // Modèle cross-contribution : chaque aspect contribue là où il a du sens réel,
  // pas juste dans une case préétablie.
  //
  // problem  → Marché (douleur = signal marché) + Validation (problème clair = traction signal)
  // target   → Marché (cible = TAM faisable)   + Validation (segment précis = traction signal)
  // outcome  → Produit (résultat = désirabilité produit) + Finance (direction viable = viabilité)
  // constraint → Produit (obstacle = faisabilité tech) + Finance (obstacle = viabilité business)
  //
  // quality: "weak" = 0.5×, "strong" = 1.0×
  if (dossier?.onboardingState) {
    const onboarding = deserializeState(dossier.onboardingState)
    const q = (aspect: { value: string; quality?: string } | undefined) =>
      aspect?.value ? (aspect.quality === "weak" ? 0.5 : 1.0) : 0

    const qProblem = q(onboarding.confirmedAspects.problem)
    const qTarget = q(onboarding.confirmedAspects.target)
    const qOutcome = q(onboarding.confirmedAspects.outcome)
    const qConstraint = q(onboarding.confirmedAspects.constraint)

    rawMarket += 10 * qProblem     // douleur = signal marché
    rawMarket += 10 * qTarget      // cible précise = TAM faisable
    rawProduct += 8 * qOutcome     // résultat attendu = désirabilité produit
    rawProduct += 8 * qConstraint  // obstacle principal = faisabilité
    rawFinance += 8 * qOutcome     // direction du résultat = viabilité économique
    rawFinance += 8 * qConstraint  // obstacle = réalisme du modèle
    rawValidation += 5 * qProblem  // problème clairement formulé = signal traction
    rawValidation += 5 * qTarget   // segment identifié = signal traction
  }

  // ── 2. Validated cards → 4 dimensions ────────────────────────────────────
  for (const card of validatedCards) {
    const weight = CARD_WEIGHTS[card.type ?? ""]
    if (!weight) continue
    if (weight.dimension === "market") rawMarket += weight.weight
    if (weight.dimension === "product") rawProduct += weight.weight
    if (weight.dimension === "finance") rawFinance += weight.weight
    if (weight.dimension === "validation") rawValidation += weight.weight
  }

  // ── 3. Normalize to 0-100 ─────────────────────────────────────────────────
  const marketScore = Math.min(100, (rawMarket / MAX_RAW.market) * 100)
  const productScore = Math.min(100, (rawProduct / MAX_RAW.product) * 100)
  const financeScore = Math.min(100, (rawFinance / MAX_RAW.finance) * 100)
  const validationScore = Math.min(100, (rawValidation / MAX_RAW.validation) * 100)

  // ── 4. Lab-weighted global ─────────────────────────────────────────────────
  const globalScore =
    marketScore * weights.market +
    productScore * weights.product +
    financeScore * weights.finance +
    validationScore * weights.validation

  await prisma.scoreSnapshot.create({
    data: {
      dossierId,
      marketScore,
      techScore: productScore,       // DB column = techScore (kept for compat)
      financeScore,
      validationScore,
      globalScore,
      triggeredBy: triggeredByCardId,
    },
  })

  return {
    marketScore,
    techScore: productScore,
    financeScore,
    validationScore,
    globalScore,
  }
}

export async function getLatestScore(dossierId: string) {
  return prisma.scoreSnapshot.findFirst({
    where: { dossierId },
    orderBy: { createdAt: "desc" },
  })
}
