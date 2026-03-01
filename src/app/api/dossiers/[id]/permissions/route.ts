import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { computePermissions } from "@/lib/permissions"
import { getLatestScore } from "@/lib/score-engine"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({
    where: { id, ownerId: session.userId },
    include: { labState: true },
  })
  if (!dossier) return apiError("Dossier not found", 404)
  if (!dossier.labState) return apiError("No LAB state", 404)

  const [latestScore, expertSessions] = await Promise.all([
    getLatestScore(id),
    prisma.expertSession.findMany({
      where: { dossierId: id },
      include: { expert: true },
    }),
  ])

  const expertStates = expertSessions.map((s) => ({
    slug: s.expert.slug,
    status: s.status,
    blocksLabTransition: s.expert.blocksLabTransition,
  }))

  const permissions = await computePermissions({
    lab: dossier.labState.currentLab,
    expertStates,
    score: latestScore?.globalScore ?? 0,
    userRole: session.role,
    subFolderOpen: dossier.macroState === "SUBFOLDER_OPEN",
  })

  return apiSuccess(permissions)
}
