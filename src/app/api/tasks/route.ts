import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { z } from "zod"

const createSchema = z.object({
  dossierId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["SUGGESTED", "PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"]).default("PLANNED"),
  origin: z.enum(["expert", "mission", "user", "kael"]).default("user"),
  originId: z.string().optional(),
  assignedPole: z.string().optional(),
  relatedDocuments: z.array(z.string()).default([]),
  relatedCards: z.array(z.string()).default([]),
  dueDate: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const dossierId = searchParams.get("dossierId")
  if (!dossierId) return apiError("dossierId required", 400)

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const status = searchParams.get("status")

  const tasks = await prisma.task.findMany({
    where: {
      dossierId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return apiSuccess(tasks)
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(createSchema, req)
  if ("error" in result) return result.error

  const { dossierId, title, description, status, origin, originId, assignedPole, relatedDocuments, relatedCards, dueDate } = result.data

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const task = await prisma.task.create({
    data: {
      dossierId,
      title,
      description: description ?? null,
      status,
      origin,
      originId: originId ?? null,
      assignedPole: assignedPole ?? null,
      relatedDocuments,
      relatedCards,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  })

  return apiSuccess(task, 201)
}
