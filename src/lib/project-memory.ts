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
              where: { state: "VALIDATED" },
              orderBy: { updatedAt: "desc" },
              take: 20,
            },
          },
        },
      },
    })

    if (!dossier) return ""

    const poleSessions = await prisma.poleSession.findMany({
      where: { dossierId, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { pole: true },
    })

    const scoreSnapshot = await prisma.scoreSnapshot.findFirst({
      where: { dossierId },
      orderBy: { createdAt: "desc" },
    })

    const lines: string[] = []

    lines.push(`PROJET : ${dossier.name}`)
    lines.push(`LAB ACTIF : ${dossier.labState?.currentLab ?? "DISCOVERY"}`)
    lines.push(`SCORE GLOBAL : ${scoreSnapshot?.globalScore ?? 0}/100`)
    lines.push("")

    // Onboarding Context
    const onboardingState = deserializeState(dossier.onboardingState)
    const confirmedEntries = ASPECT_KEYS.filter(k => !!onboardingState.confirmedAspects[k]?.value)

    if (confirmedEntries.length > 0) {
      lines.push("VISION INITIALE (ONBOARDING) :")
      for (const key of confirmedEntries) {
        const entry = onboardingState.confirmedAspects[key]!
        lines.push(`  - ${ASPECT_LABELS[key]} : ${truncate(entry.value, 400)}`)
      }
      lines.push("")
    } else {
      // Fallback: If no aspects confirmed, show a snippet of the onboarding conversation
      const history = (dossier.onboardingMessages ?? []) as ChatMessage[]
      const lastUserMsg = [...history].reverse().find(m => m.role === "user")
      if (lastUserMsg) {
        lines.push("NOTES INITIALES (EN COURS) :")
        lines.push(`  "${truncate(lastUserMsg.content, 300)}"`)
        lines.push("")
      }
    }

    const allCards = (dossier.subFolders as any[]).flatMap((sf: any) => sf.cards as any[])
    if (allCards.length > 0) {
      lines.push("CARTES VALIDÉES :")
      for (const card of allCards) {
        const content = card.content as Record<string, unknown>
        const summary = truncate(
          Object.values(content).filter(Boolean).join(" — "),
          200
        )
        lines.push(`  [${card.type}] ${card.title} — ${summary}`)
      }
      lines.push("")
    }

    if (poleSessions.length > 0) {
      lines.push("TRAVAUX DES PÔLES :")
      for (const session of poleSessions) {
        const messages = session.messages as Array<{ role: string; content: string }>
        const lastManagerMsg = [...messages].reverse().find((m) => m.role === "manager")
        if (lastManagerMsg) {
          lines.push(
            `  ${session.pole.managerName} (${session.pole.code}) : ${truncate(lastManagerMsg.content, 300)}`
          )
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
