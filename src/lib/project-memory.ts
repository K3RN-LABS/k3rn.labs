import { db as prisma } from "@/lib/db"
import { deserializeState, ASPECT_LABELS, ASPECT_KEYS } from "@/lib/onboarding-state"
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

    const [poleSessions, scoreSnapshot] = await Promise.all([
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

    // ── Scores ───────────────────────────────────────────────────────────────
    if (scoreSnapshot) {
      lines.push("SCORE PROJET :")
      lines.push(`  Marché   : ${Math.round(scoreSnapshot.marketScore ?? 0)}%`)
      lines.push(`  Finance  : ${Math.round((scoreSnapshot as any).financeScore ?? 0)}%`)
      lines.push(`  Tech     : ${Math.round(scoreSnapshot.techScore ?? 0)}%`)
      lines.push(`  Global   : ${Math.round(scoreSnapshot.globalScore ?? 0)}%`)
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

    const fullText = lines.join("\n")
    const maxChars = MAX_TOKENS_ESTIMATE * AVG_CHARS_PER_TOKEN
    return truncate(fullText, maxChars)
  } catch {
    return ""
  }
}
