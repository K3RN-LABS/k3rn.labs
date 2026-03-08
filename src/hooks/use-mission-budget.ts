"use client"

import { useQuery } from "@tanstack/react-query"

interface MissionBudget {
  allowanceLeft: number
  topUpLeft: number
  total: number
  allowance: number
}

async function fetchBudget(): Promise<MissionBudget> {
  const res = await fetch("/api/user/budget")
  if (!res.ok) throw new Error("Failed to fetch budget")
  const json = await res.json()
  return json.data
}

let cache: MissionBudget | null = null

export function useMissionBudget() {
  return useQuery({
    queryKey: ["mission-budget"],
    queryFn: async () => {
      const data = await fetchBudget()
      cache = data
      return data
    },
    staleTime: 30_000,
    initialData: cache ?? undefined,
  })
}

export function invalidateMissionBudgetCache() {
  cache = null
}
