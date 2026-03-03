"use client"

import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { X, CheckCircle, XCircle, Archive } from "lucide-react"
import type { CardState } from "@prisma/client"

interface CardDetailPanelProps {
  cardId: string
  dossierId: string
  onClose: () => void
  onTransition: (state: string) => void
}

const STATE_VARIANT: Record<CardState, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  VALIDATED: "default",
  REJECTED: "destructive",
  ARCHIVED: "outline",
}

const ALLOWED_TRANSITIONS: Record<CardState, CardState[]> = {
  DRAFT: ["VALIDATED", "REJECTED"],
  VALIDATED: ["ARCHIVED"],
  REJECTED: [],
  ARCHIVED: [],
}

export function CardDetailPanel({ cardId, dossierId, onClose, onTransition }: CardDetailPanelProps) {
  const { data: card, isLoading } = useQuery({
    queryKey: ["card", cardId],
    queryFn: async () => {
      const res = await fetch(`/api/cards/${cardId}`)
      if (!res.ok) throw new Error("Card not found")
      return res.json()
    },
  })

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">Card Detail</span>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && <div className="p-4 animate-pulse text-muted-foreground text-sm">Loading...</div>}

      {card && (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-jakarta text-muted-foreground uppercase mb-1">{card.type}</div>
              <h3 className="font-semibold">{card.title}</h3>
            </div>
            <Badge variant={STATE_VARIANT[card.state as CardState] ?? "outline"}>{card.state}</Badge>
          </div>

          <Separator />

          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Content</div>
            <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(card.content, null, 2)}
            </pre>
          </div>

          {card.transitionLogs?.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase mb-2">History</div>
                <div className="space-y-1">
                  {card.transitionLogs.map((log: { id: string; fromState: string; toState: string; createdAt: string }) => (
                    <div key={log.id} className="text-xs text-muted-foreground">
                      {log.fromState} → {log.toState}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {ALLOWED_TRANSITIONS[card.state as CardState]?.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase">Actions</div>
                {ALLOWED_TRANSITIONS[card.state as CardState].map((state) => (
                  <Button
                    key={state}
                    variant={state === "REJECTED" ? "destructive" : state === "ARCHIVED" ? "outline" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={() => onTransition(state)}
                  >
                    {state === "VALIDATED" && <CheckCircle className="h-3.5 w-3.5" />}
                    {state === "REJECTED" && <XCircle className="h-3.5 w-3.5" />}
                    {state === "ARCHIVED" && <Archive className="h-3.5 w-3.5" />}
                    Mark as {state}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
