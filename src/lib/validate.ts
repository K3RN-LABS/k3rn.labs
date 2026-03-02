import { NextRequest, NextResponse } from "next/server"
import { z, ZodSchema } from "zod"

export async function validateBody<T>(
  schema: ZodSchema<T>,
  req: NextRequest
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      console.error("[validateBody] Zod validation failed:", JSON.stringify(fieldErrors))
      return {
        error: NextResponse.json(
          { error: "Validation error", details: fieldErrors },
          { status: 400 }
        ),
      }
    }
    return { data: result.data }
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    }
  }
}

export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}
