import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await verifySession()
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [user, signupsCount, activatedCount, missionsAggregate, history] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { referralCode: true },
      }),
      prisma.user.count({
        where: { referredById: session.userId },
      }),
      prisma.referralLog.count({
        where: { ambassadorId: session.userId, type: "ACTIVATED" },
      }),
      prisma.referralLog.aggregate({
        where: { ambassadorId: session.userId },
        _sum: { missions: true },
      }),
      prisma.referralLog.findMany({
        where: { ambassadorId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          missions: true,
          createdAt: true,
          user: { select: { firstName: true, email: true } },
        },
      }),
    ])

    return NextResponse.json({
      referralCode: user?.referralCode || null,
      stats: {
        signupsCount,
        activatedCount,
        totalMissions: missionsAggregate._sum.missions ?? 0,
      },
      history,
    })
  } catch (error) {
    console.error("GET /api/user/referral error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession()
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { referralCode } = body

    if (!referralCode || typeof referralCode !== "string" || referralCode.length < 3) {
      return NextResponse.json({ error: "Code invalide (min 3 caractères)." }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    })

    if (existing && existing.id !== session.userId) {
      return NextResponse.json({ error: "Ce lien est déjà pris." }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { referralCode },
      select: { referralCode: true },
    })

    return NextResponse.json({
      code: updatedUser.referralCode,
      message: "Lien personnalisé mis à jour avec succès.",
    })
  } catch (error: any) {
    console.error("POST /api/user/referral error:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ce lien est déjà pris." }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
