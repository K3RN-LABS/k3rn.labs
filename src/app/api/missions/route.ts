import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { z } from "zod"

const schema = z.object({
    dossierId: z.string().min(1),
    title: z.string().min(1).max(255),
    goal: z.string().optional(),
})

export async function POST(req: NextRequest) {
    const session = await verifySession()
    if (!session) return apiError("Unauthorized", 401)

    const result = await validateBody(schema, req)
    if ("error" in result) return result.error
    const { dossierId, title, goal } = result.data

    const dossier = await prisma.dossier.findUnique({
        where: { id: dossierId }
    })

    if (!dossier || dossier.ownerId !== session.userId) {
        return apiError("Dossier not found or access denied", 404)
    }

    // Vérifier le budget de l'utilisateur
    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { missionBudget: true }
    })

    if (!user || user.missionBudget <= 0) {
        return apiError("Budget de missions insuffisant. Veuillez passer à une offre supérieure.", 403)
    }

    // Création de la mission et débit du budget en une transaction
    const mission = await prisma.$transaction(async (tx) => {
        // 1. Débiter le budget
        await tx.user.update({
            where: { id: session.userId },
            data: { missionBudget: { decrement: 1 } }
        })

        // 2. Créer la mission
        return await tx.mission.create({
            data: {
                dossierId,
                title,
                goal,
                status: "ACTIVE"
            }
        })
    })

    return apiSuccess(mission)
}

export async function GET(req: NextRequest) {
    const session = await verifySession()
    if (!session) return apiError("Unauthorized", 401)

    const dossierId = req.nextUrl.searchParams.get("dossierId")
    if (!dossierId) return apiError("dossierId is required", 400)

    const missions = await prisma.mission.findMany({
        where: {
            dossierId,
            dossier: { ownerId: session.userId }
        },
        orderBy: { createdAt: "desc" }
    })

    return apiSuccess(missions)
}
