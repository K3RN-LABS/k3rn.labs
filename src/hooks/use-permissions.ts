import { useQuery } from "@tanstack/react-query"
import type { Permissions } from "@/lib/permissions"

export function usePermissions(dossierId: string) {
  return useQuery({
    queryKey: ["permissions", dossierId],
    queryFn: async (): Promise<Permissions> => {
      const res = await fetch(`/api/dossiers/${dossierId}/permissions`)
      if (!res.ok) throw new Error("Failed to fetch permissions")
      return res.json()
    },
    enabled: !!dossierId,
  })
}
