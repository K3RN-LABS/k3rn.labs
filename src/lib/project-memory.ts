import { db as prisma } from "@/lib/db"

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
