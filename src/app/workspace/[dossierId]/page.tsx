"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useDossier } from "@/hooks/use-dossier"
import { useLab, useTransitionLab } from "@/hooks/use-lab"
import { usePoles } from "@/hooks/use-poles"
import { CanvasView } from "@/components/canvas/CanvasView"
import { Dock } from "@/components/workspace/Dock"
import { ExpertPanelManager } from "@/components/workspace/ExpertPanelManager"
import { KaelPanel } from "@/components/workspace/KaelPanel"
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar"
import { KaelCommandBar } from "@/components/poles/kael-command-bar"
import { PermissionGate } from "@/components/ui/permission-gate"
import { Button } from "@/components/ui/button"
import { useWorkspaceStore } from "@/store/workspace.store"
import { ChevronLeft, Download, DollarSign } from "lucide-react"
import { Separator } from "@/components/ui/separator"

/**
 * WorkspacePage — The Unified Cognitive Surface
 *
 * Architecture (per K3RN_TICKET_WORKSPACE_UNIFIED_COGNITIVE_SURFACE_V1):
 *
 * WorkspaceLayout
 *  ├── CanvasView        (graph neuronal — always mounted)
 *  ├── Dock              (floating navigation — search / filter / layout)
 *  ├── ExpertPanelManager (multi-chat simultané)
 *  └── KaelPanel         (orchestrateur — always accessible)
 *
 * Data source: GET /api/dossiers/[id]/graph (via useGraphData → ReactQuery)
 * Realtime: Supabase channel "graph" → invalidateQuery
 */
export default function WorkspacePage() {
    const { dossierId } = useParams<{ dossierId: string }>()
    const router = useRouter()
    const { data: dossier, isLoading } = useDossier(dossierId)
    const { data: labData } = useLab(dossierId)
    const { mutate: transitionLab, isPending: transitioning } = useTransitionLab()
    const { data: poles = [] } = usePoles()

    const {
        setActiveDossier,
        activeSubFolderId,
        openPoleChat,
        openKaelChat,
    } = useWorkspaceStore()

    const currentLab = labData?.labState?.currentLab as string | undefined

    useEffect(() => {
        setActiveDossier(dossierId)
        return () => setActiveDossier(null)
    }, [dossierId, setActiveDossier])

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

    return (
        <div className="h-dvh overflow-hidden bg-[#0a0a0a] flex flex-col">
            {/* Top header bar */}
            <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0 bg-black/40 backdrop-blur-sm z-30">
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                        onClick={() => router.push("/home")}
                    >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Dossiers
                    </Button>
                    <Separator orientation="vertical" className="h-4 opacity-30" />
                    <span className="text-sm font-semibold">{dossier.name}</span>
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
                        onSelectPole={(pole) => openPoleChat(pole.id, pole.code, pole.managerName)}
                    />
                    <PermissionGate dossierId={dossierId} permission="canCreateCrowdfunding">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => router.push(`/dossiers/${dossierId}/crowdfunding`)}
                        >
                            <DollarSign className="h-3.5 w-3.5 mr-1" />
                            Crowdfunding
                        </Button>
                    </PermissionGate>
                    <PermissionGate dossierId={dossierId} permission="canExport">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => router.push(`/dossiers/${dossierId}/export`)}
                        >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Export
                        </Button>
                    </PermissionGate>
                </div>
            </header>

            {/* Main body — sidebar + canvas + KAEL panel */}
            <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Collapsible sidebar */}
                <WorkspaceSidebar
                    dossierId={dossierId}
                    dossierName={dossier.name}
                    subFolders={subFolders}
                    labData={labData}
                    onTransitionLab={() => transitionLab(dossierId)}
                    transitioning={transitioning}
                />

                {/* Canvas — fills remaining space */}
                <div className="flex-1 relative overflow-hidden min-w-0">
                    <CanvasView
                        dossierId={dossierId}
                        subFolderId={activeSubFolderId ?? undefined}
                    />

                    {/* Dock — floating navigation */}
                    <Dock
                        dossierId={dossierId}
                        poles={poles}
                        subFolders={subFolders}
                        currentLab={currentLab}
                    />
                </div>

                {/* KAEL — permanent side panel (collapsible) */}
                <KaelPanel dossierId={dossierId} currentLab={currentLab} />
            </div>

            {/* Expert Panel Manager — floating multi-chat */}
            <ExpertPanelManager dossierId={dossierId} currentLab={currentLab} />
        </div>
    )
}
