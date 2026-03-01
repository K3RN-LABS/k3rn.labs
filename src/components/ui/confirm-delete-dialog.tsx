"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Archive, Trash2, Loader2 } from "lucide-react"
import { useState } from "react"

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  itemName?: string
  onArchive?: () => Promise<void> | void
  onDelete: () => Promise<void> | void
  archiveLabel?: string
  deleteLabel?: string
  hideArchive?: boolean
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Supprimer cet élément ?",
  description,
  itemName,
  onArchive,
  onDelete,
  archiveLabel = "Archiver",
  deleteLabel = "Supprimer définitivement",
  hideArchive = false,
}: ConfirmDeleteDialogProps) {
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleArchive() {
    if (!onArchive) return
    setArchiving(true)
    try {
      await onArchive()
      onOpenChange(false)
    } finally {
      setArchiving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete()
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {itemName && (
                <p>
                  Élément : <span className="font-medium text-foreground">{itemName}</span>
                </p>
              )}
              {description && <p>{description}</p>}
              {!hideArchive && onArchive && (
                <div className="mt-3 p-3 rounded-lg bg-muted/60 text-xs space-y-1">
                  <p>
                    <span className="font-medium">Archiver</span> — conserve l&apos;élément masqué, récupérable à tout moment.
                  </p>
                  <p>
                    <span className="font-medium">Supprimer</span> — suppression définitive, irréversible.
                  </p>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row flex-wrap gap-2">
          <Button variant="ghost" className="mr-auto" onClick={() => onOpenChange(false)} disabled={archiving || deleting}>
            Annuler
          </Button>
          {!hideArchive && onArchive && (
            <Button
              variant="outline"
              onClick={handleArchive}
              disabled={archiving || deleting}
              className="gap-2"
            >
              {archiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {archiveLabel}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={archiving || deleting}
            className="gap-2"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleteLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
