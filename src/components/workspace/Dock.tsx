"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace.store"
import type { PoleData } from "@/hooks/use-poles"
import { normalizeManagerName, getExpertImage } from "@/lib/experts"
import { Sparkles, Search, LayoutGrid, Layers, SlidersHorizontal, X, Volume2, VolumeX, Plus, Target, CheckCircle2, User } from "lucide-react"

// ─── Pole config ─────────────────────────────────────────────────────────────

export const POLE_CONFIG: Record<string, { gradient: string; glow: string; title: string }> = {
    P01_STRATEGIE: { gradient: "from-violet-600 to-purple-700", glow: "rgba(124,58,237,0.5)", title: "Directeur Stratégie & Innovation" },
    P02_MARKET: { gradient: "from-blue-600 to-cyan-700", glow: "rgba(37,99,235,0.5)", title: "Directrice Market & Intelligence" },
    P03_PRODUIT_TECH: { gradient: "from-emerald-600 to-teal-700", glow: "rgba(5,150,105,0.5)", title: "Architecte Produit & Tech" },
    P04_FINANCE: { gradient: "from-amber-500 to-yellow-600", glow: "rgba(217,119,6,0.5)", title: "Directrice Financière" },
    P05_MARKETING: { gradient: "from-pink-600 to-rose-700", glow: "rgba(219,39,119,0.5)", title: "Chief Marketing Officer" },
    P06_LEGAL: { gradient: "from-slate-500 to-gray-600", glow: "rgba(100,116,139,0.5)", title: "Conseiller Juridique" },
    P07_TALENT_OPS: { gradient: "from-orange-500 to-red-600", glow: "rgba(234,88,12,0.5)", title: "Directrice des Opérations" },
}

const SUBFOLDER_CONFIG: Record<string, { gradient: string; emoji: string; label: string }> = {
    PRODUIT: { gradient: "from-blue-600 to-blue-800", emoji: "📦", label: "Product" },
    MARCHE: { gradient: "from-green-600 to-emerald-800", emoji: "📈", label: "Market" },
    TECHNOLOGIE: { gradient: "from-violet-600 to-purple-800", emoji: "⚙️", label: "Technology" },
    BUSINESS: { gradient: "from-amber-600 to-orange-800", emoji: "💼", label: "Business" },
}

const CARD_TYPES = ["IDEA", "DECISION", "TASK", "ANALYSIS", "HYPOTHESIS", "PROBLEM", "VISION"]

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubFolderItem { id: string; type: string }

interface DockProps {
    dossierId: string
    poles: PoleData[]
    subFolders: SubFolderItem[]
    currentLab?: string
    onOpenKael: () => void
    onOpenPole: (poleId: string, poleCode: string, managerName: string) => void
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ label, priority, visible }: { label: string; priority?: boolean; visible: boolean }) {
    return (
        <div className={cn(
            "absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap pointer-events-none transition-all duration-150 z-10",
            "bg-black/90 text-white/90 backdrop-blur-sm border border-white/[0.08]",
            "shadow-[0_4px_12px_rgba(0,0,0,0.4)]",
            visible ? "opacity-100 -translate-y-1" : "opacity-0 translate-y-0"
        )}>
            {label}
            {priority && <span className="ml-1 text-[9px] text-primary">★</span>}
        </div>
    )
}

// ─── DockButton ───────────────────────────────────────────────────────────────

interface DockButtonProps {
    tooltip: string
    onClick: () => void
    active?: boolean
    priority?: boolean
    children: React.ReactNode
    className?: string
    glowColor?: string
    size?: "sm" | "md" | "lg"
    badge?: number // unread count
    style?: React.CSSProperties
}

function DockButton({ tooltip, onClick, active, priority, children, className, glowColor, size = "md", badge, style }: DockButtonProps) {
    const [hovered, setHovered] = useState(false)
    const sizeClass = size === "lg" ? "w-11 h-11" : size === "sm" ? "w-8 h-8" : "w-9 h-9"

    return (
        <div className="relative flex flex-col items-center">
            <Tooltip label={tooltip} priority={priority} visible={hovered} />
            <button
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={cn(
                    "relative flex items-center justify-center rounded-xl transition-all duration-200 select-none overflow-hidden",
                    sizeClass,
                    hovered ? "scale-110" : "scale-100",
                    className
                )}
                style={{
                    ...(active && glowColor ? { boxShadow: `0 0 12px ${glowColor}` } : {}),
                    ...style
                }}
            >
                {children}
                {/* Unread pastille */}
                {badge != null && badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary border-[1.5px] border-[#0a0a0a] shadow-[0_0_8px_rgba(var(--primary),0.8)] animate-in zoom-in duration-200" />
                )}
            </button>
        </div>
    )
}

