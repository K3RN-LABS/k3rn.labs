"use client"

import { useState, useEffect, useRef } from "react"
import { PenLine, ChevronLeft, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface KaelInlineChoicesProps {
  choices: string[]
  onSelect: (choice: string) => void
  disabled?: boolean
}

export function KaelInlineChoices({ choices, onSelect, disabled }: KaelInlineChoicesProps) {
  const limited = choices.slice(0, 4)
  const [mode, setMode] = useState<"choices" | "custom">("choices")
  const [selected, setSelected] = useState<string[]>([])
  const [customText, setCustomText] = useState("")
  const [focused, setFocused] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const allOptions = limited.length >= 3 ? [...limited, "Tout cela"] : limited

  function toggleChoice(choice: string) {
    if (disabled) return
    if (choice === "Tout cela") {
      setSelected(selected.length === limited.length ? [] : [...limited])
      return
    }
    setSelected((prev) =>
      prev.includes(choice) ? prev.filter((c) => c !== choice) : [...prev, choice]
    )
  }

  function handleValidate() {
    if (selected.length === 0 || disabled) return
    onSelect(selected.join(" + "))
  }

  useEffect(() => {
    if (mode !== "choices" || disabled) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return
      const num = parseInt(e.key)
      if (!isNaN(num) && num >= 1 && num <= allOptions.length) {
        e.preventDefault()
        toggleChoice(allOptions[num - 1])
      }
      if (e.key === "ArrowUp") { e.preventDefault(); setFocused((f) => Math.max(0, f - 1)) }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(allOptions.length - 1, f + 1)) }
      if (e.key === "Enter") {
        e.preventDefault()
        if (selected.length > 0) {
          handleValidate()
        } else {
          toggleChoice(allOptions[focused])
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, allOptions, focused, disabled, selected])

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
          {allOptions.map((choice, i) => {
            const isSelected = choice === "Tout cela"
              ? selected.length === limited.length
              : selected.includes(choice)
            const isFocused = focused === i
            const isToutCela = choice === "Tout cela"

            return (
              <button
                key={i}
                onClick={() => toggleChoice(choice)}
                onMouseEnter={() => setFocused(i)}
                disabled={disabled}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all border",
                  isSelected
                    ? "bg-primary/15 border-primary/40 text-white"
                    : isFocused
                    ? "bg-zinc-800/80 border-zinc-700 text-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border tabular-nums",
                    isSelected
                      ? "bg-primary/30 border-primary/60 text-primary"
                      : isFocused
                      ? "bg-zinc-700 border-zinc-600 text-zinc-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500"
                  )}
                >
                  {isSelected ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    isToutCela ? "✦" : i + 1
                  )}
                </span>
                <span className={cn("flex-1 leading-snug", isToutCela && "text-zinc-400 italic")}>
                  {choice}
                </span>
              </button>
            )
          })}
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
            {selected.length > 0 ? (
              <button
                onClick={handleValidate}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all",
                  !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                Valider ({selected.length})
              </button>
            ) : (
              <span className="text-[10px] text-zinc-700">
                {allOptions.length > 1 ? `1–${allOptions.length}` : "1"} · ↑↓ · Espace
              </span>
            )}
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
