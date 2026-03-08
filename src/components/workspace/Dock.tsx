"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace.store"
import type { PoleData } from "@/hooks/use-poles"
import { normalizeManagerName, getExpertImage } from "@/lib/experts"
import { Sparkles, Search, LayoutGrid, Layers, X, Volume2, VolumeX, Plus, Target, CheckCircle2, User, Settings, MessageCircle, Zap } from "lucide-react"
import { useUserProfile } from "@/hooks/use-user-profile"
import { useNotificationSettings } from "@/hooks/use-notification-settings"
import { useMissionBudget } from "@/hooks/use-mission-budget"
import { CreditsModal } from "@/components/billing/CreditsModal"

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
    PRODUIT: { gradient: "from-blue-600 to-blue-800", emoji: "📦", label: "Produit" },
    MARCHE: { gradient: "from-green-600 to-emerald-800", emoji: "📈", label: "Marché" },
    TECHNOLOGIE: { gradient: "from-violet-600 to-purple-800", emoji: "⚙️", label: "Technologie" },
    BUSINESS: { gradient: "from-amber-600 to-orange-800", emoji: "💼", label: "Business" },
}

const CARD_TYPES = ["IDEA", "DECISION", "TASK", "ANALYSIS", "HYPOTHESIS", "PROBLEM", "VISION"]