// ─── Command Palette ──────────────────────────────────────────────────────────

type PaletteTab = "search" | "filters"

interface CommandPaletteProps {
    subFolders: SubFolderItem[]
    defaultTab?: PaletteTab
    onClose: () => void
}

function CommandPalette({ subFolders, defaultTab = "search", onClose }: CommandPaletteProps) {
    const {
        canvasSearch, setCanvasSearch,
        canvasFilterType, setCanvasFilterType,
        activeSubFolderId, setActiveSubFolder,
        canvasLayout, setCanvasLayout,
        notifSoundEnabled, toggleNotifSound,
        minimapEnabled, toggleMinimap,
    } = useWorkspaceStore()

    const [tab, setTab] = useState<PaletteTab>(defaultTab)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (tab === "search") inputRef.current?.focus()
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [tab, onClose])

    return (
        <>
            <div className="fixed inset-0 z-[55]" onClick={onClose} />
            <div className={cn(
                "fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[56] w-[520px]",
                "rounded-2xl border border-white/[0.08] bg-black/70 backdrop-blur-2xl",
                "shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]",
                "animate-in slide-in-from-bottom-3 duration-200",
            )}>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                {/* Tabs */}
                <div className="flex items-center gap-0 px-4 pt-3 pb-0 border-b border-white/[0.05]">
                    {([["search", "Recherche"], ["filters", "Filtres & Vue"]] as [PaletteTab, string][]).map(([t, label]) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "px-3 py-2 text-xs font-medium transition-all border-b-2 -mb-px",
                                tab === t
                                    ? "text-white/80 border-primary/60"
                                    : "text-white/25 border-transparent hover:text-white/50"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-1 pb-2">
                        <kbd className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded border border-white/[0.08]">ESC</kbd>
                        <button onClick={onClose} className="p-1 text-white/20 hover:text-white/50 transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* ── Search tab ── */}
                    {tab === "search" && (
                        <>
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] focus-within:border-primary/30 transition-colors">
                                <Search className="h-4 w-4 text-white/25 shrink-0" />
                                <input
                                    ref={inputRef}
                                    value={canvasSearch}
                                    onChange={(e) => setCanvasSearch(e.target.value)}
                                    placeholder="Rechercher dans le graph…"
                                    className="flex-1 bg-transparent text-sm outline-none text-white/90 placeholder:text-white/25"
                                />
                                {canvasSearch && (
                                    <button onClick={() => setCanvasSearch("")} className="text-white/30 hover:text-white/60 transition-colors">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Subfolders */}
                            {subFolders.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-jakarta tracking-widest text-white/20 uppercase mb-2">Navigation</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            onClick={() => setActiveSubFolder(null, null)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                !activeSubFolderId ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70"
                                            )}
                                        >
                                            ✦ Vue globale
                                        </button>
                                        {subFolders.map((sf) => {
                                            const cfg = SUBFOLDER_CONFIG[sf.type] ?? { emoji: "📁", label: sf.type }
                                            const isActive = activeSubFolderId === sf.id
                                            return (
                                                <button
                                                    key={sf.id}
                                                    onClick={() => isActive ? setActiveSubFolder(null, null) : setActiveSubFolder(sf.id, sf.type as never)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                        isActive ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70"
                                                    )}
                                                >
                                                    {cfg.emoji} {cfg.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Filters tab ── */}
                    {tab === "filters" && (
                        <>
                            {/* Card type filter */}
                            <div>
                                <p className="text-[10px] font-jakarta tracking-widest text-white/20 uppercase mb-2">Type de carte</p>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => setCanvasFilterType(null)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                            !canvasFilterType ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70"
                                        )}
                                    >
                                        Tous
                                    </button>
                                    {CARD_TYPES.map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setCanvasFilterType(canvasFilterType === t ? null : t)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                canvasFilterType === t
                                                    ? "bg-primary/20 text-primary border border-primary/30"
                                                    : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Layout */}
                            <div>
                                <p className="text-[10px] font-jakarta tracking-widest text-white/20 uppercase mb-2">Disposition</p>
                                <div className="flex gap-1.5">
                                    {(["auto", "free"] as const).map((l) => (
                                        <button
                                            key={l}
                                            onClick={() => setCanvasLayout(l)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                canvasLayout === l ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70"
                                            )}
                                        >
                                            {l === "auto" ? <LayoutGrid className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                                            {l === "auto" ? "Auto" : "Libre"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sound notifications */}
                            <div className="pt-3 mt-3 border-t border-white/[0.05]">
                                <p className="text-[10px] font-jakarta tracking-widest text-white/20 uppercase mb-2">Interface</p>
                                <div className="space-y-2">
                                    <button
                                        onClick={toggleNotifSound}
                                        className={cn(
                                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full",
                                            notifSoundEnabled
                                                ? "bg-primary/10 text-primary border border-primary/20"
                                                : "bg-white/[0.04] text-white/35 border border-white/[0.06] hover:bg-white/[0.07]"
                                        )}
                                    >
                                        {notifSoundEnabled
                                            ? <Volume2 className="h-3.5 w-3.5 shrink-0" />
                                            : <VolumeX className="h-3.5 w-3.5 shrink-0" />
                                        }
                                        <span>{notifSoundEnabled ? "Sons activés" : "Sons désactivés"}</span>
                                        <span className={cn(
                                            "ml-auto w-7 h-4 rounded-full transition-colors relative",
                                            notifSoundEnabled ? "bg-primary/60" : "bg-white/10"
                                        )}>
                                            <span className={cn(
                                                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                                                notifSoundEnabled ? "left-3.5" : "left-0.5"
                                            )} />
                                        </span>
                                    </button>

                                    <button
                                        onClick={toggleMinimap}
                                        className={cn(
                                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full",
                                            minimapEnabled
                                                ? "bg-primary/10 text-primary border border-primary/20"
                                                : "bg-white/[0.04] text-white/35 border border-white/[0.06] hover:bg-white/[0.07]"
                                        )}
                                    >
                                        <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                                        <span>{minimapEnabled ? "MiniMap activée" : "MiniMap masquée"}</span>
                                        <span className={cn(
                                            "ml-auto w-7 h-4 rounded-full transition-colors relative",
                                            minimapEnabled ? "bg-primary/60" : "bg-white/10"
                                        )}>
                                            <span className={cn(
                                                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                                                minimapEnabled ? "left-3.5" : "left-0.5"
                                            )} />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

// ─── Dock ─────────────────────────────────────────────────────────────────────

export function Dock({ dossierId, poles, subFolders, currentLab, onOpenKael, onOpenPole }: DockProps) {
    const { openChats, canvasSearch, canvasFilterType, activeSubFolderId, unreadCounts } = useWorkspaceStore()
    const [paletteOpen, setPaletteOpen] = useState(false)
    const [paletteTab, setPaletteTab] = useState<PaletteTab>("search")
    const router = useRouter()

    function openPalette(tab: PaletteTab) {
        setPaletteTab(tab)
        setPaletteOpen(true)
    }

    // ⌘K → search tab
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault()
                setPaletteTab("search")
                setPaletteOpen((s) => !s)
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [])

    const hasActiveSearch = !!canvasSearch || !!activeSubFolderId
    const hasActiveFilters = !!canvasFilterType

    // Total unread across all chats
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

    return (
        <>
            {paletteOpen && (
                <CommandPalette
                    subFolders={subFolders}
                    defaultTab={paletteTab}
                    onClose={() => setPaletteOpen(false)}
                />
            )}

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto">
                {/* Glass liquid pill */}
                <div className="relative flex items-center gap-1 px-3 py-2 rounded-2xl">
                    {/* Unified Background Layer (with clipping) */}
                    <div className={cn(
                        "absolute inset-0 rounded-2xl overflow-hidden pointer-events-none",
                        "border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl",
                        "shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)]",
                    )}>
                        {/* Shimmer */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.025] to-transparent" />
                        {/* Left edge glow */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
                    </div>

                    {/* Content Layer (no clipping) */}
                    <div className="flex items-center gap-1 relative z-10">
                        <DockButton
                            tooltip="Recherche  ⌘K"
                            onClick={() => openPalette("search")}
                            active={paletteOpen && paletteTab === "search" || hasActiveSearch}
                            className={cn(
                                "border",
                                (paletteOpen && paletteTab === "search") || hasActiveSearch
                                    ? "bg-primary/20 border-primary/30 text-primary"
                                    : "bg-white/[0.06] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.09]"
                            )}
                        >
                            <Search className="h-3.5 w-3.5" />
                        </DockButton>

                        <DockButton
                            tooltip="Filtres & Vue"
                            onClick={() => openPalette("filters")}
                            active={paletteOpen && paletteTab === "filters" || hasActiveFilters}
                            className={cn(
                                "border",
                                (paletteOpen && paletteTab === "filters") || hasActiveFilters
                                    ? "bg-primary/20 border-primary/30 text-primary"
                                    : "bg-white/[0.06] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.09]"
                            )}
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                        </DockButton>


                        <DockButton
                            tooltip="Paramètres"
                            onClick={() => router.push("/settings")}
                            className={cn(
                                "border",
                                "bg-white/[0.06] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.09]"
                            )}
                        >
                            <User className="h-3.5 w-3.5" />
                        </DockButton>

                        {/* Separator */}
                        <div className="w-px h-6 bg-white/[0.07] mx-1 shrink-0" />

                        {/* ── KAEL ── */}
                        <DockButton
                            tooltip="KAEL - Assistant"
                            onClick={onOpenKael}
                            active={openChats.some((c) => c.key === "kael" && !c.minimized)}
                            glowColor="hsl(var(--primary) / 0.4)"
                            size="lg"
                            badge={unreadCounts["kael"]}
                            className={cn(
                                "border transition-all p-0 group overflow-hidden bg-transparent rounded-xl",
                                openChats.some((c) => c.key === "kael")
                                    ? "bg-white/[0.05] border-white/20 text-white"
                                    : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.09] hover:text-white/80",
                                (unreadCounts["kael"] ?? 0) > 0 && "border-[1.5px]"
                            )}
                            style={
                                (unreadCounts["kael"] ?? 0) > 0
                                    ? { borderColor: "hsl(var(--primary))", boxShadow: "inset 0 0 10px hsl(var(--primary) / 0.6), 0 0 8px hsl(var(--primary) / 0.6)" }
                                    : undefined
                            }
                        >
                            <img
                                src="/images/experts/Kael.webp"
                                alt="KAEL"
                                className={cn(
                                    "w-full h-full object-cover transition-all duration-300 group-hover:scale-110",
                                    !openChats.some((c) => c.key === "kael") && "opacity-80 group-hover:opacity-100"
                                )}
                            />
                        </DockButton>

                        {/* Separator */}
                        {poles.length > 0 && (
                            <div className="w-px h-6 bg-white/[0.07] mx-1 shrink-0" />
                        )}

                        {/* ── Experts ── */}
                        {poles.map((pole) => {
                            const cfg = POLE_CONFIG[pole.code] ?? { gradient: "from-gray-600 to-gray-700", glow: "rgba(100,100,100,0.4)" }
                            const isPriority = currentLab && (pole.activePriorityLabs as string[]).includes(currentLab)
                            const chatKey = `pole-${pole.id}`
                            const isOpen = openChats.some((c) => c.key === chatKey)
                            const isExpanded = openChats.some((c) => c.key === chatKey && !c.minimized)
                            const unread = unreadCounts[chatKey] ?? 0

                            // Map manager name to image
                            const displayManagerName = normalizeManagerName(pole.managerName)
                            const imgSrc = getExpertImage(pole.managerName)
                            const tooltipText = cfg.title ? `${displayManagerName.toUpperCase()} - ${cfg.title}` : displayManagerName.toUpperCase()

                            return (
                                <DockButton
                                    key={pole.id}
                                    tooltip={tooltipText}
                                    onClick={() => onOpenPole(pole.id, pole.code, pole.managerName)}
                                    active={isExpanded}
                                    priority={!!isPriority}
                                    glowColor={cfg.glow}
                                    badge={unread}
                                    className={cn(
                                        "border transition-all p-0 group overflow-hidden bg-transparent rounded-xl",
                                        isOpen
                                            ? "bg-white/[0.05] border-white/20 text-white"
                                            : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.09] hover:text-white/80",
                                        (unread > 0) && "border-[1.5px]"
                                    )}
                                    style={unread > 0 ? { borderColor: cfg.glow, boxShadow: `inset 0 0 10px ${cfg.glow}, 0 0 8px ${cfg.glow}` } : undefined}
                                >
                                    <img
                                        src={imgSrc}
                                        alt={displayManagerName}
                                        className={cn(
                                            "w-full h-full object-cover transition-all duration-300 group-hover:scale-110",
                                            !isOpen && "opacity-80 group-hover:opacity-100"
                                        )}
                                        onError={(e) => {
                                            // Fallback to initials if image fails
                                            (e.target as any).style.display = 'none';
                                            (e.target as any).parentElement.innerHTML = `<span class="text-[11px] font-black">${displayManagerName.slice(0, 2).toUpperCase()}</span>`;
                                        }}
                                    />
                                </DockButton>
                            )
                        })}
                    </div>
                </div>
            </div>
        </>
    )
}

export { Dock as FloatingDock }
