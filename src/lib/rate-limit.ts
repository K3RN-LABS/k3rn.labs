import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

let _limiters: { experts: Ratelimit; mutations: Ratelimit; export: Ratelimit } | null = null

function getLimiters() {
  if (!_limiters) {
    const r = getRedis()
    if (!r) return null
    _limiters = {
      experts: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: "rl:experts" }),
      mutations: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:mutations" }),
      export: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(2, "1 h"), prefix: "rl:export" }),
    }
  }
  return _limiters
}

export type RateLimitKey = "experts" | "mutations" | "export"

export async function checkRateLimit(key: RateLimitKey, identifier: string): Promise<{ success: boolean; remaining: number }> {
  const limiters = getLimiters()
  if (!limiters) {
    return { success: true, remaining: 999 }
  }
  const { success, remaining } = await limiters[key].limit(identifier)
  return { success, remaining }
}
