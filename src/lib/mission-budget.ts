/**
 * Mission budget — système hybride abonnement + top-up
 *
 * Ordre de consommation :
 *   1. missions mensuel abonnement (monthlyMissionsUsed < monthlyMissionAllowance)
 *   2. top-up permanents (topUpMissions)
 *
 * KAEL ne consomme jamais de missions (gratuit).
 * Seuls les appels experts (poles, onboarding LLM) consomment.
 */

import { supabaseAdmin } from "@/lib/supabase-admin"

export type BudgetCheckResult =
  | { ok: true; source: "allowance" | "topup" }
  | { ok: false; reason: string }

/**
 * Vérifie si l'utilisateur peut consommer une mission sans la débiter.
 */
export async function checkMissionBudget(userId: string): Promise<BudgetCheckResult> {
  const { data: user } = await supabaseAdmin
    .from("User")
    .select("monthlyMissionAllowance, monthlyMissionsUsed, topUpMissions, allowanceResetAt")
    .eq("id", userId)
    .single()

  if (!user) return { ok: false, reason: "Utilisateur introuvable" }

  // Reset mensuel si nécessaire
  if (user.allowanceResetAt && new Date(user.allowanceResetAt) <= new Date()) {
    await supabaseAdmin
      .from("User")
      .update({ monthlyMissionsUsed: 0, allowanceResetAt: nextMonthReset() })
      .eq("id", userId)
    user.monthlyMissionsUsed = 0
  }

  const allowanceLeft = (user.monthlyMissionAllowance ?? 5) - (user.monthlyMissionsUsed ?? 0)
  if (allowanceLeft > 0) return { ok: true, source: "allowance" }
  if ((user.topUpMissions ?? 0) > 0) return { ok: true, source: "topup" }

  return { ok: false, reason: "Budget de missions épuisé. Rechargez pour continuer." }
}

/**
 * Débite une mission. À appeler après avoir vérifié avec checkMissionBudget.
 */
export async function consumeMission(userId: string): Promise<void> {
  const { data: user } = await supabaseAdmin
    .from("User")
    .select("monthlyMissionAllowance, monthlyMissionsUsed, topUpMissions, allowanceResetAt")
    .eq("id", userId)
    .single()

  if (!user) return

  const allowanceLeft = (user.monthlyMissionAllowance ?? 5) - (user.monthlyMissionsUsed ?? 0)

  if (allowanceLeft > 0) {
    // Consommer depuis l'abonnement mensuel
    await supabaseAdmin
      .from("User")
      .update({ monthlyMissionsUsed: (user.monthlyMissionsUsed ?? 0) + 1 })
      .eq("id", userId)
  } else if ((user.topUpMissions ?? 0) > 0) {
    // Consommer depuis les top-ups permanents
    await supabaseAdmin
      .from("User")
      .update({ topUpMissions: (user.topUpMissions ?? 0) - 1 })
      .eq("id", userId)
  }
}

/**
 * Crédite des missions top-up après un paiement Stripe réussi.
 */
export async function creditTopUpMissions(userId: string, amount: number): Promise<void> {
  const { data: user } = await supabaseAdmin
    .from("User")
    .select("topUpMissions")
    .eq("id", userId)
    .single()

  await supabaseAdmin
    .from("User")
    .update({ topUpMissions: ((user?.topUpMissions ?? 0) + amount) })
    .eq("id", userId)
}

/**
 * Retourne le budget visible pour l'UI :
 * missions abonnement restantes + top-ups.
 */
export async function getMissionBudgetDisplay(userId: string): Promise<{
  allowanceLeft: number
  topUpLeft: number
  total: number
  allowance: number
}> {
  const { data: user } = await supabaseAdmin
    .from("User")
    .select("monthlyMissionAllowance, monthlyMissionsUsed, topUpMissions")
    .eq("id", userId)
    .single()

  const allowance = user?.monthlyMissionAllowance ?? 5
  const used = user?.monthlyMissionsUsed ?? 0
  const topUp = user?.topUpMissions ?? 0
  const allowanceLeft = Math.max(0, allowance - used)

  return {
    allowanceLeft,
    topUpLeft: topUp,
    total: allowanceLeft + topUp,
    allowance,
  }
}

function nextMonthReset(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
