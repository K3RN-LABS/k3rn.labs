import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { sessionId } = await params
  const expertSession = await prisma.expertSession.findUnique({
    where: { id: sessionId },
    include: { dossier: true },
  })
  if (!expertSession) return apiError("Session not found", 404)
  if (expertSession.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const updated = await prisma.expertSession.update({
    where: { id: sessionId },
    data: { status: "REJECTED" },
  })

  await createAuditLog({
    userId: session.userId,
    dossierId: expertSession.dossierId,
    action: "EXPERT_SESSION_REJECTED",
    entity: "ExpertSession",
    entityId: sessionId,
    metadata: {},
  })

  return apiSuccess(updated)
}
