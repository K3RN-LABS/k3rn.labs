"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace.store"
import type { PoleData } from "@/hooks/use-poles"
import { Sparkles, Search, Folder, X } from "lucide-react"

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

interface SubFolderItem {
    id: string
    type: string
}

interface FloatingDockProps {
    dossierId: string
    poles: PoleData[]
    subFolders: SubFolderItem[]
    currentLab?: string
    onSearch?: () => void
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

export function FloatingDock({ dossierId: _dossierId, poles, subFolders, currentLab, onSearch }: FloatingDockProps) {
    const {
        activeSubFolderId,
        setActiveSubFolder,
        openPoleChat,
        openKaelChat,
        openChats,
    } = useWorkspaceStore()

    const activeKael = openChats.some((c) => c.key === "kael" && !c.minimized)

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div className={cn(
                "flex items-end gap-2 px-4 py-3 rounded-2xl",
                "bg-black/60 backdrop-blur-xl border border-white/10",
                "shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
            )}>

                {/* Sub-folders section */}
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
                                        if (isActive) {
                                            setActiveSubFolder(null, null)
                                        } else {
                                            setActiveSubFolder(sf.id, sf.type as never)
                                        }
                                    }}
                                    active={isActive}
                                    tooltip={cfg.label}
                                />
                            )
                        })}

                        {/* Divider */}
                        <div className="w-px h-8 bg-white/15 mx-1 self-center" />
                    </>
                )}

                {/* KAEL — orchestrateur (toujours mis en avant) */}
                <DockItem
                    label="KAEL"
                    isKael
                    onClick={openKaelChat}
                    active={activeKael}
                    tooltip="KAEL — Orchestrateur"
                />

                {/* Divider */}
                {poles.length > 0 && (
                    <div className="w-px h-8 bg-white/15 mx-1 self-center" />
                )}

                {/* Pole experts */}
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

                {/* Search */}
                {onSearch && (
                    <>
                        <div className="w-px h-8 bg-white/15 mx-1 self-center" />
                        <DockItem
                            label="Recherche"
                            onClick={onSearch}
                            tooltip="Filtrer le canvas"
                            gradient="from-slate-600 to-slate-800"
                            emoji="🔍"
                        />
                    </>
                )}
            </div>
        </div>
    )
}
