import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

// runtime removed to use default Node.js environment

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')

        if (!code) {
            return new ImageResponse(
                (
                    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 32 }}>k3rn.labs</div>
                    </div>
                ),
                { width: 1200, height: 630 }
            )
        }

        // Fetch user basic info
        const user = await prisma.user.findFirst({
            where: { referralCode: code },
            select: { firstName: true, avatarUrl: true }
        })

        const userName = user?.firstName || 'Quelqu\'un'
        const avatar = user?.avatarUrl || null

        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#030303',
                        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(232, 64, 0, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
                        padding: '80px',
                        justifyContent: 'space-between',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h1 style={{ color: '#ffffff', fontSize: 64, fontWeight: 'bold', margin: 0, letterSpacing: '-0.02em' }}>
                            k3rn.labs
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px 24px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ color: '#E84000', fontSize: 24, fontWeight: 'bold' }}>Accès Alpha</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {avatar && (
                            <img
                                src={avatar}
                                alt={userName}
                                width={120}
                                height={120}
                                style={{ borderRadius: '60px', border: '4px solid rgba(255,255,255,0.1)' }}
                            />
                        )}

                        <p style={{
                            fontSize: 72,
                            fontWeight: 'bold',
                            color: '#ffffff',
                            lineHeight: 1.1,
                            margin: 0,
                            maxWidth: '900px'
                        }}>
                            {userName} vient de déverrouiller votre accès au Workspace.
                        </p>
                        <p style={{
                            fontSize: 32,
                            color: 'rgba(255,255,255,0.5)',
                            margin: 0,
                            maxWidth: '700px',
                            lineHeight: 1.4
                        }}>
                            Rejoignez l'écosystème cognitif exclusif développé pour les leaders de demain.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '2px', background: '#E84000' }} />
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 24, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Invitation Confidentielle
                        </span>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        )
    } catch (e: any) {
        console.error('[og/invite] Error:', e)
        return new Response(`Failed to generate image: ${e.message}`, { status: 500 })
    }
}
