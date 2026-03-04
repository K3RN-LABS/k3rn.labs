"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Brain, CheckCircle2, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

const LAB_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  STRUCTURATION: "Structuration",
  VALIDATION_MARCHE: "Market Validation",
  DESIGN_PRODUIT: "Product Design",
  ARCHITECTURE_TECHNIQUE: "Tech Architecture",
  BUSINESS_FINANCE: "Business & Finance",
}

const SUBFOLDER_LABELS: Record<string, string> = {
  PRODUIT: "Product",
  MARCHE: "Market",
  TECHNOLOGIE: "Tech",
  BUSINESS: "Business",
}

const MANAGER_COLORS: Record<string, string> = {
  AXEL: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  MAYA: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  KAI: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ELENA: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  SKY: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  MARCUS: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  NOVA: "bg-orange-500/10 text-orange-600 border-orange-500/20",
}

interface MemoryData {
  currentLab: string
  completedLabs: string[]
  labOrder: string[]
  validatedCards: { type: string; title: string; subfolderType: string }[]
  poleSessions: {
    managerName: string
    poleCode: string
    status: string
    lastMessage: string | null
    updatedAt: string
  }[]
  score: { global: number; market: number; tech: number; finance: number } | null
}

function useProjectMemory(dossierId: string) {
  return useQuery<MemoryData>({
    queryKey: ["memory", dossierId],
    queryFn: async () => {
      const res = await fetch(`/api/dossiers/${dossierId}/memory`)
      if (!res.ok) throw new Error("Failed to fetch memory")
      return res.json()
    },
    staleTime: 30 * 1000,
  })
}

interface MemoryFeedProps {
  dossierId: string
  className?: string
}

export function MemoryFeed({ dossierId, className }: MemoryFeedProps) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useProjectMemory(dossierId)

  const cardsBySubfolder = data?.validatedCards.reduce<Record<string, typeof data.validatedCards>>(
    (acc, card) => {
      const key = card.subfolderType
      if (!acc[key]) acc[key] = []
      acc[key].push(card)
      return acc
    },
    {}
  )

  const activeSessions = data?.poleSessions.filter((s) => s.lastMessage) ?? []
  const totalCards = data?.validatedCards.length ?? 0

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader
        className="cursor-pointer select-none py-3 px-4"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Mémoire Projet</CardTitle>
            {!isLoading && totalCards > 0 && (
              <Badge variant="secondary" className="text-xs h-4 px-1.5">
                {totalCards}
              </Badge>
            )}
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-3 bg-muted rounded animate-pulse" />
              ))}
            </div>
          )}

          {data && (
            <>
              {/* Lab progression */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Lab actif</p>
                <div className="flex flex-wrap gap-1">
                  {data.labOrder.map((lab) => {
                    const isCurrent = lab === data.currentLab
                    const isDone = data.completedLabs.includes(lab)
                    return (
                      <span
                        key={lab}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border",
                          isCurrent
                            ? "bg-primary/10 text-primary border-primary/30 font-medium"
                            : isDone
                              ? "bg-muted/60 text-muted-foreground border-transparent line-through"
                              : "text-muted-foreground/40 border-transparent"
                        )}
                      >
                        {LAB_LABELS[lab]}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Score */}
              {data.score && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Score</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "Global", value: data.score.global },
                      { label: "Market", value: data.score.market },
                      { label: "Tech", value: data.score.tech },
                      { label: "Finance", value: data.score.finance },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between bg-muted/40 rounded px-2 py-1">
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                        <span className="text-xs font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validated cards */}
              {totalCards > 0 && cardsBySubfolder && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Cartes validées ({totalCards})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(cardsBySubfolder).map(([subfolderType, cards]) => (
                      <div key={subfolderType}>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">
                          {SUBFOLDER_LABELS[subfolderType] ?? subfolderType}
                        </p>
                        <div className="space-y-0.5">
                          {cards.map((card, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
                              <span className="truncate text-foreground/80">{card.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalCards === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-2">
                  Aucune carte validée pour l'instant
                </p>
              )}

              {/* Pole sessions */}
              {activeSessions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Travaux des pôles ({activeSessions.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {activeSessions.map((session, i) => (
                      <div key={i} className="space-y-1">
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded border inline-block",
                            MANAGER_COLORS[session.managerName] ?? "bg-muted text-muted-foreground border-transparent"
                          )}
                        >
                          {session.managerName}
                        </span>
                        {session.lastMessage && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 pl-1">
                            {session.lastMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
