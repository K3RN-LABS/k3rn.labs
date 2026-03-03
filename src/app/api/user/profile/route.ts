import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { z } from "zod"

const updateProfileSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    company: z.string().optional(),
    industry: z.string().optional(),
    goal: z.string().optional(),
    onboardingCompleted: z.boolean().optional(),
    preferences: z.record(z.string(), z.any()).optional(),
})

export async function PATCH(req: NextRequest) {
    const session = await verifySession()
    if (!session) return apiError("Unauthorized", 401)

    const result = await validateBody(updateProfileSchema, req)
    if ("error" in result) return result.error

    const user = await prisma.user.update({
        where: { id: session.userId },
        data: result.data,
    })

    return apiSuccess(user)
}

export async function GET() {
    const session = await verifySession()
    if (!session) return apiError("Unauthorized", 401)

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
    })

    if (!user) return apiError("User not found", 404)

    return apiSuccess(user)
}
