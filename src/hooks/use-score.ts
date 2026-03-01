import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { subscribeToChannel } from "@/lib/realtime"

export function useScore(dossierId: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!dossierId) return
    return subscribeToChannel(dossierId, "score", () => {
      qc.invalidateQueries({ queryKey: ["score", dossierId] })
    })
  }, [dossierId, qc])

  return useQuery({
    queryKey: ["score", dossierId],
    queryFn: async () => {
      const res = await fetch(`/api/dossiers/${dossierId}/score`)
      if (!res.ok) throw new Error("Failed to fetch score")
      return res.json()
    },
    enabled: !!dossierId,
  })
}
