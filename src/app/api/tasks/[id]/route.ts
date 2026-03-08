import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { z } from "zod"

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["SUGGESTED", "PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  assignedPole: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  relatedDocuments: z.array(z.string()).optional(),
  relatedCards: z.array(z.string()).optional(),
})

async function getTaskAndVerify(id: string, userId: string) {
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return null
  const dossier = await prisma.dossier.findUnique({ where: { id: task.dossierId } })
  if (!dossier || dossier.ownerId !== userId) return null
  return task
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const task = await getTaskAndVerify(params.id, session.userId)
  if (!task) return apiError("Not found", 404)

  const result = await validateBody(patchSchema, req)
  if ("error" in result) return result.error

  const { status, ...rest } = result.data

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(status ? {
        status,
        completedAt: status === "DONE" ? new Date() : (task as any).completedAt,
      } : {}),
      ...(rest.dueDate !== undefined ? { dueDate: rest.dueDate ? new Date(rest.dueDate) : null } : {}),
    },
  })

  return apiSuccess(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const task = await getTaskAndVerify(params.id, session.userId)
  if (!task) return apiError("Not found", 404)

  await prisma.task.delete({ where: { id: params.id } })

  return apiSuccess({ ok: true })
}
