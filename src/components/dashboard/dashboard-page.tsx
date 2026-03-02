"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDossiers, useArchivedDossiers, useCreateDossier, useDeleteDossier, useArchiveDossier, useUnarchiveDossier, useUpdateDossierTags } from "@/hooks/use-dossier"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Logo } from "@/components/ui/logo"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Plus, Trash2, ArrowRight, ArchiveRestore, Tag, X, Check } from "lucide-react"
import { HomeDock } from "@/components/dashboard/home-dock"
import { cn } from "@/lib/utils"

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
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: color + "22", color, border: `1px solid ${color}44` }}
        >
            {label}
            {onRemove && (
                <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="hover:opacity-70">
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </span>
    )
}

function TagEditor({ dossierId, tags, onClose }: { dossierId: string; tags: string[]; onClose: () => void }) {
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

    function removeTag(raw: string) {
        updateTags({ id: dossierId, tags: tags.filter((t) => t !== raw) })
    }

    return (
        <div
            ref={ref}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-1 z-50 w-56 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl p-3 space-y-2"
        >
            <div className="flex flex-wrap gap-1 min-h-[20px]">
                {tags.length === 0 && <span className="text-[10px] text-zinc-600">Aucun tag</span>}
                {tags.map((t) => (
                    <TagBadge key={t} raw={t} onRemove={() => removeTag(t)} />
                ))}
            </div>
            <div className="flex gap-1">
                <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
                    placeholder="Nouveau tag…"
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
                            New Dossier
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Dossier</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 mt-2">
                            <div className="space-y-2">
                                <Input
                                    placeholder="Project name..."
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
                                {creating ? "Creating..." : "Create Dossier"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Your Dossiers</h1>
                        <p className="text-muted-foreground mt-1">Each dossier is a structured innovation workspace</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse h-40 bg-muted rounded-xl" />
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
                                <p className="text-lg">No dossiers yet.</p>
                                <p className="text-sm mt-1">Create your first dossier to start your innovation journey.</p>
                            </>
                        )}
                    </div>
                )}

                {!isCurrentLoading && filteredList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredList.map((d) => (
                            <Card
                                key={d.id}
                                className={`group hover:shadow-lg hover:border-border/80 transition-all border border-border/50 relative ${showArchived ? "opacity-70 hover:opacity-100" : "cursor-pointer"}`}
                                onClick={() => !showArchived && router.push(`/dossiers/${d.id}`)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base line-clamp-1">{d.name}</CardTitle>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setTagEditorId(tagEditorId === d.id ? null : d.id) }}
                                                className="p-1 rounded hover:bg-primary/10 hover:text-primary"
                                                title="Tags"
                                            >
                                                <Tag className="h-3.5 w-3.5" />
                                            </button>
                                            {showArchived && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); unarchiveDossier(d.id) }}
                                                    className="p-1 rounded hover:bg-primary/10 hover:text-primary"
                                                    title="Restaurer"
                                                >
                                                    <ArchiveRestore className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: d.id, name: d.name }) }}
                                                className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <CardDescription className="text-xs uppercase tracking-wide">{d.macroState.replace(/_/g, " ")}</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-wrap gap-1">
                                            {(d.tags ?? []).map((t: string) => (
                                                <TagBadge key={t} raw={t} />
                                            ))}
                                            {d.labState && (
                                                <Badge variant="outline" className="text-xs">
                                                    {LAB_LABELS[d.labState.currentLab] ?? d.labState.currentLab}
                                                </Badge>
                                            )}
                                        </div>
                                        {!showArchived && (
                                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                                        )}
                                    </div>
                                    {tagEditorId === d.id && (
                                        <TagEditor
                                            dossierId={d.id}
                                            tags={d.tags ?? []}
                                            onClose={() => setTagEditorId(null)}
                                        />
                                    )}
                                </CardContent>
                            </Card>
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
