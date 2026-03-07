import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/validate"
import { Redis } from "@upstash/redis"
import { randomBytes } from "node:crypto"

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

export async function POST() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const token = randomBytes(12).toString("hex") // 24-char hex token
  const key = `telegram:link:${token}`

  const redis = getRedis()
  // Store userId behind the token — TTL 15 minutes
  await redis.set(key, session.userId, { ex: 900 })

  return apiSuccess({ token })
}
