import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const dossier = await prisma.dossier.findUnique({
    where: { id: params.id },
    include: {
      labState: true,
      subFolders: {
        include: {
          cards: {
            where: { state: "VALIDATED" },
            select: { id: true, type: true, title: true },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  })

  if (!dossier) return apiError("Not found", 404)
  if (dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const poleSessions = await prisma.poleSession.findMany({
    where: { dossierId: params.id },
    orderBy: { updatedAt: "desc" },
    include: { pole: { select: { managerName: true, code: true } } },
  })

  const scoreSnapshot = await prisma.scoreSnapshot.findFirst({
    where: { dossierId: params.id },
    orderBy: { createdAt: "desc" },
  })

  const LAB_ORDER = [
    "DISCOVERY",
    "STRUCTURATION",
    "VALIDATION_MARCHE",
    "DESIGN_PRODUIT",
    "ARCHITECTURE_TECHNIQUE",
    "BUSINESS_FINANCE",
  ]

  const currentLab = dossier.labState?.currentLab ?? "DISCOVERY"
  const currentLabIndex = LAB_ORDER.indexOf(currentLab)
  const completedLabs = LAB_ORDER.slice(0, currentLabIndex)

  const validatedCards = (dossier.subFolders as Array<{ type: string; cards: Array<{ type: string; title: string }> }>).flatMap(
    (sf) => sf.cards.map((c) => ({ type: c.type, title: c.title, subfolderType: sf.type }))
  )

  const activeSessions = poleSessions.map((s) => {
    const messages = s.messages as Array<{ role: string; content: string }>
    const lastManagerMsg = [...messages].reverse().find((m) => m.role === "manager")
    return {
      managerName: s.pole.managerName,
      poleCode: s.pole.code,
      status: s.status,
      lastMessage: lastManagerMsg?.content
        ? lastManagerMsg.content.slice(0, 200) + (lastManagerMsg.content.length > 200 ? "…" : "")
        : null,
      updatedAt: s.updatedAt,
    }
  })

  return apiSuccess({
    currentLab,
    completedLabs,
    labOrder: LAB_ORDER,
    validatedCards,
    poleSessions: activeSessions,
    score: scoreSnapshot
      ? {
          global: Math.round(scoreSnapshot.globalScore),
          market: Math.round(scoreSnapshot.marketScore),
          tech: Math.round(scoreSnapshot.techScore),
          finance: Math.round(scoreSnapshot.financeScore),
        }
      : null,
  })
}
