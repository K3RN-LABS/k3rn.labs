"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Sparkles,
} from "lucide-react"
import type { ChatMessage } from "@/lib/claude"
import { cn } from "@/lib/utils"
import { useSpeech } from "@/hooks/use-speech"
import { useAutoResize } from "@/hooks/use-auto-resize"

interface ExpertChatPanelProps {
  sessionId: string
  expertName: string
  expertRole?: string
  initialMessages?: ChatMessage[]
  dossierId: string
  onBack?: () => void
  onCardValidated?: () => void
  fullScreen?: boolean
}

export function ExpertChatPanel({
  sessionId,
  expertName,
  expertRole,
  initialMessages = [],
  dossierId,
  onBack,
  onCardValidated,
  fullScreen = false,
}: ExpertChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<{ name: string; type: string; size?: number }[]>([])
  const [proposedCard, setProposedCard] = useState<any>(null)
  const [validating, setValidating] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useAutoResize(input)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(
    async (text: string, chosenAttachments = attachments) => {
      if (!text.trim() || isLoading) return
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
        attachments: chosenAttachments.length > 0 ? chosenAttachments : undefined,
      }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setAttachments([])
      setIsLoading(true)
      try {
        const res = await fetch(`/api/experts/sessions/${sessionId}/invoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim(), attachments: chosenAttachments }),
        })
        const data = await res.json()
        if (data.messages) {
          setMessages(data.messages)
        }
        if (data.response?.proposedCard) {
          setProposedCard(data.response.proposedCard)
        }
      } finally {
        setIsLoading(false)
        textareaRef.current?.focus()
      }
    },
    [sessionId, isLoading, attachments]
  )

  const handleChoice = (choice: string) => {
    sendMessage(choice, [])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      sendMessage(input)
    }
  }

  const handleVoiceResult = useCallback((transcript: string) => {
    setInput((prev) => (prev ? prev + " " + transcript : transcript))
  }, [])

  const { isListening, toggle: toggleVoice, interim } = useSpeech({ onResult: handleVoiceResult })

  const startVoice = toggleVoice

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    ])
    e.target.value = ""
  }

  const validateCard = async () => {
    if (!proposedCard) return
    setValidating(true)
    try {
      await fetch(`/api/experts/sessions/${sessionId}/validate`, { method: "PATCH" })
      setProposedCard(null)
      onCardValidated?.()
      const successMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "expert",
        content: "Parfait ! La carte a été validée et ajoutée à votre espace de travail.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, successMsg])
    } finally {
      setValidating(false)
    }
  }

  const rejectCard = async () => {
    if (!proposedCard) return
    setValidating(true)
    try {
      await fetch(`/api/experts/sessions/${sessionId}/reject`, { method: "PATCH" })
      setProposedCard(null)
      const rejectMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "expert",
        content: "Compris. Comment puis-je affiner ma proposition ?",
        timestamp: new Date().toISOString(),
        choices: ["Plus de détails", "Changer d'angle", "Recommencer"],
      }
      setMessages((prev) => [...prev, rejectMsg])
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className={cn("flex flex-col bg-background", fullScreen ? "h-screen" : "h-full")}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{expertName}</p>
            {expertRole && (
              <p className="text-xs text-muted-foreground truncate">{expertRole}</p>
            )}
          </div>
        </div>
        {isLoading && (
          <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin ml-auto shrink-0" />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col gap-1.5", msg.role === "user" ? "items-end" : "items-start")}>
            {/* Bubble */}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "expert"
                  ? "bg-muted text-foreground rounded-tl-sm"
                  : "bg-primary text-primary-foreground rounded-tr-sm"
              )}
            >
              {msg.content}
              {/* Attachments */}
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

            {/* Choices */}
            {msg.role === "expert" && msg.choices && msg.choices.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-1.5 max-w-[90%]">
                {msg.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => handleChoice(choice)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors text-left"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}

            {/* Proposed card */}
            {msg.role === "expert" && msg.proposedCard && proposedCard && (
              <div className="w-full max-w-[90%] mt-1 border border-primary/30 rounded-xl p-3 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{msg.proposedCard.type}</Badge>
                  <span className="text-xs text-muted-foreground">Carte proposée</span>
                </div>
                <p className="text-sm font-medium">{msg.proposedCard.title}</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={validateCard}
                    disabled={validating}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={rejectCard}
                    disabled={validating}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Rejeter
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t flex flex-wrap gap-1.5 shrink-0">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-1">
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[100px] truncate">{a.name}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t px-3 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez ou parlez…"
              className="min-h-[44px] resize-none pr-2 text-sm rounded-xl py-3 bg-muted/40 border-muted focus:border-primary/50 overflow-hidden"
              rows={1}
            />
            {interim && (
              <p className="px-3 pt-1 pb-0.5 text-xs text-muted-foreground/60 italic truncate">
                {interim}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Joindre un fichier"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              onClick={startVoice}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isListening
                  ? "bg-red-500/10 text-red-500"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              title="Saisie vocale"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <Button
              size="sm"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 p-0 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-right">⌘+Entrée pour envoyer</p>
      </div>
    </div>
  )
}
