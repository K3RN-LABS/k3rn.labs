import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { z } from "zod"
import type { MacroState } from "@prisma/client"

const VALID_TRANSITIONS: Record<MacroState, MacroState[]> = {
  SYSTEM_READY: ["DASHBOARD"],
  DASHBOARD: ["WORKSPACE_IDLE"],
  WORKSPACE_IDLE: ["SUBFOLDER_OPEN"],
  SUBFOLDER_OPEN: ["CARD_FLOW", "EXPERT_FLOW", "WORKSPACE_IDLE"],
  CARD_FLOW: ["SUBFOLDER_OPEN", "SCORE_UPDATE"],
  EXPERT_FLOW: ["SUBFOLDER_OPEN", "SCORE_UPDATE"],
  SCORE_UPDATE: ["WORKSPACE_IDLE", "LAB_TRANSITION", "EXPORT", "CROWDFUNDING"],
  LAB_TRANSITION: ["WORKSPACE_IDLE"],
  EXPORT: ["WORKSPACE_IDLE"],
  CROWDFUNDING: ["WORKSPACE_IDLE"],
}

const schema = z.object({
  macroState: z.enum([
    "SYSTEM_READY","DASHBOARD","WORKSPACE_IDLE","SUBFOLDER_OPEN",
    "CARD_FLOW","EXPERT_FLOW","SCORE_UPDATE","LAB_TRANSITION","EXPORT","CROWDFUNDING",
  ]),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const dossier = await prisma.dossier.findFirst({ where: { id, ownerId: session.userId } })
  if (!dossier) return apiError("Dossier not found", 404)

  const allowed = VALID_TRANSITIONS[dossier.macroState as MacroState] ?? []
  if (!allowed.includes(result.data.macroState)) {
    return apiError(`Transition ${dossier.macroState} → ${result.data.macroState} not allowed`, 422)
  }

  const updated = await prisma.dossier.update({
    where: { id },
    data: { macroState: result.data.macroState },
  })

  await createAuditLog({
    userId: session.userId,
    dossierId: id,
    action: "MACRO_STATE_TRANSITION",
    entity: "Dossier",
    entityId: id,
    metadata: { from: dossier.macroState, to: result.data.macroState },
  })

  return apiSuccess(updated)
}
