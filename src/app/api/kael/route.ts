import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { invokeKAEL, detectPoleRouting } from "@/lib/claude"
import { buildProjectMemory } from "@/lib/project-memory"
import { z } from "zod"

const schema = z.object({
  dossierId: z.string().min(1),
  message: z.string().min(1).max(4000),
  history: z.array(z.object({ role: z.string(), content: z.string() })).default([]),
})

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error
  const { dossierId, message, history } = result.data

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const projectMemory = await buildProjectMemory(dossierId)

  const kaelResponse = await invokeKAEL(
    dossier.name,
    history.map((m) => ({ ...m, id: crypto.randomUUID(), timestamp: new Date().toISOString() }) as any),
    message,
    projectMemory
  )

  if (kaelResponse.routedPole) {
    const pole = await prisma.pole.findFirst({
      where: { code: kaelResponse.routedPole as any },
    })
    return apiSuccess({ ...kaelResponse, routedPoleData: pole })
  }

  return apiSuccess(kaelResponse)
}
