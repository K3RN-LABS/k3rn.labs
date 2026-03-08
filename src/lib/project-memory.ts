import { db as prisma } from "@/lib/db"
import { deserializeState, ASPECT_LABELS, ASPECT_KEYS } from "@/lib/onboarding-state"
import { getScoreLabel } from "@/lib/score-engine"
import type { ChatMessage } from "@/lib/claude"

export interface ProjectMemory {
  dossierName: string
  currentLab: string
  globalScore: number
  validatedCards: Array<{ type: string; title: string; summary: string }>
  recentPoleSessions: Array<{ managerName: string; poleCode: string; lastMessage: string }>
  kaelSummary: string
}

const MAX_TOKENS_ESTIMATE = 6000
const AVG_CHARS_PER_TOKEN = 4

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + "…"
}

export async function buildProjectMemory(dossierId: string): Promise<string> {
  try {
    const dossier = await prisma.dossier.findUnique({
      where: { id: dossierId },
      include: {
        labState: true,
        subFolders: {
          include: {
            cards: {
              orderBy: { updatedAt: "desc" },
              take: 40,
            },
          },
        },
      },
    })

    if (!dossier) return ""

    const [poleSessions, scoreSnapshot, lastKaelSession] = await Promise.all([
      prisma.poleSession.findMany({
        where: { dossierId, status: "COMPLETED" },
        orderBy: { updatedAt: "desc" },
        take: 3,
        include: { pole: true },
      }),
      prisma.scoreSnapshot.findFirst({
        where: { dossierId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.kaelSession.findFirst({
        where: { dossierId },
        orderBy: { updatedAt: "desc" },
      }),
    ])

    const lines: string[] = []
    const labCurrent = dossier.labState?.currentLab ?? "DISCOVERY"
    const labTransition = (dossier.labState as any)?.transitionAllowed ? "autorisée" : "bloquée"

    lines.push(`PROJET : ${dossier.name}`)
    lines.push(`LAB ACTIF : ${labCurrent} | Transition vers lab suivant : ${labTransition}`)
    lines.push("")

    // ── Onboarding brief ─────────────────────────────────────────────────────
    const onboardingState = deserializeState(dossier.onboardingState)
    const isOnboardingComplete = onboardingState.step === "COMPLETE"
    const confirmedEntries = ASPECT_KEYS.filter(k => !!onboardingState.confirmedAspects[k]?.value)

    if (confirmedEntries.length > 0) {
      lines.push(`BRIEF ONBOARDING (${isOnboardingComplete ? "COMPLÉTÉ" : "EN COURS — " + confirmedEntries.length + "/4 aspects"}) :`)
      for (const key of ASPECT_KEYS) {
        const entry = onboardingState.confirmedAspects[key]
        if (entry?.value) {
          const qualityTag = entry.quality === "weak" ? " [à affiner]" : ""
          lines.push(`  ✓ ${ASPECT_LABELS[key]}${qualityTag} : ${truncate(entry.value, 300)}`)
        } else {
          lines.push(`  ○ ${ASPECT_LABELS[key]} : non renseigné`)
        }
      }
      lines.push("")
    } else {
      const history = (dossier.onboardingMessages ?? []) as ChatMessage[]
      const lastUserMsg = [...history].reverse().find(m => m.role === "user")
      if (lastUserMsg) {
        lines.push("BRIEF ONBOARDING (EN COURS — 0/4 aspects) :")
        lines.push(`  Note initiale : "${truncate(lastUserMsg.content, 300)}"`)
        lines.push("")
      }
    }

    // ── Scores 4 dimensions ──────────────────────────────────────────────────
    if (scoreSnapshot) {
      const ss = scoreSnapshot as any
      const market = Math.round(ss.marketScore ?? 0)
      const product = Math.round(ss.techScore ?? 0)          // techScore = Produit (DB compat)
      const finance = Math.round(ss.financeScore ?? 0)
      const validation = Math.round(ss.validationScore ?? 0)
      const global = Math.round(ss.globalScore ?? 0)

      lines.push("SCORE PROJET (4 dimensions) :")
      lines.push(`  Marché     : ${market}% — ${getScoreLabel(market)}`)
      lines.push(`  Produit    : ${product}% — ${getScoreLabel(product)}`)
      lines.push(`  Finance    : ${finance}% — ${getScoreLabel(finance)}`)
      lines.push(`  Validation : ${validation}% — ${getScoreLabel(validation)}`)
      lines.push(`  Global     : ${global}% — ${getScoreLabel(global)}`)

      // Levier prioritaire — dimension avec le score pondéré le plus faible
      // Déterministe : KAEL sait exactement quelle dimension router en priorité
      const dims = [
        { name: "Marché", score: market, expert: "MAYA (P02_MARKET)" },
        { name: "Produit", score: product, expert: "KAI (P03_PRODUIT_TECH)" },
        { name: "Finance", score: finance, expert: "ELENA (P04_FINANCE)" },
        { name: "Validation", score: validation, expert: "AXEL (P01_STRATEGIE) ou MAYA (P02_MARKET)" },
      ]
      const weakest = dims.reduce((a, b) => a.score <= b.score ? a : b)
      lines.push(`  → LEVIER PRIORITAIRE : ${weakest.name} (${weakest.score}%) — expert recommandé : ${weakest.expert}`)
      lines.push("")
    }

    // ── Cartes par état ──────────────────────────────────────────────────────
    const allCards = (dossier.subFolders as any[]).flatMap((sf: any) => sf.cards as any[])
    const validated = allCards.filter((c: any) => c.state === "VALIDATED")
    const drafts = allCards.filter((c: any) => c.state === "DRAFT")
    const rejected = allCards.filter((c: any) => c.state === "REJECTED")

    if (allCards.length > 0) {
      lines.push(`CARTES (${allCards.length} au total) :`)
      if (validated.length > 0) {
        lines.push(`  Validées (${validated.length}) :`)
        for (const card of validated.slice(0, 10)) {
          const content = card.content as Record<string, unknown>
          const summary = truncate(Object.values(content).filter(Boolean).join(" — "), 150)
          lines.push(`    [${card.type}] ${card.title} — ${summary}`)
        }
      }
      if (drafts.length > 0) {
        lines.push(`  Brouillons (${drafts.length}) : ${drafts.slice(0, 5).map((c: any) => `[${c.type}] ${c.title}`).join(", ")}`)
      }
      if (rejected.length > 0) {
        lines.push(`  Rejetées (${rejected.length}) : ${rejected.slice(0, 3).map((c: any) => `[${c.type}] ${c.title}`).join(", ")}`)
      }
      lines.push("")
    }

    // ── Activité pôles ───────────────────────────────────────────────────────
    if (poleSessions.length > 0) {
      lines.push("ACTIVITÉ PÔLES (3 dernières sessions) :")
      for (const session of poleSessions) {
        const messages = session.messages as Array<{ role: string; content: string }>
        const lastManagerMsg = [...messages].reverse().find((m) => m.role === "manager")
        if (lastManagerMsg) {
          lines.push(`  ${session.pole.managerName} (${session.pole.code}) : ${truncate(lastManagerMsg.content, 200)}`)
        }
      }
      lines.push("")
    }

    // ── Notes KAEL post-session ───────────────────────────────────────────────
    if (lastKaelSession) {
      const kaelMessages = (lastKaelSession.messages ?? []) as Array<{ role: string; content: string }>
      const kaelNotes = kaelMessages.filter((m) => m.role === "kael_note" || m.role === "kael_note")
      if (kaelNotes.length > 0) {
        lines.push("NOTES KAEL (synthèses post-session) :")
        for (const note of kaelNotes.slice(-5)) {
          lines.push(`  • ${truncate(note.content, 250)}`)
        }
        lines.push("")
      }
    }

    const fullText = lines.join("\n")
    const maxChars = MAX_TOKENS_ESTIMATE * AVG_CHARS_PER_TOKEN
    return truncate(fullText, maxChars)
  } catch {
    return ""
  }
}
