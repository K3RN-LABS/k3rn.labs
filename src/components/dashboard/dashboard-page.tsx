"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDossiers, useArchivedDossiers, useCreateDossier, useDeleteDossier, useArchiveDossier, useUnarchiveDossier, useUpdateDossierTags, useRenameDossier } from "@/hooks/use-dossier"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Logo } from "@/components/ui/logo"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Plus, Trash2, ArrowRight, ArchiveRestore, Tag, X, Check, Pencil, MessageCircle } from "lucide-react"
import { HomeDock } from "@/components/dashboard/home-dock"
import { cn } from "@/lib/utils"
import { useNotificationSettings } from "@/hooks/use-notification-settings"

const LAB_LABELS: Record<string, string> = {
    DISCOVERY: "Discovery",
    STRUCTURATION: "Structuration",
    VALIDATION_MARCHE: "Market Validation",
    DESIGN_PRODUIT: "Product Design",
    ARCHITECTURE_TECHNIQUE: "Tech Architecture",
    BUSINESS_FINANCE: "Business & Finance",
}

const TAG_COLORS = [
    "#8b5cf6", // violet
    "#3b82f6", // bleu
    "#10b981", // vert
    "#f59e0b", // ambre
    "#ef4444", // rouge
    "#ec4899", // rose
    "#06b6d4", // cyan
    "#f97316", // orange
]

function parseTag(raw: string): { label: string; color: string } {
    const idx = raw.lastIndexOf(":")
    if (idx === -1) return { label: raw, color: "#8b5cf6" }
    return { label: raw.slice(0, idx), color: raw.slice(idx + 1) }
}

function TagBadge({ raw, onRemove }: { raw: string; onRemove?: () => void }) {
    const { label, color } = parseTag(raw)
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors"
            style={{ backgroundColor: color + "1a", color, border: `1px solid ${color}33` }}
        >
            {label}
            {onRemove && (
                <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="hover:opacity-70">
                    <X className="h-3 w-3" />
                </button>
            )}
        </span>
    )
}

