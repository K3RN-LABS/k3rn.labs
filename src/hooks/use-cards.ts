import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export function useCards(subFolderId: string) {
  return useQuery({
    queryKey: ["cards", subFolderId],
    queryFn: async () => {
      const res = await fetch(`/api/subfolders/${subFolderId}/cards`)
      if (!res.ok) throw new Error("Failed to fetch cards")
      return res.json()
    },
    enabled: !!subFolderId,
  })
}

export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ subFolderId, type, title, content }: { subFolderId: string; type: string; title: string; content?: Record<string, unknown> }) => {
      const res = await fetch(`/api/subfolders/${subFolderId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, content }),
      })
      if (!res.ok) throw new Error("Failed to create card")
      return res.json()
    },
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ["cards", variables.subFolderId] }),
  })
}

export function useTransitionCardState() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ cardId, state, expertSessionId }: { cardId: string; state: string; expertSessionId?: string }) => {
      const res = await fetch(`/api/cards/${cardId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, expertSessionId }),
      })
      if (!res.ok) throw new Error("Failed to transition card state")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  })
}
