import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export function useLab(dossierId: string) {
  return useQuery({
    queryKey: ["lab", dossierId],
    queryFn: async () => {
      const res = await fetch(`/api/dossiers/${dossierId}/lab`)
      if (!res.ok) throw new Error("Failed to fetch lab state")
      return res.json()
    },
    enabled: !!dossierId,
  })
}

export function useTransitionLab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dossierId: string) => {
      const res = await fetch(`/api/dossiers/${dossierId}/lab/transition`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Transition failed")
      }
      return res.json()
    },
    onSuccess: (_data, dossierId) => {
      qc.invalidateQueries({ queryKey: ["lab", dossierId] })
      qc.invalidateQueries({ queryKey: ["dossier", dossierId] })
      qc.invalidateQueries({ queryKey: ["permissions", dossierId] })
    },
  })
}