function TagEditor({
    dossierId,
    tags,
    allTags,
    onClose,
}: {
    dossierId: string
    tags: string[]
    allTags: string[]
    onClose: () => void
}) {
    const { mutate: updateTags } = useUpdateDossierTags()
    const [label, setLabel] = useState("")
    const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener("mousedown", onClickOutside)
        return () => document.removeEventListener("mousedown", onClickOutside)
    }, [onClose])

    function addTag() {
        const t = label.trim()
        if (!t) return
        const newTag = `${t}:${selectedColor}`
        if (!tags.includes(newTag)) {
            updateTags({ id: dossierId, tags: [...tags, newTag] })
        }
        setLabel("")
    }

    function toggleExistingTag(raw: string) {
        if (tags.includes(raw)) {
            updateTags({ id: dossierId, tags: tags.filter((t) => t !== raw) })
        } else {
            updateTags({ id: dossierId, tags: [...tags, raw] })
        }
    }

    function removeTag(raw: string) {
        updateTags({ id: dossierId, tags: tags.filter((t) => t !== raw) })
    }

    // Tags from other dossiers not already on this one
    const suggestions = allTags.filter((t) => !tags.includes(t))

    return (
        <div
            ref={ref}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-1 z-50 w-60 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl p-3 space-y-2.5"
        >
            {/* Current tags on this dossier */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {tags.map((t) => (
                        <TagBadge key={t} raw={t} onRemove={() => removeTag(t)} />
                    ))}
                </div>
            )}

            {/* Suggestions from other dossiers */}
            {suggestions.length > 0 && (
                <div className="space-y-1">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">Tags existants</p>
                    <div className="flex flex-wrap gap-1">
                        {suggestions.map((t) => (
                            <button key={t} onClick={() => toggleExistingTag(t)}>
                                <TagBadge raw={t} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* New tag input */}
            <div className="space-y-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">Nouveau tag</p>
                <div className="flex gap-1">
                    <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
                        placeholder="Nom du tag…"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-primary/40"
                    />
                    <button
                        onClick={addTag}
                        disabled={!label.trim()}
                        className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-30"
                    >
                        <Check className="h-3 w-3" />
                    </button>
                </div>
                <div className="flex gap-1 flex-wrap">
                    {TAG_COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setSelectedColor(c)}
                            className={cn("w-4 h-4 rounded-full border-2 transition-all", selectedColor === c ? "border-white scale-110" : "border-transparent")}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── ProjectFolderCard ───────────────────────────────────────────────────────
//
// SHELL GEOMETRY — single container with clip-path:
//
// The main container uses border-radius + clip-path to form the folder silhouette.
// clip-path cuts a tab notch from the top-left corner:
//
//   0,TAB_H  ──  TAB_W,TAB_H  ──  TAB_W+SLOPE,0  ──  100%,0
//      |                                                  |
//   0,100%  ─────────────────────────────────────────  100%,100%
//
// A darker absolute div covers the tab area (top-left rectangle).
// The clip-path is applied to the background layer only — content is unclipped
// so popovers and focus rings are not affected.

// Tab geometry in px / %
const TAB_H = 28
const TAB_W = "27%"
const TAB_SLOPE = 13

const LAB_ACCENT: Record<string, string> = {
    DISCOVERY: "#6366f1",
    STRUCTURATION: "#3b82f6",
    VALIDATION_MARCHE: "#10b981",
    DESIGN_PRODUIT: "#06b6d4",
    ARCHITECTURE_TECHNIQUE: "#f59e0b",
    BUSINESS_FINANCE: "#f97316",
}

function ProjectFolderCard({
    dossier: d,
    showArchived,
    tagEditorId,
    allTags,
    onOpen,
    onTagEditor,
    onRestore,
    onDelete,
}: {
    dossier: DossierItem
    showArchived: boolean
    tagEditorId: string | null
    allTags: string[]
    onOpen: () => void
    onTagEditor: (id: string | null) => void
    onRestore: () => void
    onDelete: () => void
}) {
    const { mutate: rename } = useRenameDossier()
    const [renaming, setRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState(d.name)
    const renameInputRef = useRef<HTMLInputElement>(null)

    const labKey = d.labState?.currentLab ?? ""
    const labLabel = labKey ? LAB_LABELS[labKey] ?? labKey : "Dossier"
    const accent = LAB_ACCENT[labKey] ?? "#52525b"
    const tags = d.tags ?? []

    function startRename(e: React.MouseEvent) {
        e.stopPropagation()
        setRenameValue(d.name)
        setRenaming(true)
        setTimeout(() => renameInputRef.current?.select(), 0)
    }

    function commitRename() {
        const trimmed = renameValue.trim()
        if (trimmed && trimmed !== d.name) {
            rename({ id: d.id, name: trimmed })
        }
        setRenaming(false)
    }

    function cancelRename() {
        setRenameValue(d.name)
        setRenaming(false)
    }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`Ouvrir le dossier ${d.name}`}
            className={cn(
                "group select-none outline-none relative",
                "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[28px]",
                !showArchived ? "cursor-pointer" : "cursor-default opacity-40",
            )}
            onClick={!showArchived ? onOpen : undefined}
            onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !showArchived) {
                    e.preventDefault()
                    onOpen()
                }
            }}
        >
            <div className="relative pt-[28px]">
                {/* Body */}
                <div className="relative min-h-[170px] rounded-tr-[28px] rounded-b-[28px] bg-zinc-800/55 transition-colors duration-150 group-hover:bg-zinc-800/75 group-active:brightness-95 overflow-hidden" style={{ width: "90%" }}>
                    {/* Content */}
                    <div className="relative flex flex-col min-h-[170px] px-6 pt-5 pb-4">

                        {/* Nom + statut — groupés en haut */}
                        <div className="min-w-0">
                            {renaming ? (
                                <input
                                    ref={renameInputRef}
                                    value={renameValue}
                                    autoFocus
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={commitRename}
                                    onKeyDown={(e) => {
                                        e.stopPropagation()
                                        if (e.key === "Enter") commitRename()
                                        if (e.key === "Escape") cancelRename()
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full bg-transparent border-b border-zinc-600 outline-none text-[18px] font-semibold font-jakarta text-zinc-100 pb-0.5"
                                />
                            ) : (
                                <h3 className="font-jakarta font-semibold text-[18px] leading-snug text-zinc-200 group-hover:text-white transition-colors duration-150 break-words line-clamp-2">
                                    {d.name}
                                </h3>
                            )}
                            <p className="mt-1.5 text-[10px] font-medium tracking-widest uppercase text-zinc-500">
                                {d.macroState === "WORKSPACE_IDLE" ? "Actif" : d.macroState.replace(/_/g, " ")}
                            </p>
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Tags — juste au-dessus des boutons */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2.5">
                                {tags.slice(0, 3).map((t) => <TagBadge key={t} raw={t} />)}
                                {tags.length > 3 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-zinc-500 bg-zinc-800/80">
                                        +{tags.length - 3}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Bas : boutons (gauche) + flèche (droite) */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity duration-150 -ml-1.5">
                                {!showArchived && (
                                    <button
                                        onClick={startRename}
                                        className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
                                        title="Renommer"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onTagEditor(tagEditorId === d.id ? null : d.id) }}
                                    className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
                                    title="Tags"
                                >
                                    <Tag className="h-3.5 w-3.5" />
                                </button>
                                {showArchived && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRestore() }}
                                        className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
                                        title="Restaurer"
                                    >
                                        <ArchiveRestore className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete() }}
                                    className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Supprimer"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {!showArchived && (
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all duration-150" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab + diagonal connector — largeur adaptée au contenu du label */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-0 flex items-end"
                >
                    {/* Tab principal — s'élargit selon le label */}
                    <div
                        className="h-[28px] bg-zinc-800/95 transition-colors duration-150 group-hover:bg-zinc-800 rounded-tl-[18px] flex items-center gap-1.5 pl-6 pr-[35px]"
                        style={{ maxWidth: "75%" }}
                    >
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full opacity-80" style={{ backgroundColor: accent }} />
                        <span className="text-[8px] font-semibold tracking-[0.14em] uppercase text-zinc-400 group-hover:text-zinc-300 transition-colors duration-150 whitespace-nowrap">
                            {labLabel}
                        </span>
                    </div>
                    {/* Connecteur diagonal — collé juste après le tab */}
                    <div
                        className="shrink-0 h-[28px] bg-zinc-800/95 transition-colors duration-150 group-hover:bg-zinc-800"
                        style={{
                            width: `${TAB_SLOPE}px`,
                            clipPath: "polygon(0 0, 0 100%, 100% 100%)",
                        }}
                    />
                </div>
            </div>

            {/* Tag editor popover */}
            {tagEditorId === d.id && (
                <div className="absolute left-0 z-50" style={{ top: "calc(100% + 4px)" }} onClick={(e) => e.stopPropagation()}>
                    <TagEditor dossierId={d.id} tags={tags} allTags={allTags} onClose={() => onTagEditor(null)} />
                </div>
            )}
        </div>
    )
}

