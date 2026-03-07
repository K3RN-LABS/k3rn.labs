import { v4 as uuidv4 } from "uuid"
import { env } from "@/lib/env"

// ─── MCP Tool calling layer ────────────────────────────────────────────────
// K3RN → n8n MCP server → (Zapier | Supabase)
// n8n est le seul point de contact. Zapier n'est jamais appelé directement.

interface McpToolResult {
  ok: boolean
  [key: string]: unknown
}

async function callN8nTool(tool: string, payload: object): Promise<McpToolResult> {
  const apiUrl = process.env.N8N_API_URL
  const apiKey = process.env.N8N_API_KEY

  if (!apiUrl || !apiKey) {
    // Dev/test : log silencieux, pas d'erreur bloquante
    console.warn(`[n8n tool] ${tool} skipped — N8N_API_URL or N8N_API_KEY not configured`)
    return { ok: false, reason: "n8n_not_configured" }
  }

  const res = await fetch(`${apiUrl}/mcp-server/http`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: tool, arguments: payload },
      id: uuidv4(),
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw new Error(`n8n tool "${tool}" error: HTTP ${res.status}`)
  }

  const json = await res.json()
  // n8n MCP response: { result: { content: [...] } } ou { error: ... }
  if (json.error) {
    throw new Error(`n8n tool "${tool}" error: ${json.error.message ?? JSON.stringify(json.error)}`)
  }

  const content = json.result?.content?.[0]?.text
  try {
    return content ? (JSON.parse(content) as McpToolResult) : { ok: true }
  } catch {
    return { ok: true, raw: content }
  }
}

/**
 * Notifie un channel Slack via n8n → Zapier.
 * idempotency_key auto-généré pour éviter les doublons.
 */
export async function notifySlack(
  channel: string,
  message: string,
  level: "info" | "warn" | "alert" = "info"
): Promise<McpToolResult> {
  return callN8nTool("notify_slack", {
    channel,
    message,
    level,
    slack_webhook_url: process.env.SLACK_INCOMING_WEBHOOK_URL ?? null,
    idempotency_key: uuidv4(),
  })
}

/**
 * Envoie un email via n8n → Zapier Gmail.
 */
export async function sendEmail(
  to: string,
  subject: string,
  body_md: string,
  reply_to?: string
): Promise<McpToolResult> {
  return callN8nTool("send_email", {
    to,
    subject,
    body_md,
    ...(reply_to ? { reply_to } : {}),
    idempotency_key: uuidv4(),
  })
}

/**
 * Écrit un audit log via n8n → Supabase direct (pas de task Zapier).
 */
export async function logAuditN8n(
  dossierId: string,
  action: string,
  entity: string,
  metadata?: Record<string, unknown>
): Promise<McpToolResult> {
  return callN8nTool("log_audit", {
    dossierId,
    action,
    entity,
    metadata: metadata ?? {},
  })
}

/**
 * Retourne le budget tasks Zapier restant pour la journée.
 */
export async function getTaskBudget(): Promise<{
  used: number
  remaining: number
  reset_at: string
  ok: boolean
}> {
  const result = await callN8nTool("get_task_budget", {})
  return result as { used: number; remaining: number; reset_at: string; ok: boolean }
}

/**
 * Vérifie le statut d'une exécution n8n (wrapper MCP vs API directe).
 */
export async function getWorkflowStatusMcp(executionId: string): Promise<McpToolResult> {
  return callN8nTool("get_workflow_status", { executionId })
}

export interface N8nInvokePayload {
  poleCode: string
  managerName: string
  systemPrompt: string
  userMessage: string
  history?: Array<{ role: string; content: string }>
  projectMemory: string
  dossierId: string
  labContext: string
}

export interface N8nResult {
  executionId?: string
  status: "RUNNING" | "COMPLETED" | "FAILED" | "FALLBACK"
  messages: Array<{ role: "manager" | "user"; content: string }>
}

// Single entry point for all pole invocations — routes through KAEL GuichetUnique
const GUICHET_URL = env.N8N_GUICHET_URL

function getN8nConfig() {
  const apiUrl = process.env.N8N_API_URL
  const apiKey = process.env.N8N_API_KEY
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET
  return { apiUrl, apiKey, webhookSecret, available: !!(apiUrl && apiKey) }
}

