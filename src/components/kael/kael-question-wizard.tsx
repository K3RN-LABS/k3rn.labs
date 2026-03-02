"use client"

import { useState, useEffect, useRef } from "react"
import { Check, PenLine, ChevronRight, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { QuestionItem } from "@/lib/claude"

interface KaelQuestionWizardProps {
  questions: QuestionItem[]
  onSubmit: (answers: string) => void
  disabled?: boolean
}

const MAX_OPTIONS = 4

export function KaelQuestionWizard({ questions, onSubmit, disabled }: KaelQuestionWizardProps) {
  const [step, setStep] = useState(0)
  // answers[i] = array of selected labels (or custom text)
  const [answers, setAnswers] = useState<string[][]>(() => questions.map(() => []))
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const current = questions[step]
  const limited = current.choices.slice(0, MAX_OPTIONS)
  const isMulti = !!current.multiSelect
  const currentAnswers = answers[step] ?? []
  const isLast = step === questions.length - 1

  // Reset custom mode when changing step
  useEffect(() => {
    setCustomMode(false)
    setCustomText("")
  }, [step])

  useEffect(() => {
    if (customMode) setTimeout(() => inputRef.current?.focus(), 50)
  }, [customMode])

  function toggleOption(label: string) {
    if (disabled) return
    setAnswers((prev) => {
      const cur = prev[step] ?? []
      if (isMulti) {
        const next = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label]
        return prev.map((a, i) => (i === step ? next : a))
      } else {
        // single select — selecting already selected deselects
        const next = cur.includes(label) ? [] : [label]
        return prev.map((a, i) => (i === step ? next : a))
      }
    })
  }

  function commitCustom() {
    const t = customText.trim()
    if (!t || disabled) return
    setAnswers((prev) => prev.map((a, i) => (i === step ? [t] : a)))
    setCustomMode(false)
    setCustomText("")
  }

  function handleNext() {
    if (currentAnswers.length === 0 && !customMode) return
    if (isLast) {
      handleSubmit()
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleSubmit() {
    const parts = questions.map((q, i) => {
      const ans = answers[i]
      if (!ans || ans.length === 0) return null
      return `${q.question} → ${ans.join(", ")}`
    }).filter(Boolean)
    onSubmit(parts.join("\n"))
  }

  const canAdvance = currentAnswers.length > 0

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-950">
      {/* Progress bar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-1">
        {questions.map((_, i) => {
          const isDone = i < step || (i === step && canAdvance)
          const isCurrent = i === step
          return (
            <div
              key={i}
              className={cn(
                "h-0.5 flex-1 rounded-full transition-all duration-300",
                isDone ? "bg-primary" : isCurrent ? "bg-primary/30" : "bg-zinc-800"
              )}
            />
          )
        })}
        <span className="ml-2 text-[10px] text-zinc-600 shrink-0 tabular-nums">
          {step + 1}/{questions.length}
        </span>
      </div>

      {/* Question header */}
      <div className="px-4 pt-2 pb-2">
        <p className="text-xs font-medium text-zinc-200 leading-snug">{current.question}</p>
        {current.description && (
          <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{current.description}</p>
        )}
        {isMulti && (
          <p className="text-[10px] text-zinc-600 mt-0.5">Plusieurs réponses possibles</p>
        )}
      </div>

      {/* Options */}
      {!customMode ? (
        <div className="px-3 pb-2 space-y-1">
          {limited.map((choice, i) => {
            const isSelected = currentAnswers.includes(choice)
            return (
              <button
                key={i}
                onClick={() => toggleOption(choice)}
                disabled={disabled}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all border",
                  isSelected
                    ? "bg-primary/15 border-primary/40 text-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-bold border transition-all",
                    isMulti ? "rounded" : "rounded-full",
                    isSelected
                      ? "bg-primary/30 border-primary/60 text-primary"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500"
                  )}
                >
                  {isSelected ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="flex-1 leading-snug">{choice}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="px-3 pb-2">
          <div className="relative rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-primary/40 transition-all">
            <textarea
              ref={inputRef}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitCustom() }
                if (e.key === "Escape") setCustomMode(false)
              }}
              placeholder="Votre réponse personnalisée…"
              rows={2}
              className="w-full bg-transparent px-3 pt-2.5 pb-8 text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none leading-relaxed"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
              <button
                onClick={() => setCustomMode(false)}
                className="p-1 rounded text-zinc-600 hover:text-zinc-400"
                title="Annuler"
              >
                <X className="h-3 w-3" />
              </button>
              <button
                onClick={commitCustom}
                disabled={!customText.trim() || disabled}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-all",
                  customText.trim() && !disabled
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/60">
        {!customMode ? (
          <button
            onClick={() => setCustomMode(true)}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <PenLine className="h-3 w-3" />
            Autre réponse
          </button>
        ) : (
          <span className="text-[10px] text-zinc-600">Entrée pour valider · Éch pour annuler</span>
        )}

        <button
          onClick={handleNext}
          disabled={!canAdvance || disabled}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            canAdvance && !disabled
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          )}
        >
          {isLast ? (
            <>
              <Send className="h-3 w-3" />
              Envoyer
            </>
          ) : (
            <>
              Suivant
              <ChevronRight className="h-3 w-3" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
