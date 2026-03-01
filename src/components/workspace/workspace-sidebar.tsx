"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace.store"
import { ScoreMeter } from "@/components/score/score-meter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronLeft, Folder, ArrowRight, Activity } from "lucide-react"
import type { SubFolderType } from "@prisma/client"

const SUBFOLDER_CONFIG: Record<string, { emoji: string; label: string; accent: string }> = {
    PRODUIT: { emoji: "📦", label: "Product", accent: "text-blue-400 border-blue-500/30 bg-blue-500/5" },
    MARCHE: { emoji: "📈", label: "Market", accent: "text-green-400 border-green-500/30 bg-green-500/5" },
    TECHNOLOGIE: { emoji: "⚙️", label: "Technology", accent: "text-violet-400 border-violet-500/30 bg-violet-500/5" },
    BUSINESS: { emoji: "💼", label: "Business", accent: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
}

const LAB_LABELS: Record<string, string> = {
    DISCOVERY: "Discovery",
    STRUCTURATION: "Structuration",
    VALIDATION_MARCHE: "Market Validation",
    DESIGN_PRODUIT: "Product Design",
    ARCHITECTURE_TECHNIQUE: "Tech Architecture",
    BUSINESS_FINANCE: "Business & Finance",
}

interface SubFolderItem {
    id: string
    type: string
    _count?: { cards: number }
}

interface WorkspaceSidebarProps {
    dossierId: string
    dossierName: string
    subFolders: SubFolderItem[]
    labData?: {
        labState?: { currentLab: string }
        nextLab?: string
        canTransition?: boolean
        missingCards?: string[]
        blockingExperts?: Array<{ name: string }>
    }
    onTransitionLab?: () => void
    transitioning?: boolean
}

export function WorkspaceSidebar({
    dossierId,
    dossierName,
    subFolders,
    labData,
    onTransitionLab,
    transitioning,
}: WorkspaceSidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const { activeSubFolderId, setActiveSubFolder } = useWorkspaceStore()
    const currentLab = labData?.labState?.currentLab

    return (
        <aside
            className={cn(
                "flex flex-col shrink-0 h-full border-r border-border/40 bg-background/80 backdrop-blur-sm transition-all duration-300 overflow-hidden",
                collapsed ? "w-14" : "w-64"
            )}
        >
            {/* Toggle */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-border/20 shrink-0">
                {!collapsed && (
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest truncate">
                        Workspace
                    </span>
                )}
                <button
                    onClick={() => setCollapsed((p) => !p)}
                    className={cn("p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground", collapsed && "mx-auto")}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            {/* Dossier name */}
            {!collapsed && (
                <div className="px-3 py-2.5 shrink-0">
                    <p className="text-sm font-bold truncate">{dossierName}</p>
                    {currentLab && (
                        <Badge variant="outline" className="text-[10px] mt-1 h-5">
                            {LAB_LABELS[currentLab] ?? currentLab.replace(/_/g, " ")}
                        </Badge>
                    )}
                </div>
            )}

            {/* Sub-folders */}
            <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5 min-h-0">
                {collapsed ? (
                    // Collapsed: only icons
                    <>
                        {/* All (no filter) */}
                        <button
                            onClick={() => setActiveSubFolder(null, null)}
                            className={cn(
                                "w-full flex items-center justify-center p-2 rounded-lg transition-all",
                                !activeSubFolderId ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                            )}
                            title="Tous les sous-dossiers"
                        >
                            <Activity className="h-4 w-4" />
                        </button>
                        {subFolders.map((sf) => {
                            const cfg = SUBFOLDER_CONFIG[sf.type] ?? { emoji: "📁", label: sf.type, accent: "" }
                            const isActive = activeSubFolderId === sf.id
                            return (
                                <button
                                    key={sf.id}
                                    onClick={() => setActiveSubFolder(isActive ? null : sf.id, sf.type as SubFolderType)}
                                    className={cn(
                                        "w-full flex items-center justify-center p-2 rounded-lg transition-all text-base",
                                        isActive ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted"
                                    )}
                                    title={cfg.label}
                                >
                                    {cfg.emoji}
                                </button>
                            )
                        })}
                    </>
                ) : (
                    <>
                        {/* All subfolders option */}
                        <button
                            onClick={() => setActiveSubFolder(null, null)}
                            className={cn(
                                "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all",
                                !activeSubFolderId
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <Activity className="h-3.5 w-3.5 shrink-0" />
                            <span>Vue globale</span>
                            {!activeSubFolderId && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>

                        {subFolders.map((sf) => {
                            const cfg = SUBFOLDER_CONFIG[sf.type] ?? { emoji: "📁", label: sf.type, accent: "" }
                            const isActive = activeSubFolderId === sf.id
                            return (
                                <button
                                    key={sf.id}
                                    onClick={() => setActiveSubFolder(isActive ? null : sf.id, sf.type as SubFolderType)}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-xs border transition-all",
                                        isActive
                                            ? cn("font-medium border", cfg.accent)
                                            : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <span className="text-sm shrink-0">{cfg.emoji}</span>
                                    <span className="flex-1 text-left font-medium">{cfg.label}</span>
                                    {sf._count?.cards != null && (
                                        <span className="text-[9px] font-mono opacity-50">{sf._count.cards}</span>
                                    )}
                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
                                </button>
                            )
                        })}
                    </>
                )}
            </div>

            {/* Score + LAB */}
            {!collapsed && (
                <div className="shrink-0 px-3 py-3 border-t border-border/20 space-y-3">
                    <ScoreMeter dossierId={dossierId} />

                    {labData?.nextLab && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prochaine phase</p>
                            <p className="text-xs font-medium">{LAB_LABELS[labData.nextLab] ?? labData.nextLab}</p>
                            {labData.missingCards && labData.missingCards.length > 0 && (
                                <p className="text-[10px] text-destructive">Manque : {labData.missingCards.join(", ")}</p>
                            )}
                            <Button
                                size="sm"
                                className="w-full text-xs h-7 rounded-lg"
                                disabled={!labData.canTransition || transitioning}
                                onClick={onTransitionLab}
                            >
                                {transitioning ? "Transition…" : "Avancer →"}
                                <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </aside>
    )
}
