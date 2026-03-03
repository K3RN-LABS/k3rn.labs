"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/ui/logo"
import { useAutoResize } from "@/hooks/use-auto-resize"
import { useSpeech } from "@/hooks/use-speech"
import { Markdown } from "@/components/ui/markdown"
import { KaelInlineChoices } from "@/components/kael/kael-inline-choices"
import { KaelQuestionWizard } from "@/components/kael/kael-question-wizard"
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Loader2,
  Sparkles,
  ArrowRight,
  CheckCircle,
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react"
import type { ChatMessage } from "@/lib/claude"
import type { OnboardingStateDTO } from "@/lib/onboarding-state"
import { ASPECT_KEYS, ASPECT_LABELS } from "@/lib/onboarding-state"
import type { ExtractedFile } from "@/hooks/use-file-extract"
import { extractFile } from "@/hooks/use-file-extract"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

// ─── Progress bar ─────────────────────────────────────────────────────────

function OnboardingProgress({
  state,
  isLoading,
  visible,
}: {
  state: OnboardingStateDTO | null
  isLoading: boolean
  visible: boolean
}) {
  const confirmed = state?.confirmedAspects ?? {}
  const quality = state?.aspectQuality ?? {}
  // Scanning dot index: cycles 0→3 while loading, else -1
  const [scanIdx, setScanIdx] = useState(-1)

  useEffect(() => {
    if (!isLoading) { setScanIdx(-1); return }
    let i = 0
    const interval = setInterval(() => {
      setScanIdx(i % ASPECT_KEYS.length)
      i++
    }, 400)
    return () => clearInterval(interval)
  }, [isLoading])

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
      )}
    >
      {ASPECT_KEYS.map((key, idx) => {
        const done = !!confirmed[key]
        const weak = done && quality[key] === "weak"
        const scanning = isLoading && scanIdx === idx
        return (
          <div key={key} className="flex items-center gap-1.5" title={weak ? `${ASPECT_LABELS[key]} — à affiner` : undefined}>
            <div className="relative h-1.5 w-8 rounded-full overflow-hidden bg-muted-foreground/15">
              {/* filled — vert si strong, ambre si weak */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full transition-all duration-700",
                  done && !weak ? "bg-primary opacity-100" :
                    done && weak ? "bg-amber-400 opacity-100" :
                      "bg-primary opacity-0"
                )}
              />
              {/* scan shimmer */}
              {scanning && (
                <div className="absolute inset-0 rounded-full bg-white/60 animate-pulse" />
              )}
            </div>
            <span
              className={cn(
                "text-[10px] transition-all duration-500",
                done && !weak ? "text-primary" :
                  done && weak ? "text-amber-400" :
                    scanning ? "text-white/70" :
                      "text-muted-foreground/35"
              )}
            >
              {ASPECT_LABELS[key]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage({ params }: { params: { id: string } }) {
  const dossierId = params.id
  const router = useRouter()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [dossierName, setDossierName] = useState("")
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([])
  const [error, setError] = useState<string | null>(null)

  const [onboardingState, setOnboardingState] = useState<OnboardingStateDTO | null>(null)
  const [progressVisible, setProgressVisible] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)
  const textareaRef = useAutoResize(input)

  // isComplete is exclusively derived from the server state.
  // Safety guard: never show the completion banner while an unanswered
  // question with choices/questions is still visible on screen.
  const lastKaelWithInteraction = [...messages]
    .reverse()
    .find((m) => m.role === "expert" && (m.choices?.length || m.questions?.length))
  const hasPendingChoices = !!lastKaelWithInteraction
  const isComplete = onboardingState?.step === "COMPLETE" && !hasPendingChoices

  // Choices/questions only on the last KAEL message that has them
  const lastKaelWithInteractionId = lastKaelWithInteraction?.id

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    initOnboarding()
  }, [dossierId])

  async function initOnboarding() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/dossiers/${dossierId}/onboarding`, {
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()

      setDossierName(data.dossier?.name ?? "votre projet")
      if (data.onboardingState) setOnboardingState(data.onboardingState)

      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages)
      } else {
        const name = data.dossier?.name ?? "votre projet"
        const welcomeMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "expert",
          content: `Bonjour, je suis **KAEL**.\n\nDécrivez librement **"${name}"** — votre idée, le problème que vous cherchez à résoudre, à quel stade vous en êtes. Texte brut, notes, pitch, document… tout est bienvenu.\n\nJe prendrai le temps d'analyser avant de vous poser les questions essentielles.`,
          timestamp: new Date().toISOString(),
        }
        setMessages([welcomeMsg])
      }
    } catch (err) {
      console.error("[initOnboarding]", err)
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "expert",
          content: `Bonjour, je suis **KAEL**.\n\nDécrivez librement votre projet — votre idée, le problème que vous cherchez à résoudre, à quel stade vous en êtes.`,
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
      // Reveal progress bar with a slight delay for a premium entrance
      setTimeout(() => setProgressVisible(true), 300)
    }
  }

  async function sendMessage(text: string) {
    const hasContent = text.trim() || extractedFiles.length > 0
    if (!hasContent || isLoading) return

    const attachmentsMeta = extractedFiles.map((f) => ({ name: f.name, type: f.type, size: f.size }))
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim() || `📎 ${extractedFiles.map((f) => f.name).join(", ")}`,
      timestamp: new Date().toISOString(),
      attachments: attachmentsMeta.length > 0 ? attachmentsMeta : undefined,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")

    const fileContexts = extractedFiles
      .filter((f) => f.kind !== "binary")
      .map((f) => ({
        name: f.name,
        kind: f.kind,
        content: f.content,
        dataUrl: f.kind === "image" ? f.dataUrl : undefined,
      }))
    setExtractedFiles([])
    setError(null)
    setIsLoading(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    try {
      const res = await fetch(`/api/dossiers/${dossierId}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), attachments: attachmentsMeta, files: fileContexts }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const details = errData.details
          ? ` (${Object.entries(errData.details).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join(" | ")})`
          : ""
        throw new Error((errData.error ?? `Erreur serveur ${res.status}`) + details)
      }

      const data = await res.json()
      if (data.messages) setMessages(data.messages)
      if (data.onboardingState) setOnboardingState(data.onboardingState)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === "AbortError"
            ? "Délai dépassé — réessaie"
            : err.message
          : "Erreur inconnue"
      setError(msg)
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      clearTimeout(timeout)
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendMessage(input)
  }

  const handleVoiceResult = useCallback((transcript: string) => {
    setInput((prev) => (prev ? prev + " " + transcript : transcript))
  }, [])

  const { isListening, toggle: toggleVoice, interim } = useSpeech({ onResult: handleVoiceResult })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return
    setIsExtracting(true)
    try {
      const results = await Promise.all(files.map(extractFile))
      setExtractedFiles((prev) => [...prev, ...results])
    } finally {
      setIsExtracting(false)
    }
  }

  function handleEnterWorkspace() {
    router.push(`/dossiers/${dossierId}`)
  }

  function handleCopy(id: string, content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  async function handleRetry(_expertMsgId: string) {
    if (isLoading) return
    setError(null)
    try {
      const res = await fetch(`/api/dossiers/${dossierId}/onboarding`, {
        method: "DELETE",
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error("Impossible de relancer")
      const data = await res.json()
      setMessages(data.messages ?? [])
      if (data.retryText) {
        // sendMessage manages isLoading itself
        sendMessage(data.retryText)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-background">
      {/* Header — Étape G : pas de bouton "Passer" ambigu */}
      <header className="border-b px-6 py-3 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Logo size="sm" />
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-sm font-medium truncate max-w-[200px]">{dossierName}</span>
        </div>
        {/* Progress — sticky, toujours visible */}
        <div className="flex-1 flex justify-center">
          <OnboardingProgress state={onboardingState} isLoading={isLoading} visible={progressVisible} />
        </div>
        {/* Étape G : "Entrer dans le workspace" uniquement si isComplete (serveur) */}
        <div className="shrink-0">
          {isComplete ? (
            <Button size="sm" onClick={handleEnterWorkspace} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Entrer dans le workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1.5">
              <Sparkles className="h-3 w-3" />
              KAEL
            </div>
          )}
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 min-h-0">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("group flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}
            >
              {msg.role === "expert" ? (
                <div className="flex items-start gap-3 max-w-[85%] group/expert">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-primary/20 bg-muted mt-0.5 shadow-sm">
                    <img
                      src="/images/kael-avatar-onboarding.png"
                      alt="KAEL"
                      className="w-full h-full object-cover grayscale-[0.2] group-hover/expert:grayscale-0 transition-all"
                    />
                  </div>
                  {/* KAEL bubble — choices panel attached inside */}
                  <div className="flex-1 rounded-2xl overflow-hidden bg-muted text-foreground rounded-tl-sm">
                    <div className="px-4 py-3 text-sm leading-relaxed">
                      <Markdown invert={false}>{msg.content}</Markdown>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.attachments.map((a, i) => (
                            <span key={i} className="text-xs opacity-70 bg-black/10 rounded px-1.5 py-0.5">
                              📎 {a.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Inline interaction — only on the last KAEL message that has them */}
                    {msg.id === lastKaelWithInteractionId && (
                      msg.questions && msg.questions.length > 0 ? (
                        <KaelQuestionWizard
                          questions={msg.questions}
                          onSubmit={sendMessage}
                          disabled={isLoading}
                        />
                      ) : msg.choices && msg.choices.length > 0 ? (
                        <KaelInlineChoices
                          choices={msg.choices}
                          onSelect={sendMessage}
                          disabled={isLoading}
                        />
                      ) : null
                    )}
                  </div>
                </div>
              ) : (
                // User bubble
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-primary text-primary-foreground rounded-tr-sm">
                  <Markdown invert={true}>{msg.content}</Markdown>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.attachments.map((a, i) => (
                        <span key={i} className="text-xs opacity-70 bg-black/10 rounded px-1.5 py-0.5">
                          📎 {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Action buttons — visible on hover */}
              <div className={cn(
                "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}>
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  title="Copier"
                >
                  {copiedId === msg.id
                    ? <Check className="h-3 w-3 text-primary" />
                    : <Copy className="h-3 w-3" />
                  }
                </button>
                {msg.role === "expert" && !isLoading && (
                  <button
                    onClick={() => handleRetry(msg.id)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    title="Relancer"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-primary/20 bg-muted mt-0.5">
                <img
                  src="/images/kael-avatar-onboarding.png"
                  alt="KAEL"
                  className="w-full h-full object-cover animate-pulse grayscale-[0.5]"
                />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
              <span className="shrink-0">⚠</span>
              {error}
              <button onClick={() => setError(null)} className="ml-auto text-xs underline opacity-70 hover:opacity-100">
                Fermer
              </button>
            </div>
          )}

          {/* Completion card — Étape G : uniquement si isComplete serveur */}
          {isComplete && onboardingState && (
            <div className="border border-primary/30 rounded-2xl p-5 bg-primary/5 text-center space-y-3">
              <CheckCircle className="h-8 w-8 text-primary mx-auto" />
              <p className="font-semibold">Votre projet est structuré !</p>
              <p className="text-sm text-muted-foreground">
                LAB de départ :{" "}
                <span className="font-medium text-foreground">{onboardingState.recommendedLab}</span>
              </p>
              <Button onClick={handleEnterWorkspace} className="gap-2">
                Entrer dans le workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input — toujours visible tant que non complet (Étape G) */}
      {!isComplete && (
        <div className="border-t px-4 py-4 shrink-0">
          <div className="max-w-2xl mx-auto">
            {isExtracting && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Extraction du contenu en cours…
              </div>
            )}
            {extractedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {extractedFiles.map((f, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-1 text-xs rounded-md px-2 py-1 border",
                      f.kind === "image"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : f.kind === "text"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-muted border-border"
                    )}
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <span className="opacity-60">{f.kind === "image" ? "🖼" : "✓"}</span>
                    <button
                      onClick={() => setExtractedFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-0.5 hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {interim && (
              <p className="px-3 pb-1.5 text-xs text-muted-foreground/60 italic truncate">
                {interim}
              </p>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Décrivez votre projet, partagez vos idées, ajoutez des fichiers…"
                  className="min-h-[52px] max-h-[200px] resize-none pr-2 text-sm rounded-2xl py-3.5 bg-muted/40 border-muted focus:border-primary/50 overflow-y-auto"
                  rows={1}
                  maxLength={10000}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Joindre des fichiers"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleVoice}
                  className={cn(
                    "p-2.5 rounded-xl transition-colors",
                    isListening
                      ? "bg-red-500/10 text-red-500"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  title="Saisie vocale"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={(!input.trim() && extractedFiles.length === 0) || isLoading || isExtracting}
                  className="h-10 w-10 p-0 rounded-xl"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              ⌘+Entrée · Déposez des fichiers, partagez des liens, tout est accepté
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
