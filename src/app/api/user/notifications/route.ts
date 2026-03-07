import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { z } from "zod"

const schema = z.object({
  missionProgressUpdates: z.boolean().optional(),
  telegramOnComplete: z.boolean().optional(),
  telegramChatId: z.string().nullable().optional(),
})

// UserNotificationSettings has userId as PK (no auto-generated id column)
// DbModel.create() always injects id: newId() which breaks this table → use supabaseAdmin directly

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { data, error } = await supabaseAdmin
    .from("UserNotificationSettings")
    .upsert(
      { userId: session.userId, missionProgressUpdates: true, telegramOnComplete: true },
      { onConflict: "userId", ignoreDuplicates: true }
    )
    .select()
    .single()

  if (error) return apiError("Failed to fetch notification settings", 500)

  return apiSuccess(data)
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const { data, error } = await supabaseAdmin
    .from("UserNotificationSettings")
    .upsert(
      { userId: session.userId, missionProgressUpdates: true, telegramOnComplete: true, ...result.data },
      { onConflict: "userId" }
    )
    .select()
    .single()

  if (error) return apiError("Failed to update notification settings", 500)

  return apiSuccess(data)
}
