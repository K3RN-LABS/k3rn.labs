import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface PoleData {
  id: string
  code: string
  managerName: string
  managerSlug: string
  hashtagTriggers: string[]
  activePriorityLabs: string[]
  _count?: { experts: number; sessions: number }
}

export interface PoleSessionData {
  id: string
  poleId: string
  dossierId: string
  labAtCreation: string
  messages: Array<{ id: string; role: string; content: string; timestamp: string }>
  status: string
  n8nStatus?: string
  pole?: { managerName: string; code: string; managerSlug: string }
}

export function usePoles() {
  return useQuery<PoleData[]>({
    queryKey: ["poles"],
    queryFn: async () => {
      const res = await fetch("/api/poles")
      if (!res.ok) throw new Error("Failed to fetch poles")
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useStartPoleSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      poleId,
      dossierId,
      userMessage,
      currentLab,
    }: {
      poleId: string
      dossierId: string
      userMessage: string
      currentLab?: string
    }) => {
      const res = await fetch(`/api/poles/${poleId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId, userMessage, currentLab: currentLab ?? "DISCOVERY" }),
      })
      if (!res.ok) throw new Error("Failed to start session")
      return res.json() as Promise<{ session: PoleSessionData; pole: PoleData }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["poles"] })
    },
  })
}

export function useSendPoleMessage() {
  return useMutation({
    mutationFn: async ({ sessionId, userMessage }: { sessionId: string; userMessage: string }) => {
      const res = await fetch(`/api/poles/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage }),
      })
      if (!res.ok) throw new Error("Failed to send message")
      return res.json() as Promise<{ session: PoleSessionData; managerResponse: unknown; n8nStatus: string }>
    },
  })
}

export function useKaelRoute() {
  return useMutation({
    mutationFn: async ({
      dossierId,
      message,
      history,
    }: {
      dossierId: string
      message: string
      history?: Array<{ role: string; content: string }>
    }) => {
      const res = await fetch("/api/kael", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId, message, history: history ?? [] }),
      })
      if (!res.ok) throw new Error("Failed to route")
      return res.json()
    },
  })
}
