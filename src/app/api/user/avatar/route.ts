import { NextRequest, NextResponse } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { uploadAvatar, deleteAvatar } from "@/lib/supabase-storage"
import { apiError, apiSuccess } from "@/lib/validate"

export async function POST(req: NextRequest) {
    try {
        const session = await verifySession()
        if (!session) return apiError("Unauthorized", 401)

        const formData = await req.formData()
        const file = formData.get("file") as File | null

        if (!file) return apiError("No file provided", 400)

        const buffer = Buffer.from(await file.arrayBuffer())

        // Upload to Supabase
        const publicUrl = await uploadAvatar(session.userId, buffer, file.type)

        // Update user in DB
        const user = await prisma.user.update({
            where: { id: session.userId },
            data: { avatarUrl: publicUrl },
        })

        return apiSuccess({ avatarUrl: user.avatarUrl })
    } catch (error: any) {
        console.error("Avatar upload error:", error)
        return apiError(error.message || "Failed to upload avatar", 500)
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await verifySession()
        if (!session) return apiError("Unauthorized", 401)

        // Delete from Supabase
        await deleteAvatar(session.userId)

        // Nullify in DB
        const user = await prisma.user.update({
            where: { id: session.userId },
            data: { avatarUrl: null },
        })

        return apiSuccess({ avatarUrl: null })
    } catch (error: any) {
        console.error("Avatar delete error:", error)
        return apiError(error.message || "Failed to delete avatar", 500)
    }
}
