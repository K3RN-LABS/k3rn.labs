import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { LabType } from "@prisma/client"

export function useLabExperts(lab: LabType | undefined) {
  return useQuery({
    queryKey: ["experts", lab],
    queryFn: async () => {
      const res = await fetch(`/api/labs/${lab}/experts`)
      if (!res.ok) throw new Error("Failed to fetch experts")
      return res.json()
    },
    enabled: !!lab,
  })
}

export function useCreateExpertSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ expertId, dossierId, cardId }: { expertId: string; dossierId: string; cardId?: string }) => {
      const res = await fetch(`/api/experts/${expertId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId, cardId }),
      })
      if (!res.ok) throw new Error("Failed to create expert session")
      return res.json()
    },
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ["dossier", variables.dossierId] }),
  })
}

export function useInvokeExpert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, message, dossierId }: { sessionId: string; message: string; dossierId: string }) => {
      const res = await fetch(`/api/experts/sessions/${sessionId}/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) throw new Error("Expert invocation failed")
      return res.json()
    },
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ["dossier", variables.dossierId] }),
  })
}

export function useValidateExpertSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, dossierId }: { sessionId: string; dossierId: string }) => {
      const res = await fetch(`/api/experts/sessions/${sessionId}/validate`, { method: "PATCH" })
      if (!res.ok) throw new Error("Validation failed")
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["dossier", variables.dossierId] })
      qc.invalidateQueries({ queryKey: ["score", variables.dossierId] })
      qc.invalidateQueries({ queryKey: ["cards"] })
    },
  })
}

export function useRejectExpertSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, dossierId }: { sessionId: string; dossierId: string }) => {
      const res = await fetch(`/api/experts/sessions/${sessionId}/reject`, { method: "PATCH" })
      if (!res.ok) throw new Error("Rejection failed")
      return res.json()
    },
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ["dossier", variables.dossierId] }),
  })
}
