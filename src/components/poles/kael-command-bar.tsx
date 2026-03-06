"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { usePoles } from "@/hooks/use-poles"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"
import { normalizeManagerName, getExpertImage } from "@/lib/experts"
import type { PoleData } from "@/hooks/use-poles"

const POLE_COLORS: Record<string, string> = {
  P01_STRATEGIE: "border-violet-500/30",
  P02_MARKET: "border-blue-500/30",
  P03_PRODUIT_TECH: "border-emerald-500/30",
  P04_FINANCE: "border-amber-500/30",
  P05_MARKETING: "border-pink-500/30",
  P06_LEGAL: "border-slate-500/30",
  P07_TALENT_OPS: "border-orange-500/30",
}

const POLE_LABELS: Record<string, string> = {
  P01_STRATEGIE: "Stratégie & Innovation",
  P02_MARKET: "Market & Intelligence",
  P03_PRODUIT_TECH: "Produit & Tech",
  P04_FINANCE: "Finance",
  P05_MARKETING: "Marketing",
  P06_LEGAL: "Juridique",
  P07_TALENT_OPS: "Talent & Ops",
}

interface KaelCommandBarProps {
  dossierId: string
  currentLab?: string
  onSelectPole: (pole: PoleData, initialMessage?: string) => void
  onOpen?: () => void
  closeRef?: React.MutableRefObject<(() => void) | null>
}

export function KaelCommandBar({ dossierId, currentLab, onSelectPole, onOpen, closeRef }: KaelCommandBarProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const { data: poles = [] } = usePoles()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  // Expose close function to parent
  useEffect(() => {
    if (closeRef) closeRef.current = () => setOpen(false)
    return () => { if (closeRef) closeRef.current = null }
  }, [closeRef])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault()
        setOpen((v) => {
          if (!v) onOpenRef.current?.()
          return !v
        })
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (open) {
      setFocusedIndex(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset focused index when filtered results change
  useEffect(() => { setFocusedIndex(null) }, [query])

  // Focus list container when navigating, scroll item into view
  useEffect(() => {
    if (focusedIndex !== null) {
      listRef.current?.focus({ preventScroll: true })
      const item = listRef.current?.children[focusedIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [focusedIndex])

  const filtered = query.trim()
    ? poles.filter((p) => {
        const q = query.toLowerCase().replace(/^#/, "")
        const displayName = normalizeManagerName(p.managerName).toLowerCase()
        return (
          displayName.includes(q) ||
          p.managerName.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          POLE_LABELS[p.code]?.toLowerCase().includes(q) ||
          (p.hashtagTriggers as string[]).some((h) => h.toLowerCase().replace(/^#/, "").includes(q))
        )
      })
    : poles

  function handleSelect(pole: PoleData) {
    setOpen(false)
    setQuery("")
    setFocusedIndex(null)
    onSelectPole(pole, query.trim() || undefined)
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (filtered.length > 0) {
        setFocusedIndex(0)
        inputRef.current?.blur()
      }
    } else if (e.key === "Enter" && filtered.length === 1) {
      handleSelect(filtered[0])
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setFocusedIndex(i => i === null ? 0 : Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (focusedIndex === 0 || focusedIndex === null) {
        setFocusedIndex(null)
        inputRef.current?.focus()
      } else {
        setFocusedIndex(i => Math.max((i ?? 1) - 1, 0))
      }
    } else if (e.key === "Enter" && focusedIndex !== null) {
      e.preventDefault()
      handleSelect(filtered[focusedIndex])
    }
  }

  return (
    <>
      <button
        onClick={() => { onOpen?.(); setOpen(true) }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border/50 text-xs text-muted-foreground transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>Trouver un expert</span>
        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-background border border-border/50 text-[10px] font-jakarta">⌘J</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mot-clé, nom d'expert ou domaine… mvp, finance, AXEL, juridique…"
              className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 placeholder:text-muted-foreground/50"
              onKeyDown={handleInputKeyDown}
            />
          </div>

          <div
            ref={listRef}
            className="py-2 max-h-[360px] overflow-y-auto outline-none"
            tabIndex={focusedIndex !== null ? 0 : -1}
            onKeyDown={handleListKeyDown}
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun expert trouvé</p>
            ) : (
              filtered.map((pole, idx) => {
                const isPriority = currentLab && (pole.activePriorityLabs as string[]).includes(currentLab)
                const borderCls = POLE_COLORS[pole.code] ?? "border-border/30"
                const displayName = normalizeManagerName(pole.managerName)
                const imgSrc = getExpertImage(pole.managerName)
                const triggers = (pole.hashtagTriggers as string[])
                const isFocused = focusedIndex === idx

                return (
                  <button
                    key={pole.id}
                    onClick={() => handleSelect(pole)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left",
                      isFocused && "bg-muted/50 ring-1 ring-inset ring-primary/30"
                    )}
                  >
                    {/* Photo expert */}
                    <div className={cn("w-9 h-9 rounded-xl overflow-hidden border-2 shrink-0", borderCls)}>
                      <img
                        src={imgSrc}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const el = e.currentTarget
                          el.style.display = "none"
                          if (el.parentElement) {
                            el.parentElement.innerHTML = `<span class="w-full h-full flex items-center justify-center text-xs font-black">${displayName.slice(0, 2).toUpperCase()}</span>`
                          }
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{displayName}</span>
                        <span className="text-[10px] text-muted-foreground font-jakarta">{POLE_LABELS[pole.code]}</span>
                        {isPriority && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            recommandé
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {triggers.slice(0, 5).map((h) => (
                          <span key={h} className="text-[9px] font-jakarta text-muted-foreground/50">
                            {h.startsWith("#") ? h : `#${h}`}
                          </span>
                        ))}
                        {triggers.length > 5 && (
                          <span className="text-[9px] font-jakarta text-muted-foreground/30">+{triggers.length - 5}</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground/50">
            <span><kbd className="font-jakarta">↑↓</kbd> naviguer</span>
            <span><kbd className="font-jakarta">↵</kbd> sélectionner</span>
            <span><kbd className="font-jakarta">esc</kbd> fermer</span>
            <span className="ml-auto flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" />KAEL · K3RN OS</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
