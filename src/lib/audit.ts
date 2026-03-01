import { db as prisma } from "./db"

interface AuditParams {
  userId: string
  dossierId?: string
  action: string
  entity: string
  entityId: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      dossierId: params.dossierId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: (params.metadata ?? {}) as any,
    },
  })
}
