import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

async function fetchDossiers() {
  const res = await fetch("/api/dossiers")
  if (!res.ok) throw new Error("Failed to fetch dossiers")
  return res.json()
}

async function fetchDossier(id: string) {
  const res = await fetch(`/api/dossiers/${id}`)
  if (!res.ok) throw new Error("Failed to fetch dossier")
  return res.json()
}

async function createDossier(name: string) {
  const res = await fetch("/api/dossiers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error("Failed to create dossier")
  return res.json()
}

export function useDossiers() {
  return useQuery({ queryKey: ["dossiers"], queryFn: fetchDossiers })
}

export function useArchivedDossiers() {
  return useQuery({
    queryKey: ["dossiers", "archived"],
    queryFn: async () => {
      const res = await fetch("/api/dossiers?archived=true")
      if (!res.ok) throw new Error("Failed to fetch archived dossiers")
      return res.json()
    },
  })
}

export function useDossier(id: string) {
  return useQuery({
    queryKey: ["dossier", id],
    queryFn: () => fetchDossier(id),
    enabled: !!id,
  })
}

export function useCreateDossier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createDossier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dossiers"] }),
  })
}

export function useDeleteDossier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dossiers/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete dossier")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dossiers"] }),
  })
}

export function useArchiveDossier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dossiers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      })
      if (!res.ok) throw new Error("Failed to archive dossier")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dossiers"] }),
  })
}

export function useUnarchiveDossier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dossiers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      })
      if (!res.ok) throw new Error("Failed to restore dossier")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dossiers"] }),
  })
}

export function useUpdateDossierTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const res = await fetch(`/api/dossiers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      })
      if (!res.ok) throw new Error("Failed to update tags")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dossiers"] }),
  })
}

export function useRenameDossier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/dossiers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error("Failed to rename dossier")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dossiers"] }),
  })
}
