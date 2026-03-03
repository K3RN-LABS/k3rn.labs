"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { usePoles } from "@/hooks/use-poles"
import { cn } from "@/lib/utils"
import { Sparkles, Hash } from "lucide-react"
import type { PoleData } from "@/hooks/use-poles"

const POLE_COLORS: Record<string, string> = {
  P01_STRATEGIE: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  P02_MARKET: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  P03_PRODUIT_TECH: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  P04_FINANCE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  P05_MARKETING: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  P06_LEGAL: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  P07_TALENT_OPS: "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

interface KaelCommandBarProps {
  dossierId: string
  currentLab?: string
  onSelectPole: (pole: PoleData, initialMessage?: string) => void
}

export function KaelCommandBar({ dossierId, currentLab, onSelectPole }: KaelCommandBarProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { data: poles = [] } = usePoles()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = query.trim()
    ? poles.filter((p) => {
      const q = query.toLowerCase().replace(/^#/, "")
      return (
        p.managerName.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.hashtagTriggers as string[]).some((h) => h.toLowerCase().includes(q))
      )
    })
    : poles

  function handleSelect(pole: PoleData) {
    setOpen(false)
    setQuery("")
    onSelectPole(pole, query.trim() || undefined)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border/50 text-xs text-muted-foreground transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>KAEL</span>
        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-background border border-border/50 text-[10px] font-jakarta">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tape #hashtag ou nom d'expert… AXEL, MAYA, #mvp, #market…"
              className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 placeholder:text-muted-foreground/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length === 1) handleSelect(filtered[0])
              }}
            />
          </div>

          <div className="py-2 max-h-[360px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun pôle trouvé</p>
            ) : (
              filtered.map((pole) => {
                const isPriority = currentLab && (pole.activePriorityLabs as string[]).includes(currentLab)
                const colorCls = POLE_COLORS[pole.code] ?? "bg-muted text-muted-foreground"
                return (
                  <button
                    key={pole.id}
                    onClick={() => handleSelect(pole)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border", colorCls)}>
                      {pole.managerName.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{pole.managerName}</span>
                        <span className="text-[10px] text-muted-foreground font-jakarta">{pole.code.split("_")[0]}</span>
                        {isPriority && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            recommandé
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(pole.hashtagTriggers as string[]).slice(0, 4).map((h) => (
                          <span key={h} className="text-[9px] font-jakarta text-muted-foreground/60">
                            <Hash className="h-2 w-2 inline" />{h.replace("#", "")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground/50">
            <span><kbd className="font-jakarta">↵</kbd> sélectionner</span>
            <span><kbd className="font-jakarta">esc</kbd> fermer</span>
            <span className="ml-auto flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" />KAEL · K3RN OS</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
