import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Node, Edge } from "reactflow"

export function useGraphData(dossierId: string) {
  return useQuery({
    queryKey: ["graph", dossierId],
    queryFn: async () => {
      const res = await fetch(`/api/dossiers/${dossierId}/graph`)
      if (!res.ok) throw new Error("Failed to fetch graph")
      return res.json() as Promise<{
        cards: Array<{
          id: string
          title: string
          content: unknown
          cardType: string | null
          type: string | null
          state: string
          source: string
          poleCode: string | null
          lab: string | null
          createdAt: string
          subFolder?: { type: string } | null
        }>
        relations: Array<{
          id: string
          fromCardId: string
          toCardId: string
          type: string
          createdAt: string
        }>
      }>
    },
    enabled: !!dossierId,
  })
}

export function useCanvas(subFolderId: string) {
  return useQuery({
    queryKey: ["canvas", subFolderId],
    queryFn: async () => {
      const res = await fetch(`/api/subfolders/${subFolderId}/canvas`)
      if (!res.ok) throw new Error("Failed to fetch canvas")
      return res.json()
    },
    enabled: !!subFolderId,
  })
}

export function usePersistCanvas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ subFolderId, nodes, edges }: { subFolderId: string; nodes: Node[]; edges: Edge[] }) => {
      const res = await fetch(`/api/subfolders/${subFolderId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: nodes.map((n) => ({
            nodeId: n.id,
            type: n.type ?? "default",
            positionX: n.position.x,
            positionY: n.position.y,
            data: n.data,
          })),
          edges: edges.map((e) => ({
            edgeId: e.id,
            source: e.source,
            target: e.target,
            data: e.data ?? {},
          })),
        }),
      })
      if (!res.ok) throw new Error("Failed to persist canvas")
      return res.json()
    },
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ["canvas", variables.subFolderId] }),
  })
}
