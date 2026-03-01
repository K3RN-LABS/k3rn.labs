import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export function useCrowdfunding(dossierId: string) {
  return useQuery({
    queryKey: ["crowdfunding", dossierId],
    queryFn: async () => {
      const res = await fetch(`/api/dossiers/${dossierId}/crowdfunding`)
      if (!res.ok) throw new Error("Failed to fetch crowdfunding state")
      return res.json()
    },
    enabled: !!dossierId,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ dossierId, goal }: { dossierId: string; goal: number }) => {
      const res = await fetch(`/api/dossiers/${dossierId}/crowdfunding/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Campaign creation failed")
      }
      return res.json()
    },
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ["crowdfunding", variables.dossierId] }),
  })
}

export function useCloseCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, dossierId }: { campaignId: string; dossierId: string }) => {
      const res = await fetch(`/api/crowdfunding/${campaignId}/close`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to close campaign")
      return res.json()
    },
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ["crowdfunding", variables.dossierId] }),
  })
}