export default function DashboardPage() {
    const [showArchived, setShowArchived] = useState(false)
    const { data: dossiers, isLoading } = useDossiers()
    const { data: archivedDossiers, isLoading: loadingArchived } = useArchivedDossiers()
    const { mutateAsync: createDossier, isPending: creating } = useCreateDossier()
    const { mutateAsync: deleteDossier } = useDeleteDossier()
    const { mutateAsync: archiveDossier } = useArchiveDossier()
    const { mutateAsync: unarchiveDossier } = useUnarchiveDossier()
    const [newName, setNewName] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
    const [tagEditorId, setTagEditorId] = useState<string | null>(null)
    const [filterTags, setFilterTags] = useState<string[]>([])
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived">("all")
    const [filterLab, setFilterLab] = useState<string | null>(null)
    const router = useRouter()
    const { settings: notifSettings } = useNotificationSettings()
    const [telegramBannerDismissed, setTelegramBannerDismissed] = useState(false)

    // Onboarding redirect
    useEffect(() => {
        fetch("/api/user/profile")
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && !data.data.onboardingCompleted) {
                    router.replace("/auth/onboarding")
                }
            })
            .catch(() => { })
    }, [router])

    const activeList: DossierItem[] = dossiers ?? []
    const archivedList: DossierItem[] = archivedDossiers ?? []

    // Duplicate name warning
    const isDuplicate = useMemo(() => {
        if (!newName.trim()) return false
        return activeList.some((d) => d.name.trim().toLowerCase() === newName.trim().toLowerCase())
    }, [newName, activeList])

    // Collect all unique tags across all dossiers
    const allTags = useMemo(() => {
        const set = new Set<string>()
            ;[...activeList, ...archivedList].forEach((d) => (d.tags ?? []).forEach((t: string) => set.add(t)))
        return Array.from(set)
    }, [activeList, archivedList])

    // Apply filters
    const filteredList = useMemo(() => {
        let list = showArchived ? archivedList : activeList
        if (filterTags.length > 0) {
            list = list.filter((d) => filterTags.every((ft) => (d.tags ?? []).includes(ft)))
        }
        if (filterLab) {
            list = list.filter((d) => d.labState?.currentLab === filterLab)
        }
        return list
    }, [showArchived, activeList, archivedList, filterTags, filterLab])

    const isCurrentLoading = showArchived ? loadingArchived : isLoading

    function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!newName.trim()) return
        createDossier(newName.trim(), {
            onSuccess: (data) => {
                setNewName("")
                setDialogOpen(false)
                router.push(`/dossiers/${data.id}/onboarding`)
            },
        })
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            <header className="border-b px-6 py-4 flex items-center justify-between">
                <Logo size="sm" />
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4" />
                            Nouveau dossier
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer un nouveau dossier</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 mt-2">
                            <div className="space-y-2">
                                <Input
                                    placeholder="Nom du projet..."
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                    autoFocus
                                    className={isDuplicate ? "border-amber-500/60 focus-visible:ring-amber-500/30" : ""}
                                />
                                {isDuplicate && (
                                    <p className="text-xs text-amber-500 flex items-center gap-1.5">
                                        <span>⚠</span>
                                        Un dossier avec ce nom existe déjà. Tu peux quand même continuer.
                                    </p>
                                )}
                            </div>
                            <Button type="submit" className="w-full" disabled={creating}>
                                {creating ? "Création..." : "Créer le dossier"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                {/* Telegram setup banner */}
                {!telegramBannerDismissed && notifSettings !== null && !notifSettings?.telegramChatId && (
                    <div className={cn(
                        "mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl",
                        "border border-blue-500/20 bg-blue-500/[0.06] backdrop-blur-sm",
                    )}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/15 shrink-0">
                            <MessageCircle className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white/80">Connectez Telegram pour recevoir vos rapports de mission</p>
                            <p className="text-xs text-white/35 mt-0.5">Vos experts vous enverront leurs livrables directement sur Telegram.</p>
                        </div>
                        <button
                            onClick={() => router.push("/settings?tab=preferences")}
                            className="shrink-0 text-xs font-medium text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all whitespace-nowrap"
                        >
                            Configurer
                        </button>
                        <button
                            onClick={() => setTelegramBannerDismissed(true)}
                            className="shrink-0 text-white/20 hover:text-white/50 transition-colors"
                            title="Fermer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Vos dossiers</h1>
                        <p className="text-muted-foreground mt-1">Chaque dossier est un espace de travail d'innovation structuré</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-border/60 p-1 bg-muted/30">
                        <button
                            onClick={() => setShowArchived(false)}
                            className={`px-3 py-1.5 text-sm rounded-md transition-all ${!showArchived ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Actifs {activeList.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({activeList.length})</span>}
                        </button>
                        <button
                            onClick={() => setShowArchived(true)}
                            className={`px-3 py-1.5 text-sm rounded-md transition-all ${showArchived ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Archivés {archivedList.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({archivedList.length})</span>}
                        </button>
                    </div>
                </div>

                {isCurrentLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse relative pt-[28px]">
                                {/* Tab — même structure que le vrai : content-driven width */}
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-0 top-0 flex items-end"
                                >
                                    <div
                                        className="h-[28px] bg-zinc-800/95 rounded-tl-[18px] flex items-center gap-1.5 pl-6 pr-[35px]"
                                        style={{ maxWidth: "75%" }}
                                    >
                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                        <span className="h-1.5 w-14 rounded bg-zinc-700" />
                                    </div>
                                    <div
                                        className="shrink-0 h-[28px] bg-zinc-800/95"
                                        style={{ width: `${TAB_SLOPE}px`, clipPath: "polygon(0 0, 0 100%, 100% 100%)" }}
                                    />
                                </div>
                                {/* Body — même forme que la vraie carte */}
                                <div className="min-h-[170px] rounded-tr-[28px] rounded-b-[28px] bg-zinc-800/55" style={{ width: "90%" }}>
                                    <div className="flex flex-col min-h-[170px] px-6 pt-5 pb-4">
                                        <div className="h-[18px] w-2/3 bg-zinc-700/50 rounded-md mb-2" />
                                        <div className="h-2 w-1/4 bg-zinc-700/30 rounded-md" />
                                        <div className="flex-1" />
                                        <div className="h-2.5 w-1/3 bg-zinc-700/25 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isCurrentLoading && filteredList.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground">
                        {filterTags.length > 0 || filterLab ? (
                            <>
                                <p className="text-lg">Aucun dossier pour ces filtres.</p>
                                <button onClick={() => { setFilterTags([]); setFilterLab(null) }} className="text-sm mt-2 underline opacity-70 hover:opacity-100">
                                    Réinitialiser les filtres
                                </button>
                            </>
                        ) : showArchived ? (
                            <>
                                <p className="text-lg">Aucun dossier archivé.</p>
                                <p className="text-sm mt-1">Les dossiers archivés apparaîtront ici.</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg">Aucun dossier pour l'instant.</p>
                                <p className="text-sm mt-1">Créez votre premier dossier pour démarrer votre parcours d'innovation.</p>
                            </>
                        )}
                    </div>
                )}

                {!isCurrentLoading && filteredList.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredList.map((d) => (
                            <ProjectFolderCard
                                key={d.id}
                                dossier={d}
                                showArchived={showArchived}
                                tagEditorId={tagEditorId}
                                allTags={allTags}
                                onOpen={() => !showArchived && router.push(`/dossiers/${d.id}`)}
                                onTagEditor={(id) => setTagEditorId(id)}
                                onRestore={() => unarchiveDossier(d.id)}
                                onDelete={() => setDeleteTarget({ id: d.id, name: d.name })}
                            />
                        ))}
                    </div>
                )}
            </main>

            <HomeDock
                allTags={allTags}
                filterTags={filterTags}
                onFilterTagsChange={setFilterTags}
                filterLab={filterLab}
                onFilterLabChange={setFilterLab}
                showArchived={showArchived}
                onShowArchivedChange={setShowArchived}
                onNewDossier={() => setDialogOpen(true)}
            />

            <ConfirmDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
                title="Supprimer ce dossier ?"
                itemName={deleteTarget?.name}
                description={showArchived ? "Cette action est irréversible." : "Cette action est irréversible. Vous pouvez aussi archiver ce dossier pour le conserver masqué."}
                onArchive={showArchived ? undefined : async () => { if (deleteTarget) { await archiveDossier(deleteTarget.id); setDeleteTarget(null) } }}
                onDelete={async () => { if (deleteTarget) { await deleteDossier(deleteTarget.id); setDeleteTarget(null) } }}
            />
        </div>
    )
}

interface DossierItem {
    id: string
    name: string
    macroState: string
    tags?: string[]
    labState?: { currentLab: string }
}
