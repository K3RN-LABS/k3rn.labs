import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/validate"
import { db as prisma } from "@/lib/db"

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const [pending, running, failed] = await Promise.all([
    prisma.cardIngestionJob.findMany({ where: { status: "PENDING" } }),
    prisma.cardIngestionJob.findMany({ where: { status: "RUNNING" } }),
    prisma.cardIngestionJob.findMany({ where: { status: "FAILED" } }),
  ])

  // A job is considered stale if it has been RUNNING for more than 60s
  const staleThreshold = new Date(Date.now() - 60_000).toISOString()
  const stale = (running as Array<{ createdAt: string | Date }>).filter(
    (j) => new Date(j.createdAt) < new Date(staleThreshold)
  )

  const status =
    stale.length > 0
      ? "stale"
      : running.length > 0
        ? "running"
        : pending.length > 0
          ? "pending"
          : failed.length > 0
            ? "degraded"
            : "idle"

  return apiSuccess({
    status,
    counts: {
      pending: pending.length,
      running: running.length,
      stale: stale.length,
      failed: failed.length,
    },
  })
}
