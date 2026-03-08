"use client"

import { useWorkspaceStore } from "@/store/workspace.store"
import { ForceGraph } from "./ForceGraph"

interface CanvasViewProps {
  dossierId: string
  subFolderId?: string | null
  onOpenCard?: (cardId: string) => void
  onOpenPole?: (poleCode: string) => void
}

// subFolderId → ViewMode mapping (kept for compatibility)
const SUBFOLDER_VIEW: Record<string, "PRODUIT" | "MARCHE" | "TECHNOLOGIE" | "BUSINESS"> = {
  PRODUIT: "PRODUIT",
  MARCHE: "MARCHE",
  TECHNOLOGIE: "TECHNOLOGIE",
  BUSINESS: "BUSINESS",
}

export function CanvasView({ dossierId, subFolderId, onOpenCard, onOpenPole }: CanvasViewProps) {
  const { canvasSearch, canvasFilterType } = useWorkspaceStore()

  // Derive viewMode from subFolderId if provided
  const viewMode = subFolderId
    ? (SUBFOLDER_VIEW[subFolderId] ?? "global")
    : "global"

  return (
    <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
      <ForceGraph
        dossierId={dossierId}
        viewMode={viewMode as any}
        filterType={canvasFilterType ?? null}
        searchQuery={canvasSearch}
        onOpenCard={onOpenCard}
        onOpenPole={onOpenPole}
      />
    </div>
  )
}
