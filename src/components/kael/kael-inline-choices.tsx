"use client"

import { useState, useEffect, useRef } from "react"
import { PenLine, ArrowRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface KaelInlineChoicesProps {
  choices: string[]
  onSelect: (choice: string) => void
  disabled?: boolean
}

export function KaelInlineChoices({ choices, onSelect, disabled }: KaelInlineChoicesProps) {
  const limited = choices.slice(0, 4)
  const [mode, setMode] = useState<"choices" | "custom">("choices")
  const [customText, setCustomText] = useState("")
  const [focused, setFocused] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (mode !== "choices" || disabled) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return
      const num = parseInt(e.key)
      if (!isNaN(num) && num >= 1 && num <= limited.length) {
        e.preventDefault()
        onSelect(limited[num - 1])
      }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocused((f) => Math.max(0, f - 1)) }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(limited.length - 1, f + 1)) }
      if (e.key === "Enter") { e.preventDefault(); if (!disabled) onSelect(limited[focused]) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mode, limited, onSelect, focused, disabled])

  useEffect(() => {
    if (mode === "custom") setTimeout(() => inputRef.current?.focus(), 50)
  }, [mode])

  function handleCustomSend() {
    const t = customText.trim()
    if (t && !disabled) {
      setCustomText("")
      onSelect(t)
    }
  }

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-950">
      {/* Choices mode */}
      {mode === "choices" && (
        <div className="px-3 py-3 space-y-1.5">
          {limited.map((choice, i) => (
            <button
              key={i}
              onClick={() => !disabled && onSelect(choice)}
              onMouseEnter={() => setFocused(i)}
              disabled={disabled}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all border",
                focused === i
                  ? "bg-primary/10 border-primary/30 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border tabular-nums",
                  focused === i
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500"
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1 leading-snug">{choice}</span>
              {focused === i && <ArrowRight className="h-3 w-3 text-primary/60 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* Custom input mode */}
      {mode === "custom" && (
        <div className="px-3 py-3">
          <div className="relative rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-primary/40 transition-all">
            <textarea
              ref={inputRef}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCustomSend() }
                if (e.key === "Escape") setMode("choices")
              }}
              placeholder="Votre réponse personnalisée…"
              rows={2}
              className="w-full bg-transparent px-3 pt-2.5 pb-9 text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none leading-relaxed"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Entrée</span>
              <button
                onClick={handleCustomSend}
                disabled={!customText.trim() || disabled}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-all",
                  customText.trim() && !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/60">
        {mode === "choices" ? (
          <>
            <button
              onClick={() => setMode("custom")}
              className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <PenLine className="h-3 w-3" />
              Autre choix
            </button>
            <span className="text-[10px] text-zinc-700">
              {limited.length > 1 ? `1–${limited.length}` : "1"} · ↑↓ · Entrée
            </span>
          </>
        ) : (
          <>
            <button
              onClick={() => setMode("choices")}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Voir les suggestions
            </button>
            <span className="text-[10px] text-zinc-600">Maj+Entrée pour sauter une ligne</span>
          </>
        )}
      </div>
    </div>
  )
}
