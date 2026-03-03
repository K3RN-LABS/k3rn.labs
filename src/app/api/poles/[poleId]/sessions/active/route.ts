import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(req: NextRequest, { params }: { params: { poleId: string } }) {
    const session = await verifySession()
    if (!session) return apiError("Unauthorized", 401)

    const dossierId = req.nextUrl.searchParams.get("dossierId")
    if (!dossierId) return apiError("dossierId is required", 400)

    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
    if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

    const activeSession = await prisma.poleSession.findFirst({
        where: {
            poleId: params.poleId,
            dossierId,
            status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
    })

    return apiSuccess({ session: activeSession })
}
