import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { checkRateLimit } from "@/lib/rate-limit"
import { generateExport } from "@/lib/export-engine"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const rl = await checkRateLimit("export", session.userId)
  if (!rl.success) return apiError("Export rate limit exceeded (2/hour)", 429)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({ where: { id, ownerId: session.userId } })
  if (!dossier) return apiError("Dossier not found", 404)

  const latestScore = await prisma.scoreSnapshot.findFirst({
    where: { dossierId: id },
    orderBy: { createdAt: "desc" },
  })
  if ((latestScore?.globalScore ?? 0) <= 90) {
    return apiError("Export requires global score > 90", 403)
  }

  const existing = await prisma.exportRecord.findUnique({ where: { dossierId: id } })
  if (existing?.state === "GENERATING") {
    return apiError("Export already in progress", 422)
  }

  await prisma.exportRecord.upsert({
    where: { dossierId: id },
    create: { dossierId: id, state: "GENERATING" },
    update: { state: "GENERATING", storageUrl: null, generatedAt: null },
  })

  try {
    const storagePath = await generateExport(id)

    const record = await prisma.exportRecord.update({
      where: { dossierId: id },
      data: { state: "READY", storageUrl: storagePath, generatedAt: new Date() },
    })

    await createAuditLog({
      userId: session.userId,
      dossierId: id,
      action: "EXPORT_GENERATED",
      entity: "ExportRecord",
      entityId: record.id,
      metadata: { storagePath },
    })

    return apiSuccess(record)
  } catch (err) {
    await prisma.exportRecord.update({
      where: { dossierId: id },
      data: { state: "FAILED" },
    })
    return apiError(`Export failed: ${String(err)}`, 500)
  }
}
