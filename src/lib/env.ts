import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().min(1),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().min(1).default("http://localhost:3000"),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("exports"),
  INGESTION_ENABLED: z.string().optional().default("true"),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success && process.env.NODE_ENV !== "test") {
  console.error("Invalid environment variables:", _env.error.flatten().fieldErrors)
}

export const env = _env.success ? _env.data : ({} as z.infer<typeof envSchema>)
