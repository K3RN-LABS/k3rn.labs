"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useWorkspaceStore } from "@/store/workspace.store"
import type { SubFolderType } from "@prisma/client"
import { useDossier } from "@/hooks/use-dossier"

/**
 * Legacy subfolder route — redirects to the unified workspace
 * and activates the correct subfolder filter in the store.
 */
export default function SubFolderRedirectPage() {
  const { id, subfolderId } = useParams<{ id: string; subfolderId: string }>()
  const router = useRouter()
  const { data: dossier } = useDossier(id)
  const { setActiveSubFolder } = useWorkspaceStore()

  useEffect(() => {
    if (!dossier) return

    const sf = (dossier.subFolders ?? []).find((s: { id: string; type: string }) => s.id === subfolderId)
    if (sf) {
      setActiveSubFolder(sf.id, sf.type as SubFolderType)
    }
    // Redirect back to unified workspace
    router.replace(`/dossiers/${id}`)
  }, [dossier, subfolderId, id, setActiveSubFolder, router])

  return (
    <div className="h-dvh bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="text-3xl animate-pulse">✦</div>
        <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    </div>
  )
}
