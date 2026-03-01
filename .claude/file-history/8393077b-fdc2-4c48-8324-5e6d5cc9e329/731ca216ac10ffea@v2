import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/validate"
import { getTaskBudget } from "@/lib/n8n"

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const configured = !!(process.env.N8N_API_URL && process.env.N8N_API_KEY)

  if (!configured) {
    return apiSuccess({
      status: "not_configured",
      n8nUrl: null,
      budget: null,
    })
  }

  // Ping n8n health
  let n8nReachable = false
  try {
    const res = await fetch(`${process.env.N8N_API_URL}/healthz`, {
      signal: AbortSignal.timeout(3000),
    })
    n8nReachable = res.ok
  } catch {
    n8nReachable = false
  }

  // Get task budget (Zapier circuit breaker state)
  let budget = null
  if (n8nReachable) {
    try {
      budget = await getTaskBudget()
    } catch {
      budget = null
    }
  }

  return apiSuccess({
    status: n8nReachable ? "ok" : "unreachable",
    n8nUrl: process.env.N8N_API_URL,
    budget,
  })
}
