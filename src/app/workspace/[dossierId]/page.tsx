"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useDossier } from "@/hooks/use-dossier"
import { useLab, useTransitionLab } from "@/hooks/use-lab"
import { usePoles } from "@/hooks/use-poles"
import { CanvasView } from "@/components/canvas/CanvasView"
import { Dock } from "@/components/workspace/Dock"
import { FloatingWorkspaceInfo } from "@/components/workspace/FloatingWorkspaceInfo"
import { KaelSlideUpPanel, PoleSlideUpPanel } from "@/components/workspace/SlideUpPanel"
import { MobileOrchestrator } from "@/components/workspace/MobileOrchestrator"
import { KaelCommandBar } from "@/components/poles/kael-command-bar"
import { PermissionGate } from "@/components/ui/permission-gate"
import { Button } from "@/components/ui/button"
import { useWorkspaceStore } from "@/store/workspace.store"
import { ChevronLeft, Download, DollarSign } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import type { PoleData } from "@/hooks/use-poles"

/**
 * WorkspacePage — The Unified Cognitive Surface
 *
 * Layout:
 *  ├── Header bar (top)
 *  ├── WorkspaceSidebar (left, collapsible)
 *  ├── CanvasView (main, flex-1)
 *  │   └── Dock (floating bottom-center — glass liquid hub)
 *  └── SlideUpPanel (KAEL or Expert — modal above Dock)
 */
export default function WorkspacePage() {
    const { dossierId } = useParams<{ dossierId: string }>()
    const router = useRouter()
    const { data: dossier, isLoading } = useDossier(dossierId)
    const { data: labData } = useLab(dossierId)
    const { mutate: transitionLab, isPending: transitioning } = useTransitionLab()
    const { data: poles = [] } = usePoles()

    const { setActiveDossier, activeSubFolderId, openPoleChat } = useWorkspaceStore()

    // Active panel state — null | "kael" | pole id
    const [activePanel, setActivePanel] = useState<null | "kael" | string>(null)

    const currentLab = labData?.labState?.currentLab as string | undefined

    useEffect(() => {
        setActiveDossier(dossierId)
        return () => setActiveDossier(null)
    }, [dossierId, setActiveDossier])

    // Close panel on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setActivePanel(null) }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [])

    if (isLoading) {
        return (
            <div className="h-dvh bg-[#0a0a0a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <img
                        src="/logo-icon/logo.svg"
                        alt="k3rn"
                        width={48}
                        height={48}
                        className="animate-spin-double drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                    />
                    <p className="text-sm text-white/40 animate-pulse tracking-wide">Chargement du workspace…</p>
                </div>
            </div>
        )
    }

    if (!dossier) return <div className="p-8 text-destructive">Dossier not found</div>

    // Gate: redirect to onboarding if not completed
    const onboardingStep = (dossier.onboardingState as { step?: string } | null)?.step
    if (onboardingStep !== "COMPLETE") {
        router.replace(`/dossiers/${dossierId}/onboarding`)
        return null
    }

    const subFolders = dossier.subFolders ?? []

    // Find active pole data for panel
    const activePole = activePanel && activePanel !== "kael"
        ? poles.find((p: PoleData) => p.id === activePanel) ?? null
        : null

    function handleOpenKael() {
        setActivePanel((prev) => prev === "kael" ? null : "kael")
    }

    function handleOpenPole(poleId: string, poleCode: string, managerName: string) {
        openPoleChat(poleId, poleCode, managerName) // keep store in sync for Dock active state
        setActivePanel((prev) => prev === poleId ? null : poleId)
    }

    // ── Mobile surface (< md) ──
    const mobileView = (
        <div className="md:hidden h-dvh">
            <MobileOrchestrator
                dossierId={dossierId}
                currentLab={currentLab}
                dossierName={dossier.name}
            />
        </div>
    )

    return (
        <>
            {mobileView}
            <div className="hidden md:flex h-dvh overflow-hidden bg-[#0a0a0a] flex-col">
                {/* ── Header ── */}
                <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] shrink-0 bg-black/30 backdrop-blur-sm z-30">
                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/30 hover:text-white/70 h-7 px-2 text-xs"
                            onClick={() => router.push("/home")}
                        >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                            Dossiers
                        </Button>
                        <Separator orientation="vertical" className="h-4 opacity-20" />
                        <span className="text-sm font-semibold text-white/90">{dossier.name}</span>
                        {currentLab && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                                {currentLab.replace(/_/g, " ")}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <KaelCommandBar
                            dossierId={dossierId}
                            currentLab={currentLab}
                            onSelectPole={(pole) => handleOpenPole(pole.id, pole.code, pole.managerName)}
                        />
                        <PermissionGate dossierId={dossierId} permission="canCreateCrowdfunding">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-white/40 hover:text-white/80"
                                onClick={() => router.push(`/dossiers/${dossierId}/crowdfunding`)}>
                                <DollarSign className="h-3.5 w-3.5 mr-1" />
                                Crowdfunding
                            </Button>
                        </PermissionGate>
                        <PermissionGate dossierId={dossierId} permission="canExport">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-white/40 hover:text-white/80"
                                onClick={() => router.push(`/dossiers/${dossierId}/export`)}>
                                <Download className="h-3.5 w-3.5 mr-1" />
                                Export
                            </Button>
                        </PermissionGate>
                    </div>
                </header>

                {/* ── Body ── */}
                <div className="flex flex-1 overflow-hidden min-h-0 relative">
                    {/* Canvas */}
                    <CanvasView
                        dossierId={dossierId}
                        subFolderId={activeSubFolderId ?? undefined}
                    />

                    {/* Floating Workspace Info - Replaces Sidebar */}
                    <FloatingWorkspaceInfo
                        dossierId={dossierId}
                        labData={labData}
                        onTransitionLab={() => transitionLab(dossierId)}
                        transitioning={transitioning}
                    />

                    {/* Dock — glass liquid hub */}
                    <Dock
                        dossierId={dossierId}
                        poles={poles}
                        subFolders={subFolders}
                        currentLab={currentLab}
                        onOpenKael={handleOpenKael}
                        onOpenPole={handleOpenPole}
                    />
                </div>

                {/* ── Slide-Up Panels ── */}
                {activePanel === "kael" && (
                    <KaelSlideUpPanel
                        dossierId={dossierId}
                        currentLab={currentLab}
                        onClose={() => setActivePanel(null)}
                    />
                )}
                {activePole && (
                    <PoleSlideUpPanel
                        pole={activePole}
                        dossierId={dossierId}
                        currentLab={currentLab}
                        onClose={() => setActivePanel(null)}
                    />
                )}
            </div>
        </>
    )
}