// Labels d'affichage français (les valeurs DB restent en anglais)
const CARD_TYPE_LABELS: Record<string, string> = {
    IDEA: "Idée",
    DECISION: "Décision",
    TASK: "Tâche",
    ANALYSIS: "Analyse",
    HYPOTHESIS: "Hypothèse",
    PROBLEM: "Problème",
    VISION: "Vision",
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubFolderItem { id: string; type: string }

interface DockProps {
    dossierId: string
    poles: PoleData[]
    subFolders: SubFolderItem[]
    currentLab?: string
    onOpenKael: () => void
    onOpenPole: (poleId: string, poleCode: string, managerName: string) => void
    onPaletteChange?: (open: boolean) => void
    closePaletteRef?: React.MutableRefObject<(() => void) | null>
    onOpenTasks?: () => void
    taskCount?: number
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
    tab: PaletteTab
    onTabChange: (tab: PaletteTab) => void
    onClose: () => void
}

function CommandPalette({ subFolders, tab, onTabChange, onClose }: CommandPaletteProps) {
    const {
        canvasSearch, setCanvasSearch,
        canvasFilterType, setCanvasFilterType,
        activeSubFolderId, setActiveSubFolder,
        canvasLayout, setCanvasLayout,
        notifSoundEnabled, toggleNotifSound,
        minimapEnabled, toggleMinimap,
    } = useWorkspaceStore()
    const inputRef = useRef<HTMLInputElement>(null)
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

    // Refs so the keydown handler always reads fresh values (no stale closure)
    const focusedIndexRef = useRef<number | null>(null)
    const navLengthRef = useRef(0)
    const tabRef = useRef(tab)

    // Reset focus when switching tabs
    useEffect(() => {
        setFocusedIndex(null)
        focusedIndexRef.current = null
        tabRef.current = tab
    }, [tab])

    // Build flat list of navigable items depending on active tab
    const navItems = tab === "filters"
        ? [
            { onActivate: () => setCanvasFilterType(null) },
            ...CARD_TYPES.map(t => ({ onActivate: () => setCanvasFilterType(canvasFilterType === t ? null : t) })),
            { onActivate: () => setCanvasLayout("auto") },
            { onActivate: () => setCanvasLayout("free") },
            { onActivate: () => toggleNotifSound() },
            { onActivate: () => toggleMinimap() },
        ]
        : [
            { onActivate: () => setActiveSubFolder(null, null) },
            ...subFolders.map(sf => ({
                onActivate: () => activeSubFolderId === sf.id
                    ? setActiveSubFolder(null, null)
                    : setActiveSubFolder(sf.id, sf.type as never)
            })),
        ]

    // Keep refs in sync
    navLengthRef.current = navItems.length
    focusedIndexRef.current = focusedIndex
    tabRef.current = tab

    const navItemsRef = useRef(navItems)
    navItemsRef.current = navItems

    const move = (next: number | null) => {
        setFocusedIndex(next)
        focusedIndexRef.current = next
    }

    useEffect(() => {
        if (tab === "search") inputRef.current?.focus()
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") { onClose(); return }
            if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "l")) return

            const currentTab = tabRef.current
            const cur = focusedIndexRef.current
            const len = navLengthRef.current
            const inInput = currentTab === "search" && document.activeElement === inputRef.current

            if (inInput) {
                if (e.key === "ArrowDown") {
                    e.preventDefault()
                    move(0)
                    inputRef.current?.blur()
                }
                return
            }

            // ── Search tab ──
            if (currentTab === "search") {
                if (e.key === "ArrowRight") {
                    e.preventDefault()
                    move(cur === null ? 0 : Math.min(cur + 1, len - 1))
                } else if (e.key === "ArrowLeft") {
                    e.preventDefault()
                    move(cur === null ? len - 1 : Math.max(cur - 1, 0))
                } else if (e.key === "ArrowUp") {
                    e.preventDefault()
                    if (cur === null || cur === 0) {
                        move(null)
                        inputRef.current?.focus()
                    } else {
                        move(Math.max(cur - 1, 0))
                    }
                } else if (e.key === "Enter" && cur !== null) {
                    e.preventDefault()
                    navItemsRef.current[cur]?.onActivate()
                }
                return
            }

            // ── Filters tab ──
            // [0-7] types (horizontal), [8-9] layout (horizontal), [10-11] interface (vertical)
            if (currentTab === "filters") {
                const c = cur ?? 0

                if (e.key === "ArrowRight") {
                    e.preventDefault()
                    if (c <= 7) move(Math.min(c + 1, 7))
                    else if (c <= 9) move(Math.min(c + 1, 9))
                    // interface section: no horizontal movement
                } else if (e.key === "ArrowLeft") {
                    e.preventDefault()
                    if (c <= 7) move(Math.max(c - 1, 0))
                    else if (c <= 9) move(Math.max(c - 1, 8))
                } else if (e.key === "ArrowDown") {
                    e.preventDefault()
                    if (c <= 7) move(8)
                    else if (c <= 9) move(10)
                    else if (c === 10) move(11)
                } else if (e.key === "ArrowUp") {
                    e.preventDefault()
                    if (c === 11) move(10)
                    else if (c === 10) move(8)
                    else if (c <= 9 && c >= 8) move(7)
                    else if (c <= 7) move(Math.max(c - 1, 0))
                } else if (e.key === "Enter" && cur !== null) {
                    e.preventDefault()
                    navItemsRef.current[cur]?.onActivate()
                }
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                            onClick={() => onTabChange(t)}
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
                    <div className="ml-auto flex items-center gap-2 pb-2">
                        <span className="text-[10px] text-white/20 font-jakarta">↑↓←→ naviguer</span>
                        <span className="text-[10px] text-white/20 font-jakarta">↵ activer</span>
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
                                                !activeSubFolderId ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70",
                                                focusedIndex === 0 && "ring-1 ring-white/40"
                                            )}
                                        >
                                            ✦ Vue globale
                                        </button>
                                        {subFolders.map((sf, i) => {
                                            const cfg = SUBFOLDER_CONFIG[sf.type] ?? { emoji: "📁", label: sf.type }
                                            const isActive = activeSubFolderId === sf.id
                                            return (
                                                <button
                                                    key={sf.id}
                                                    onClick={() => isActive ? setActiveSubFolder(null, null) : setActiveSubFolder(sf.id, sf.type as never)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                        isActive ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70",
                                                        focusedIndex === i + 1 && "ring-1 ring-white/40"
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
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                            !canvasFilterType ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70",
                                            focusedIndex === 0 && "ring-1 ring-white/40"
                                        )}
                                    >
                                        Tous
                                    </button>
                                    {(CARD_TYPES as string[]).map((t, i) => (
                                        <button
                                            key={t}
                                            onClick={() => setCanvasFilterType(canvasFilterType === t ? null : t)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                canvasFilterType === t
                                                    ? "bg-primary/20 text-primary border border-primary/30"
                                                    : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70",
                                                focusedIndex === i + 1 && "ring-1 ring-white/40"
                                            )}
                                        >
                                            {CARD_TYPE_LABELS[t] ?? t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Layout */}
                            <div>
                                <p className="text-[10px] font-jakarta tracking-widest text-white/20 uppercase mb-2">Disposition</p>
                                <div className="flex gap-1.5">
                                    {(["auto", "free"] as const).map((l, i) => (
                                        <button
                                            key={l}
                                            onClick={() => setCanvasLayout(l)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                canvasLayout === l ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70",
                                                focusedIndex === 8 + i && "ring-1 ring-white/40"
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
                                                : "bg-white/[0.04] text-white/35 border border-white/[0.06] hover:bg-white/[0.07]",
                                            focusedIndex === 10 && "ring-1 ring-white/40"
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
                                                : "bg-white/[0.04] text-white/35 border border-white/[0.06] hover:bg-white/[0.07]",
                                            focusedIndex === 11 && "ring-1 ring-white/40"
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

export function Dock({ dossierId, poles, subFolders, currentLab, onOpenKael, onOpenPole, onPaletteChange, closePaletteRef, onOpenTasks, taskCount }: DockProps) {
    const { openChats, canvasSearch, canvasFilterType, activeSubFolderId, unreadCounts } = useWorkspaceStore()
    const [paletteOpen, setPaletteOpen] = useState(false)
    const onPaletteChangeRef = useRef(onPaletteChange)
    onPaletteChangeRef.current = onPaletteChange

    // Expose closePalette to parent
    useEffect(() => {
        if (closePaletteRef) closePaletteRef.current = () => { setPaletteOpen(false); onPaletteChangeRef.current?.(false) }
        return () => { if (closePaletteRef) closePaletteRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const [paletteTab, setPaletteTab] = useState<PaletteTab>("search")
    const [profileOpen, setProfileOpen] = useState(false)
    const profileRef = useRef<HTMLDivElement>(null)
    const [creditsModalOpen, setCreditsModalOpen] = useState(false)
    const router = useRouter()
    const { profile } = useUserProfile()
    const { settings: notifSettings } = useNotificationSettings()
    const { data: budget } = useMissionBudget()

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
        }
        document.addEventListener("mousedown", onClickOutside)
        return () => document.removeEventListener("mousedown", onClickOutside)
    }, [])

    function togglePalette(tab: PaletteTab) {
        if (paletteOpen && paletteTab === tab) {
            setPaletteOpen(false)
            onPaletteChangeRef.current?.(false)
        } else {
            setPaletteTab(tab)
            setPaletteOpen(true)
            onPaletteChangeRef.current?.(true)
        }
    }

    function closePalette() {
        setPaletteOpen(false)
        onPaletteChangeRef.current?.(false)
    }

    // ⌘K → Recherche | ⌘L → Filtres & Vue
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey)) return
            if (e.key === "k") {
                e.preventDefault()
                togglePalette("search")
            } else if (e.key === "l") {
                e.preventDefault()
                togglePalette("filters")
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paletteOpen, paletteTab])

    const hasActiveSearch = !!canvasSearch || !!activeSubFolderId
    const hasActiveFilters = !!canvasFilterType

    // Total unread across all chats
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

    return (
        <>
            {paletteOpen && (
                <CommandPalette
                    subFolders={subFolders}
                    tab={paletteTab}
                    onTabChange={setPaletteTab}
                    onClose={closePalette}
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
                            onClick={() => togglePalette("search")}
                            active={(paletteOpen && paletteTab === "search") || hasActiveSearch}
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
                            tooltip="Filtres & Vue  ⌘L"
                            onClick={() => togglePalette("filters")}
                            active={(paletteOpen && paletteTab === "filters") || hasActiveFilters}
                            className={cn(
                                "border",
                                (paletteOpen && paletteTab === "filters") || hasActiveFilters
                                    ? "bg-primary/20 border-primary/30 text-primary"
                                    : "bg-white/[0.06] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.09]"
                            )}
                        >
                            <Layers className="h-3.5 w-3.5" />
                        </DockButton>

                        {onOpenTasks && (
                            <DockButton
                                tooltip="Tâches"
                                onClick={onOpenTasks}
                                badge={taskCount && taskCount > 0 ? taskCount : undefined}
                                className="border bg-white/[0.06] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.09]"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </DockButton>
                        )}

                        <CreditsModal open={creditsModalOpen} onClose={() => setCreditsModalOpen(false)} currentBudget={budget?.total} />

                        <div ref={profileRef} className="relative flex flex-col items-center">
                            {profileOpen && (
                                <div className={cn(
                                    "absolute bottom-full mb-3 right-0 w-64 rounded-2xl p-4",
                                    "border border-white/[0.08] bg-black/70 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]",
                                    "animate-in slide-in-from-bottom-2 duration-200"
                                )}>
                                    {/* Avatar + nom */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/[0.08] shrink-0 flex items-center justify-center bg-white/[0.06]">
                                            {profile?.avatarUrl ? (
                                                <img src={profile.avatarUrl} alt="Profil" className="w-full h-full object-cover" />
                                            ) : profile?.firstName ? (
                                                <span className="text-[11px] font-bold font-jakarta text-white/50">
                                                    {profile.firstName[0]}{profile.lastName?.[0] ?? ""}
                                                </span>
                                            ) : (
                                                <User className="h-4 w-4 text-white/30" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-jakarta font-semibold text-white/90 truncate">
                                                {profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ""}`.trim() : "Mon profil"}
                                            </p>
                                            <p className="text-[11px] text-white/30 truncate">{profile?.email ?? ""}</p>
                                        </div>
                                    </div>

                                    {/* Budget missions — cliquable */}
                                    <button
                                        onClick={() => { setProfileOpen(false); setCreditsModalOpen(true) }}
                                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.10] p-3 mb-3 transition-all duration-150 group text-left"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-jakarta tracking-widest text-white/30 uppercase group-hover:text-white/50 transition-colors">Missions</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-jakarta font-bold text-white/80">
                                                    {budget?.total ?? "—"}
                                                    <span className="text-white/25 font-normal">
                                                        /{budget?.allowance ?? 5}
                                                    </span>
                                                </span>
                                                <Zap className="h-3 w-3 text-primary/60 group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>
                                        <div className="h-[2px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-700",
                                                    (budget?.total ?? 5) <= 2 ? "bg-red-400/70" :
                                                    (budget?.total ?? 5) <= 5 ? "bg-amber-400/70" : "bg-white/40"
                                                )}
                                                style={{
                                                    width: budget != null
                                                        ? `${Math.min(100, (budget.allowanceLeft / budget.allowance) * 100)}%`
                                                        : "0%"
                                                }}
                                            />
                                        </div>
                                        <p className="text-[9px] text-white/20 group-hover:text-white/35 mt-1.5 transition-colors">Recharger les missions →</p>
                                    </button>

                                    {/* Accès badge */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-jakarta tracking-widest text-white/30 uppercase">Accès</span>
                                        <span className={cn(
                                            "text-[10px] font-jakarta font-bold tracking-widest uppercase px-2 py-0.5 rounded-md",
                                            profile?.plan === "PRO"
                                                ? "bg-primary/15 text-primary border border-primary/30"
                                                : "bg-white/[0.06] text-white/40 border border-white/[0.08]"
                                        )}>
                                            {profile?.plan === "PRO" ? "Pro" : "Early Access"}
                                        </span>
                                    </div>

                                    {/* Telegram CTA si non configuré */}
                                    {notifSettings !== null && !notifSettings?.telegramChatId && (
                                        <button
                                            onClick={() => { router.push("/settings?tab=preferences"); setProfileOpen(false) }}
                                            className="w-full text-left px-3 py-2 mb-1 rounded-lg text-xs text-blue-400/80 hover:text-blue-300 hover:bg-blue-500/[0.08] border border-blue-500/15 hover:border-blue-500/30 transition-all flex items-center gap-2"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            Connecter Telegram
                                        </button>
                                    )}

                                    {/* Lien settings */}
                                    <button
                                        onClick={() => { router.push("/settings"); setProfileOpen(false) }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all flex items-center gap-2"
                                    >
                                        <Settings className="h-3.5 w-3.5" />
                                        Ouvrir les paramètres
                                    </button>
                                </div>
                            )}
                            <DockButton
                                tooltip="Mon profil"
                                onClick={() => setProfileOpen(p => !p)}
                                active={profileOpen}
                                className={cn(
                                    "border",
                                    profileOpen
                                        ? "bg-primary/20 border-primary/30 text-primary"
                                        : "bg-white/[0.06] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.09]"
                                )}
                            >
                                <User className="h-3.5 w-3.5" />
                            </DockButton>
                        </div>

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
