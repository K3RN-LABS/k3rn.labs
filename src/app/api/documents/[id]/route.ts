import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { z } from "zod"

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  validatedAt: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

async function getDocumentAndVerify(id: string, userId: string) {
  const doc = await prisma.expertDocument.findUnique({ where: { id } })
  if (!doc) return null
  const dossier = await prisma.dossier.findUnique({ where: { id: doc.dossierId } })
  if (!dossier || dossier.ownerId !== userId) return null
  return doc
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const doc = await getDocumentAndVerify(params.id, session.userId)
  if (!doc) return apiError("Not found", 404)

  return apiSuccess(doc)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const doc = await getDocumentAndVerify(params.id, session.userId)
  if (!doc) return apiError("Not found", 404)

  const result = await validateBody(patchSchema, req)
  if ("error" in result) return result.error

  const updated = await prisma.expertDocument.update({
    where: { id: params.id },
    data: {
      ...(result.data.title ? { title: result.data.title } : {}),
      ...(result.data.validatedAt !== undefined ? { validatedAt: result.data.validatedAt ? new Date(result.data.validatedAt) : null } : {}),
      ...(result.data.metadata ? { metadata: { ...(doc.metadata as object), ...result.data.metadata } } : {}),
    },
  })

  return apiSuccess(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const doc = await getDocumentAndVerify(params.id, session.userId)
  if (!doc) return apiError("Not found", 404)

  await prisma.expertDocument.delete({ where: { id: params.id } })

  return apiSuccess({ ok: true })
}
