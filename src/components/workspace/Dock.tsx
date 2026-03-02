"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace.store"
import type { PoleData } from "@/hooks/use-poles"
import { Sparkles, Search, X, Grid, Layers } from "lucide-react"

const POLE_CONFIG: Record<string, { gradient: string; emoji: string }> = {
    P01_STRATEGIE: { gradient: "from-violet-600 to-purple-700", emoji: "⚡" },
    P02_MARKET: { gradient: "from-blue-600 to-cyan-700", emoji: "🔍" },
    P03_PRODUIT_TECH: { gradient: "from-emerald-600 to-teal-700", emoji: "🏗️" },
    P04_FINANCE: { gradient: "from-amber-500 to-yellow-600", emoji: "📊" },
    P05_MARKETING: { gradient: "from-pink-600 to-rose-700", emoji: "🎯" },
    P06_LEGAL: { gradient: "from-slate-600 to-gray-700", emoji: "⚖️" },
    P07_TALENT_OPS: { gradient: "from-orange-600 to-red-700", emoji: "🚀" },
}

const SUBFOLDER_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
    PRODUIT: { color: "from-blue-600 to-blue-800", emoji: "📦", label: "Product" },
    MARCHE: { color: "from-green-600 to-emerald-800", emoji: "📈", label: "Market" },
    TECHNOLOGIE: { color: "from-violet-600 to-purple-800", emoji: "⚙️", label: "Technology" },
    BUSINESS: { color: "from-amber-600 to-orange-800", emoji: "💼", label: "Business" },
}

const CARD_TYPES = ["IDEA", "DECISION", "TASK", "ANALYSIS", "HYPOTHESIS", "PROBLEM", "VISION"]

interface SubFolderItem {
    id: string
    type: string
}

interface DockProps {
    dossierId: string
    poles: PoleData[]
    subFolders: SubFolderItem[]
    currentLab?: string
}

interface DockItemProps {
    emoji?: string
    label: string
    gradient?: string
    initials?: string
    onClick: () => void
    active?: boolean
    isPriority?: boolean
    isKael?: boolean
    tooltip: string
}

function DockItem({ emoji, label, gradient, initials, onClick, active, isPriority, isKael, tooltip }: DockItemProps) {
    const [hovered, setHovered] = useState(false)

    return (
        <div className="relative flex flex-col items-center group">
            {/* Tooltip */}
            <div className={cn(
                "absolute -top-10 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none transition-all duration-150",
                "bg-black/80 text-white backdrop-blur-sm border border-white/10",
                hovered ? "opacity-100 -translate-y-1" : "opacity-0 translate-y-0"
            )}>
                {tooltip}
                {isPriority && <span className="ml-1 text-[9px] text-primary">★</span>}
            </div>

            <button
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={cn(
                    "relative flex items-center justify-center rounded-2xl transition-all duration-200 select-none",
                    "shadow-lg hover:shadow-xl",
                    isKael
                        ? "w-12 h-12 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-2 ring-primary/30"
                        : "w-10 h-10",
                    active && !isKael && "ring-2 ring-white/40 scale-110",
                    hovered && !isKael && "scale-125",
                    hovered && isKael && "scale-110",
                    gradient ? `bg-gradient-to-br ${gradient}` : "bg-muted"
                )}
                title={label}
            >
                {initials ? (
                    <span className="text-xs font-black text-white">{initials}</span>
                ) : isKael ? (
                    <Sparkles className="h-5 w-5" />
                ) : (
                    <span className="text-base leading-none">{emoji}</span>
                )}

                {/* Active indicator */}
                {active && (
                    <span className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-white shadow-md" />
                )}
            </button>
        </div>
    )
}

/**
 * Dock — floating navigation bar for the Workspace.
 *
 * Features:
 * - SubFolder filter
 * - KAEL panel toggle
 * - Expert chats
 * - Graph search (filters canvas by node title)
 * - Card type filter
 * - Layout switch (auto / free)
 */
