import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { checkRateLimit } from "@/lib/rate-limit"
import { getExpertInitialMessage } from "@/lib/claude"
import { randomUUID } from "crypto"
import { z } from "zod"

const schema = z.object({
  dossierId: z.string().min(1),
  cardId: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ expertId: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const rl = await checkRateLimit("experts", session.userId)
  if (!rl.success) return apiError("Rate limit exceeded (5 expert calls/min)", 429)

  const { expertId } = await params
  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const expert =
    (await prisma.expert.findUnique({ where: { id: expertId } })) ??
    (await prisma.expert.findUnique({ where: { slug: expertId } }))
  if (!expert) return apiError("Expert not found", 404)

  const dossier = await prisma.dossier.findFirst({
    where: { id: result.data.dossierId, ownerId: session.userId },
    include: {
      labState: true,
      subFolders: { include: { cards: { where: { state: "VALIDATED" } } } },
    },
  })
  if (!dossier) return apiError("Dossier not found", 404)

  const currentLab = dossier.labState?.currentLab
  if (currentLab !== expert.lab) {
    return apiError(`Expert ${expert.name} is not available in LAB ${currentLab}`, 403)
  }

  if (!dossier.labState) return apiError("No LAB state", 422)

  const validatedCards = dossier.subFolders.flatMap((sf: any) =>
    sf.cards.map((c: any) => ({ type: c.type, title: c.title }))
  )

  const initial = await getExpertInitialMessage(
    expert.name,
    expert.name,
    dossier.name,
    validatedCards
  )

  const initialMessage = {
    id: randomUUID(),
    role: "expert" as const,
    content: initial.message,
    timestamp: new Date().toISOString(),
    choices: initial.choices,
  }

  const session_record = await prisma.expertSession.create({
    data: {
      expertId: expert.id,
      dossierId: result.data.dossierId,
      labStateId: dossier.labState.id,
      cardId: result.data.cardId,
      messages: [initialMessage],
      status: "PENDING",
    },
  })

  await createAuditLog({
    userId: session.userId,
    dossierId: result.data.dossierId,
    action: "CREATE",
    entity: "ExpertSession",
    entityId: session_record.id,
    metadata: { expertSlug: expert.slug, lab: expert.lab },
  })

  return apiSuccess(session_record, 201)
}
