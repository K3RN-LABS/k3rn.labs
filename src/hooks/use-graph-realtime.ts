"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { subscribeToChannel } from "@/lib/realtime"

/**
 * Subscribes to the Supabase Realtime "graph" channel for a dossier.
 * On any GRAPH_UPDATED broadcast, invalidates the ["graph", dossierId] query
 * so CanvasView re-fetches automatically.
 */
export function useGraphRealtime(dossierId: string) {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!dossierId) return

        const unsubscribe = subscribeToChannel(dossierId, "graph", () => {
            queryClient.invalidateQueries({ queryKey: ["graph", dossierId] })
        })

        return unsubscribe
    }, [dossierId, queryClient])
}
