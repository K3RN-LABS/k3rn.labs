"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDossiers, useArchivedDossiers, useCreateDossier, useDeleteDossier, useArchiveDossier, useUnarchiveDossier } from "@/hooks/use-dossier"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Logo } from "@/components/ui/logo"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { Plus, Trash2, ArrowRight, ArchiveRestore } from "lucide-react"

const LAB_LABELS: Record<string, string> = {
    DISCOVERY: "Discovery",
    STRUCTURATION: "Structuration",
    VALIDATION_MARCHE: "Market Validation",
    DESIGN_PRODUIT: "Product Design",
    ARCHITECTURE_TECHNIQUE: "Tech Architecture",
    BUSINESS_FINANCE: "Business & Finance",
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
    const router = useRouter()

    const activeList = dossiers ?? []
    const archivedList = archivedDossiers ?? []
    const currentList = showArchived ? archivedList : activeList
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
        <div className="min-h-screen bg-background">
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
                            <Input
                                placeholder="Project name..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                required
                                autoFocus
                            />
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

                {!isCurrentLoading && currentList.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground">
                        {showArchived ? (
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

                {!isCurrentLoading && currentList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentList.map((d: { id: string; name: string; macroState: string; labState?: { currentLab: string } }) => (
                            <Card
                                key={d.id}
                                className={`group hover:shadow-lg hover:border-border/80 transition-all border border-border/50 ${showArchived ? "opacity-70 hover:opacity-100" : "cursor-pointer"}`}
                                onClick={() => !showArchived && router.push(`/dossiers/${d.id}`)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-base line-clamp-1">{d.name}</CardTitle>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                    {d.labState && (
                                        <Badge variant="outline" className="text-xs">
                                            {LAB_LABELS[d.labState.currentLab] ?? d.labState.currentLab}
                                        </Badge>
                                    )}
                                    {!showArchived && (
                                        <div className="flex items-center justify-end mt-4">
                                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

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
