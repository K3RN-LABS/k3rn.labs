"use client"

import { useScore } from "@/hooks/use-score"
import { getScoreLabel, getScoreTierColor } from "@/lib/score-engine"
import { cn } from "@/lib/utils"

interface ScoreMeterProps {
  dossierId: string
}

const DIMENSION_CONFIG = [
  { key: "marketScore", label: "Marché", color: "#3b82f6" },
  { key: "techScore", label: "Produit", color: "#06b6d4" },
  { key: "financeScore", label: "Finance", color: "#22c55e" },
  { key: "validationScore", label: "Validation", color: "#a78bfa" },
] as const

export function ScoreMeter({ dossierId }: ScoreMeterProps) {
  const { data, isLoading } = useScore(dossierId)
  const latest = data?.latest

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-2/3" />
        <div className="h-1.5 bg-white/5 rounded" />
        <div className="h-1.5 bg-white/5 rounded" />
        <div className="h-1.5 bg-white/5 rounded" />
      </div>
    )
  }

  if (!latest) {
    return (
      <div className="p-4 text-[11px] text-white/20 text-center">
        Complète l&apos;onboarding pour voir ton score
      </div>
    )
  }

  const global = latest.globalScore ?? 0
  const label = getScoreLabel(global)
  const tierColor = getScoreTierColor(global)

  return (
    <div className="p-4 space-y-3">
      {/* Global */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-jakarta uppercase tracking-[0.15em] text-white/30">Score global</p>
          <p className={cn("text-[10px] font-medium mt-0.5", tierColor)}>{label}</p>
        </div>
        <span className="text-2xl font-bold font-jakarta text-white">{global.toFixed(0)}</span>
      </div>

      {/* Dimensions */}
      <div className="space-y-2">
        {DIMENSION_CONFIG.map(({ key, label: dimLabel, color }) => {
          const val = (latest as Record<string, number>)[key] ?? 0
          return (
            <div key={key}>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-white/40">{dimLabel}</span>
                <span className="text-white/50">{val.toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(val, 100)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