async function invokeViaN8n(
  webhookUrl: string,
  payload: N8nInvokePayload,
  webhookSecret?: string
): Promise<{ executionId: string; directMessage?: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (webhookSecret) headers["X-N8N-Secret"] = webhookSecret

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) throw new Error(`n8n webhook error: ${res.status}`)
  const data = await res.json()
  return {
    executionId: data.executionId ?? data.id ?? "unknown",
    directMessage: typeof data.message === "string" ? data.message : undefined,
  }
}

async function getN8nExecutionStatus(executionId: string): Promise<{ status: string; output?: string }> {
  const { apiUrl, apiKey, available } = getN8nConfig()
  if (!available) return { status: "UNKNOWN" }

  const res = await fetch(`${apiUrl}/api/v1/executions/${executionId}`, {
    headers: { "X-N8N-API-KEY": apiKey! },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) return { status: "UNKNOWN" }
  const data = await res.json()

  const finished = data.finished ?? false
  const status = finished
    ? data.stoppedAt
      ? "COMPLETED"
      : "FAILED"
    : "RUNNING"

  const output = data.data?.resultData?.runData
    ? JSON.stringify(data.data.resultData.runData)
    : undefined

  return { status, output }
}

export async function invokeN8nPole(
  payload: N8nInvokePayload,
  _webhookUrl?: string | null
): Promise<N8nResult> {
  const { available, webhookSecret } = getN8nConfig()

  if (!available) {
    console.error("[n8n] N8N_API_URL or N8N_API_KEY not configured — execution blocked")
    return { status: "FAILED", messages: [] }
  }

  try {
    const { executionId, directMessage } = await invokeViaN8n(GUICHET_URL, payload, webhookSecret)
    if (directMessage) {
      // GuichetUnique responded synchronously — no polling needed
      return { executionId, status: "COMPLETED", messages: [{ role: "manager", content: directMessage }] }
    }
    return { executionId, status: "RUNNING", messages: [] }
  } catch (err) {
    console.error(`[n8n] GuichetUnique invocation failed for pole ${payload.poleCode}:`, err)
    return { status: "FAILED", messages: [] }
  }
}

// ─── LLM Proxy ──────────────────────────────────────────────────────────────
// Routes all LLM calls through n8n (K3RN__LLMProxy__v1) — no direct OpenAI

export interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string | Array<{ type: string;[key: string]: unknown }>
}

export async function callLLMProxy(
  messages: LLMMessage[],
  options: {
    model?: string
    maxTokens?: number
    responseFormat?: { type: "json_object" | "text" }
    timeoutMs?: number
    temperature?: number
  } = {}
): Promise<{ content: string }> {
  const proxyUrl = env.N8N_LLM_PROXY_URL
  if (!proxyUrl) throw new Error("N8N_LLM_PROXY_URL is not configured — check environment variables")
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(webhookSecret ? { "X-N8N-Secret": webhookSecret } : {}),
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-4o",
      messages,
      max_tokens: options.maxTokens ?? 1024,
      response_format: options.responseFormat ?? { type: "json_object" },
      temperature: options.temperature ?? 0.3,
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`LLM proxy HTTP ${res.status} — ${body.slice(0, 300)}`)
  }
  const data = (await res.json()) as { content?: string }
  return { content: data.content ?? "" }
}

export async function pollN8nExecution(executionId: string): Promise<{
  done: boolean
  status: string
  messages: Array<{ role: "manager"; content: string }>
}> {
  const { status, output } = await getN8nExecutionStatus(executionId)

  if (status === "RUNNING") return { done: false, status, messages: [] }

  const messages: Array<{ role: "manager"; content: string }> = []
  if (output) {
    try {
      const parsed = JSON.parse(output)
      const lastNode = Object.values(parsed).at(-1) as any
      const text = lastNode?.[0]?.data?.main?.[0]?.[0]?.json?.output
        ?? lastNode?.[0]?.data?.main?.[0]?.[0]?.json?.message
        ?? output
      messages.push({ role: "manager", content: typeof text === "string" ? text : JSON.stringify(text) })
    } catch {
      messages.push({ role: "manager", content: output })
    }
  }

  return { done: true, status, messages }
}