export function Dock({ dossierId: _dossierId, poles, subFolders, currentLab }: DockProps) {
    const {
        activeSubFolderId,
        setActiveSubFolder,
        openPoleChat,
        openChats,
        kaelPanelOpen,
        toggleKaelPanel,
        canvasSearch,
        setCanvasSearch,
        canvasFilterType,
        setCanvasFilterType,
        canvasLayout,
        setCanvasLayout,
    } = useWorkspaceStore()

    const [searchOpen, setSearchOpen] = useState(false)
    const [filterOpen, setFilterOpen] = useState(false)

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 pointer-events-auto flex flex-col items-center gap-2">
            {/* Search bar — expands above dock when active */}
            {searchOpen && (
                <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl",
                    "bg-black/70 backdrop-blur-xl border border-white/10 shadow-lg",
                    "animate-in slide-in-from-bottom-2 duration-150"
                )}>
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                        autoFocus
                        value={canvasSearch}
                        onChange={(e) => setCanvasSearch(e.target.value)}
                        placeholder="Rechercher dans le graph…"
                        className="bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground/50 w-52"
                    />
                    {canvasSearch && (
                        <button onClick={() => setCanvasSearch("")} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}

            {/* Filter chips — card type */}
            {filterOpen && (
                <div className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl flex-wrap max-w-md justify-center",
                    "bg-black/70 backdrop-blur-xl border border-white/10 shadow-lg",
                    "animate-in slide-in-from-bottom-2 duration-150"
                )}>
                    <button
                        onClick={() => setCanvasFilterType(null)}
                        className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
                            !canvasFilterType
                                ? "bg-primary text-primary-foreground"
                                : "bg-white/10 text-muted-foreground hover:bg-white/20"
                        )}
                    >
                        Tous
                    </button>
                    {CARD_TYPES.map((t) => (
                        <button
                            key={t}
                            onClick={() => setCanvasFilterType(canvasFilterType === t ? null : t)}
                            className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
                                canvasFilterType === t
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-white/10 text-muted-foreground hover:bg-white/20"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            )}

            {/* Main dock bar */}
            <div className={cn(
                "flex items-end gap-2 px-4 py-3 rounded-2xl",
                "bg-black/60 backdrop-blur-xl border border-white/10",
                "shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
            )}>
                {/* Sub-folders */}
                {subFolders.length > 0 && (
                    <>
                        {subFolders.map((sf) => {
                            const cfg = SUBFOLDER_CONFIG[sf.type] ?? { color: "from-gray-600 to-gray-800", emoji: "📁", label: sf.type }
                            const isActive = activeSubFolderId === sf.id
                            return (
                                <DockItem
                                    key={sf.id}
                                    emoji={cfg.emoji}
                                    gradient={cfg.color}
                                    label={cfg.label}
                                    onClick={() => {
                                        if (isActive) setActiveSubFolder(null, null)
                                        else setActiveSubFolder(sf.id, sf.type as never)
                                    }}
                                    active={isActive}
                                    tooltip={cfg.label}
                                />
                            )
                        })}
                        <div className="w-px h-8 bg-white/15 mx-1 self-center" />
                    </>
                )}

                {/* KAEL — always present */}
                <DockItem
                    label="KAEL"
                    isKael
                    onClick={toggleKaelPanel}
                    active={kaelPanelOpen}
                    tooltip="KAEL — Orchestrateur"
                />

                {/* Divider */}
                {poles.length > 0 && (
                    <div className="w-px h-8 bg-white/15 mx-1 self-center" />
                )}

                {/* Experts */}
                {poles.map((pole) => {
                    const cfg = POLE_CONFIG[pole.code] ?? { gradient: "from-gray-600 to-gray-800", emoji: "🤖" }
                    const isPriority = currentLab && (pole.activePriorityLabs as string[]).includes(currentLab)
                    const isOpen = openChats.some((c) => c.key === `pole-${pole.id}` && !c.minimized)
                    return (
                        <DockItem
                            key={pole.id}
                            initials={pole.managerName.slice(0, 2)}
                            gradient={cfg.gradient}
                            label={pole.managerName}
                            onClick={() => openPoleChat(pole.id, pole.code, pole.managerName)}
                            active={isOpen}
                            isPriority={!!isPriority}
                            tooltip={pole.managerName}
                        />
                    )
                })}

                {/* Divider before tools */}
                <div className="w-px h-8 bg-white/15 mx-1 self-center" />

                {/* Search toggle */}
                <DockItem
                    label="Recherche"
                    onClick={() => setSearchOpen((s) => !s)}
                    tooltip="Rechercher dans le graph"
                    gradient={searchOpen || canvasSearch ? "from-primary to-primary/70" : "from-slate-600 to-slate-800"}
                    emoji="🔍"
                    active={searchOpen || !!canvasSearch}
                />

                {/* Filter toggle */}
                <DockItem
                    label="Filtrer"
                    onClick={() => setFilterOpen((s) => !s)}
                    tooltip="Filtrer par type de carte"
                    gradient={filterOpen || canvasFilterType ? "from-primary to-primary/70" : "from-slate-600 to-slate-800"}
                    emoji="🏷️"
                    active={filterOpen || !!canvasFilterType}
                />

                {/* Layout switch */}
                <div className="relative flex flex-col items-center">
                    <button
                        onClick={() => setCanvasLayout(canvasLayout === "auto" ? "free" : "auto")}
                        className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110",
                            canvasLayout === "free"
                                ? "bg-gradient-to-br from-primary to-primary/70 ring-2 ring-primary/30"
                                : "bg-gradient-to-br from-slate-600 to-slate-800"
                        )}
                        title={canvasLayout === "auto" ? "Passer en mode libre" : "Passer en mode auto"}
                    >
                        {canvasLayout === "auto" ? (
                            <Grid className="h-4 w-4 text-white" />
                        ) : (
                            <Layers className="h-4 w-4 text-white" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Keep backward-compat alias
export { Dock as FloatingDock }
