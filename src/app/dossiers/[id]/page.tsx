"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useDossier } from "@/hooks/use-dossier"
import { useLab, useTransitionLab } from "@/hooks/use-lab"
import { usePoles } from "@/hooks/use-poles"
import { CanvasView } from "@/components/canvas/CanvasView"
import { FloatingDock } from "@/components/workspace/floating-dock"
import { ChatTray } from "@/components/workspace/chat-tray"
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar"
import { KaelCommandBar } from "@/components/poles/kael-command-bar"
import { PermissionGate } from "@/components/ui/permission-gate"
import { Button } from "@/components/ui/button"
import { useWorkspaceStore } from "@/store/workspace.store"
import { ChevronLeft, Download, DollarSign } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: dossier, isLoading } = useDossier(id)
  const { data: labData } = useLab(id)
  const { mutate: transitionLab, isPending: transitioning } = useTransitionLab()
  const { data: poles = [] } = usePoles()

  const {
    setActiveDossier,
    activeSubFolderId,
    openPoleChat,
    openKaelChat,
  } = useWorkspaceStore()

  const currentLab = labData?.labState?.currentLab as string | undefined

  // Set active dossier in store on mount
  useEffect(() => {
    setActiveDossier(id)
    return () => setActiveDossier(null)
  }, [id, setActiveDossier])

  if (isLoading) {
    return (
      <div className="h-dvh bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="text-3xl animate-pulse">✦</div>
          <p className="text-sm text-muted-foreground animate-pulse">Chargement du workspace…</p>
        </div>
      </div>
    )
  }

  if (!dossier) return <div className="p-8 text-destructive">Dossier not found</div>

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
            onClick={() => router.push("/")}
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
          <KaelCommandBar dossierId={id} currentLab={currentLab} onSelectPole={(pole) => openPoleChat(pole.id, pole.code, pole.managerName)} />
          <PermissionGate dossierId={id} permission="canCreateCrowdfunding">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push(`/dossiers/${id}/crowdfunding`)}>
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Crowdfunding
            </Button>
          </PermissionGate>
          <PermissionGate dossierId={id} permission="canExport">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push(`/dossiers/${id}/export`)}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          </PermissionGate>
        </div>
      </header>

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Collapsible sidebar */}
        <WorkspaceSidebar
          dossierId={id}
          dossierName={dossier.name}
          subFolders={subFolders}
          labData={labData}
          onTransitionLab={() => transitionLab(id)}
          transitioning={transitioning}
        />

        {/* Canvas — fills remaining space */}
        <div className="flex-1 relative overflow-hidden min-w-0">
          <CanvasView
            dossierId={id}
            subFolderId={activeSubFolderId ?? undefined}
          />

          {/* Floating Dock */}
          <FloatingDock
            dossierId={id}
            poles={poles}
            subFolders={subFolders}
            currentLab={currentLab}
          />
        </div>
      </div>

      {/* Chat Tray — outside the flex layout, fixed positioning */}
      <ChatTray dossierId={id} currentLab={currentLab} />
    </div>
  )
}
