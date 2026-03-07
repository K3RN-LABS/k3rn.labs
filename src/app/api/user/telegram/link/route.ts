import { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { Redis } from "@upstash/redis"
import { env } from "@/lib/env"
import { z } from "zod"

const schema = z.object({
  token: z.string().min(1),
  telegramChatId: z.string().min(1),
})

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

// Called by n8n when user types /link {token} in Telegram bot
// No auth session — webhook secret instead
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret")
  if (env.N8N_WEBHOOK_SECRET && secret !== env.N8N_WEBHOOK_SECRET) {
    return apiError("Forbidden", 403)
  }

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const { token, telegramChatId } = result.data
  const key = `telegram:link:${token}`

  const redis = getRedis()
  const userId = await redis.get<string>(key)

  if (!userId) {
    return apiError("Token invalide ou expiré", 400)
  }

  await redis.del(key)

  // UserNotificationSettings uses userId as PK — use supabaseAdmin upsert directly
  const { error } = await supabaseAdmin
    .from("UserNotificationSettings")
    .upsert(
      { userId, telegramChatId, missionProgressUpdates: true, telegramOnComplete: true },
      { onConflict: "userId" }
    )

  if (error) return apiError("Failed to link Telegram", 500)

  return apiSuccess({ ok: true, userId })
}
