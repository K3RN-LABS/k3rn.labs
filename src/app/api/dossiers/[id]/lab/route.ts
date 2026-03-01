import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { LAB_CONDITIONS } from "@/lib/lab-conditions"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({
    where: { id, ownerId: session.userId },
    include: { labState: true },
  })
  if (!dossier) return apiError("Dossier not found", 404)
  if (!dossier.labState) return apiError("No LAB state found", 404)

  const currentLab = dossier.labState.currentLab
  const conditions = (LAB_CONDITIONS as any)[currentLab]

  const subFolders = await prisma.subFolder.findMany({
    where: { dossierId: id },
    include: { cards: { where: { state: "VALIDATED" } } },
  })
  const validatedCardTypes = subFolders.flatMap((sf: any) => sf.cards.map((c: any) => c.type))

  const missingCards = conditions.requiredValidatedCardTypes.filter(
    (t: any) => !validatedCardTypes.includes(t)
  )

  const blockingExperts = await prisma.expertSession.findMany({
    where: { dossierId: id, status: { notIn: ["VALIDATED", "REJECTED"] } },
    include: { expert: true },
  })
  const blockers = blockingExperts.filter((s: any) => s.expert.blocksLabTransition)

  return apiSuccess({
    labState: dossier.labState,
    nextLab: conditions.nextLab,
    canTransition: missingCards.length === 0 && blockers.length === 0,
    missingCards,
    blockingExperts: blockers.map((b: any) => ({ slug: b.expert.slug, name: b.expert.name })),
  })
}
