"use client"

import { cn } from "@/lib/utils"
import type { PoleData } from "@/hooks/use-poles"

const POLE_CONFIG: Record<string, { color: string; emoji: string; role: string; hashtags: string }> = {
  P01_STRATEGIE: { color: "from-violet-600 to-purple-800", emoji: "⚡", role: "Stratégie & Innovation", hashtags: "#brainstorming · #pitch · #vision" },
  P02_MARKET: { color: "from-blue-600 to-cyan-700", emoji: "🔍", role: "Market & Intelligence", hashtags: "#market · #veille · #tam" },
  P03_PRODUIT_TECH: { color: "from-emerald-600 to-teal-700", emoji: "🏗️", role: "Produit & Tech", hashtags: "#produit · #mvp · #stack" },
  P04_FINANCE: { color: "from-amber-600 to-yellow-700", emoji: "📊", role: "Finance & Modélisation", hashtags: "#finance · #roi · #investisseur" },
  P05_MARKETING: { color: "from-pink-600 to-rose-700", emoji: "🎯", role: "Marketing & Brand", hashtags: "#brand · #seo · #growth" },
  P06_LEGAL: { color: "from-slate-600 to-gray-700", emoji: "⚖️", role: "Legal & Compliance", hashtags: "#legal · #rgpd · #contrat" },
  P07_TALENT_OPS: { color: "from-orange-600 to-red-700", emoji: "🚀", role: "Talent & Ops", hashtags: "#talent · #ops · #coordination" },
}

interface PoleCardProps {
  pole: PoleData
  currentLab?: string
  onClick: (pole: PoleData) => void
}

export function PoleCard({ pole, currentLab, onClick }: PoleCardProps) {
  const cfg = POLE_CONFIG[pole.code] ?? { color: "from-gray-600 to-gray-800", emoji: "🤖", role: pole.code, hashtags: "" }
  const isPriority = currentLab && (pole.activePriorityLabs as string[]).includes(currentLab)

  return (
    <button
      onClick={() => onClick(pole)}
      className={cn(
        "relative group w-full text-left rounded-2xl p-4 border border-border/40",
        "hover:border-border/80 hover:shadow-lg transition-all duration-200",
        "bg-card hover:bg-card/80"
      )}
    >
      {isPriority && (
        <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          recommandé
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-gradient-to-br", cfg.color)}>
          {cfg.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{pole.managerName}</span>
            <span className="text-[10px] text-muted-foreground font-jakarta">{pole.code.split("_")[0]}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{cfg.role}</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 font-jakarta">{cfg.hashtags}</p>
        </div>
      </div>
    </button>
  )
}

interface PoleHubProps {
  poles: PoleData[]
  currentLab?: string
  onSelectPole: (pole: PoleData) => void
  className?: string
}

export function PoleHub({ poles, currentLab, onSelectPole, className }: PoleHubProps) {
  const sorted = [...poles].sort((a, b) => {
    const aP = currentLab && (a.activePriorityLabs as string[]).includes(currentLab) ? -1 : 1
    const bP = currentLab && (b.activePriorityLabs as string[]).includes(currentLab) ? -1 : 1
    return aP - bP
  })

  return (
    <div className={cn("grid grid-cols-1 gap-3", className)}>
      {sorted.map((pole) => (
        <PoleCard key={pole.id} pole={pole} currentLab={currentLab} onClick={onSelectPole} />
      ))}
    </div>
  )
}
