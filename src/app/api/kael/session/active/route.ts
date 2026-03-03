import { NextRequest } from "next/server"
import { db as prisma } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(req: NextRequest) {
    try {
        const session = await verifySession()
        if (!session) return apiError("Unauthorized", 401)

        const { searchParams } = new URL(req.url)
        const dossierId = searchParams.get("dossierId")

        if (!dossierId) {
            return apiError("Missing dossierId", 400)
        }

        const activeKaelSession = await prisma.kaelSession.findFirst({
            where: {
                dossierId,
                status: "ACTIVE"
            },
            orderBy: {
                updatedAt: "desc"
            }
        })

        return apiSuccess({ session: activeKaelSession })
    } catch (error) {
        console.error("Error fetching active KAEL session:", error)
        return apiError("Internal server error", 500)
    }
}
