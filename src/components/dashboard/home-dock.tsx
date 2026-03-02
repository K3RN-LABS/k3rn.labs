"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, Tag, Layers, FlaskConical, X } from "lucide-react"
import { cn } from "@/lib/utils"

const LAB_OPTIONS = [
    { value: "DISCOVERY", label: "Discovery" },
    { value: "STRUCTURATION", label: "Structuration" },
    { value: "VALIDATION_MARCHE", label: "Market Validation" },
    { value: "DESIGN_PRODUIT", label: "Product Design" },
    { value: "ARCHITECTURE_TECHNIQUE", label: "Tech Architecture" },
    { value: "BUSINESS_FINANCE", label: "Business & Finance" },
]

function parseTagLabel(raw: string): { label: string; color: string } {
    const idx = raw.lastIndexOf(":")
    if (idx === -1) return { label: raw, color: "#8b5cf6" }
    return { label: raw.slice(0, idx), color: raw.slice(idx + 1) }
}

interface HomeDockProps {
    allTags: string[]
    filterTags: string[]
    onFilterTagsChange: (tags: string[]) => void
    filterLab: string | null
    onFilterLabChange: (lab: string | null) => void
    showArchived: boolean
    onShowArchivedChange: (v: boolean) => void
    onNewDossier: () => void
}

type OpenPanel = "tags" | "status" | "lab" | null

function DockButton({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode
    label: string
    active?: boolean
    onClick: () => void
}) {
    return (
        <div className="relative group/btn">
            <button
                onClick={onClick}
                className={cn(
                    "relative w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                    active
                        ? "bg-primary/20 text-primary"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                )}
            >
                {icon}
                {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
            </button>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[10px] bg-zinc-800 text-zinc-200 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                {label}
            </span>
        </div>
    )
}

export function HomeDock({
    allTags,
    filterTags,
    onFilterTagsChange,
    filterLab,
    onFilterLabChange,
    showArchived,
    onShowArchivedChange,
    onNewDossier,
}: HomeDockProps) {
    const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpenPanel(null)
        }
        document.addEventListener("mousedown", onClickOutside)
        return () => document.removeEventListener("mousedown", onClickOutside)
    }, [])

    function togglePanel(p: OpenPanel) {
        setOpenPanel((prev) => (prev === p ? null : p))
    }

    function toggleTag(tag: string) {
        onFilterTagsChange(
            filterTags.includes(tag) ? filterTags.filter((t) => t !== tag) : [...filterTags, tag]
        )
    }

    const hasActiveFilter = filterTags.length > 0 || filterLab !== null || showArchived

    return (
        <div ref={ref} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            {/* Panels */}
            {openPanel === "tags" && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl p-3">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Filtrer par tag</p>
                    {allTags.length === 0 ? (
                        <p className="text-xs text-zinc-600">Aucun tag créé</p>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            {allTags.map((t) => {
                                const { label, color } = parseTagLabel(t)
                                const active = filterTags.includes(t)
                                return (
                                    <button
                                        key={t}
                                        onClick={() => toggleTag(t)}
                                        className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all border", active ? "border-opacity-60" : "border-zinc-800 hover:border-zinc-700")}
                                        style={active ? { backgroundColor: color + "22", color, borderColor: color + "66" } : {}}
                                    >
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    {filterTags.length > 0 && (
                        <button onClick={() => onFilterTagsChange([])} className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                            <X className="h-2.5 w-2.5" /> Effacer
                        </button>
                    )}
                </div>
            )}

            {openPanel === "status" && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-44 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl p-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">Statut</p>
                    {[
                        { label: "Tous", value: false, isArchived: null },
                        { label: "Actifs", value: false, isArchived: false },
                        { label: "Archivés", value: true, isArchived: true },
                    ].map(({ label, value }) => (
                        <button
                            key={label}
                            onClick={() => { onShowArchivedChange(value); setOpenPanel(null) }}
                            className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all",
                                (label === "Archivés" ? showArchived : label === "Tous" ? !showArchived : !showArchived)
                                    ? "bg-primary/10 text-primary"
                                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {openPanel === "lab" && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-52 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl p-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">Phase / Lab</p>
                    {filterLab && (
                        <button
                            onClick={() => { onFilterLabChange(null); setOpenPanel(null) }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all flex items-center gap-1.5"
                        >
                            <X className="h-3 w-3" /> Tous les labs
                        </button>
                    )}
                    {LAB_OPTIONS.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => { onFilterLabChange(value); setOpenPanel(null) }}
                            className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all",
                                filterLab === value
                                    ? "bg-primary/10 text-primary"
                                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Dock bar */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-md shadow-2xl">
                <DockButton
                    icon={<Tag className="h-4 w-4" />}
                    label="Tags"
                    active={filterTags.length > 0 || openPanel === "tags"}
                    onClick={() => togglePanel("tags")}
                />

                <DockButton
                    icon={<Layers className="h-4 w-4" />}
                    label="Statut"
                    active={showArchived || openPanel === "status"}
                    onClick={() => togglePanel("status")}
                />

                <DockButton
                    icon={<FlaskConical className="h-4 w-4" />}
                    label="Lab"
                    active={filterLab !== null || openPanel === "lab"}
                    onClick={() => togglePanel("lab")}
                />

                {hasActiveFilter && (
                    <>
                        <div className="w-px h-5 bg-zinc-800 mx-0.5" />
                        <button
                            onClick={() => { onFilterTagsChange([]); onFilterLabChange(null); onShowArchivedChange(false) }}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 flex items-center gap-1 transition-colors"
                        >
                            <X className="h-3 w-3" /> Reset
                        </button>
                    </>
                )}

                <div className="w-px h-5 bg-zinc-800 mx-0.5" />

                <button
                    onClick={onNewDossier}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                    title="Nouveau dossier"
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
