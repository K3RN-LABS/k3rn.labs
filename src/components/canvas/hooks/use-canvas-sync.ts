"use client"

import { useEffect, useCallback, useRef } from "react"
import { useCanvasStore } from "@/store/canvas.store"
import { usePersistCanvas } from "@/hooks/use-canvas"
import { subscribeToChannel } from "@/lib/realtime"
import { useQueryClient } from "@tanstack/react-query"

export function useCanvasSync(subFolderId: string, dossierId: string) {
  const { nodes, edges, isDirty, markClean } = useCanvasStore()
  const { mutate: persist } = usePersistCanvas()
  const qc = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return subscribeToChannel(dossierId, "canvas", () => {
      qc.invalidateQueries({ queryKey: ["canvas", subFolderId] })
    })
  }, [dossierId, subFolderId, qc])

  // --- Step 4: Listen to GRAPH_UPDATED to refetch the Graph data ---
  useEffect(() => {
    return subscribeToChannel(dossierId, "graph", () => {
      qc.invalidateQueries({ queryKey: ["graph", dossierId] })
    })
  }, [dossierId, qc])

  useEffect(() => {
    if (!isDirty) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persist({ subFolderId, nodes, edges })
      markClean()
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [isDirty, nodes, edges, subFolderId, persist, markClean])
}
