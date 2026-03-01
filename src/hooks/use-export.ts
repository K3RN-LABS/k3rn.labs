import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export function useExport(dossierId: string) {
  return useQuery({
    queryKey: ["export", dossierId],
    queryFn: async () => {
      const res = await fetch(`/api/dossiers/${dossierId}/export`)
      if (!res.ok) throw new Error("Failed to fetch export state")
      return res.json()
    },
    enabled: !!dossierId,
  })
}

export function useGenerateExport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dossierId: string) => {
      const res = await fetch(`/api/dossiers/${dossierId}/export/generate`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Export generation failed")
      }
      return res.json()
    },
    onSuccess: (_data, dossierId) => qc.invalidateQueries({ queryKey: ["export", dossierId] }),
  })
}

export function useExportDownload() {
  return useMutation({
    mutationFn: async (dossierId: string) => {
      const res = await fetch(`/api/dossiers/${dossierId}/export/download`)
      if (!res.ok) throw new Error("Failed to get download URL")
      return res.json()
    },
  })
}
