"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSpeech } from "@/hooks/use-speech"
import { useAutoResize } from "@/hooks/use-auto-resize"
import { useKaelRoute } from "@/hooks/use-poles"
import { Send, Mic, MicOff, Loader2, Sparkles, X, ChevronRight } from "lucide-react"
import { useWorkspaceStore } from "@/store/workspace.store"

interface KaelPanelProps {
    dossierId: string
    currentLab?: string
}

interface KaelMsg {
    id: string
    role: "user" | "kael"
    content: string
    timestamp: string
}

/**
 * KaelPanel — KAEL as a permanent side panel in the Workspace.
 * Controlled by kaelPanelOpen / toggleKaelPanel in the workspace store.
 */
export function KaelPanel({ dossierId, currentLab }: KaelPanelProps) {
    const { kaelPanelOpen, toggleKaelPanel } = useWorkspaceStore()

    const [messages, setMessages] = useState<KaelMsg[]>([{
        id: "kael-welcome",
        role: "kael",
        content: "Bonjour. Je suis KAEL, ton orchestrateur.\n\nJ'ai une vue globale de ton workspace. Qu'est-ce que tu veux explorer ou débloquer ?",
        timestamp: new Date().toISOString(),
    }])
    const [input, setInput] = useState("")
    const bottomRef = useRef<HTMLDivElement>(null)
    const textareaRef = useAutoResize(input)
    const { mutateAsync: kaelRoute, isPending: sending } = useKaelRoute()

    useEffect(() => {
        if (kaelPanelOpen) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, kaelPanelOpen])

    const handleVoiceResult = useCallback((t: string) => setInput((p) => p ? p + " " + t : t), [])
    const { isListening, toggle: toggleVoice, interim } = useSpeech({ onResult: handleVoiceResult })

    async function handleSend() {
        const text = input.trim()
        if (!text || sending) return
        setInput("")
        const userMsg: KaelMsg = {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, userMsg])
        try {
            const history = messages.map((m) => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.content,
            }))
            const res = await kaelRoute({ dossierId, message: text, history })
            setMessages((prev) => [...prev, {
                id: crypto.randomUUID(),
                role: "kael",
                content: res.response ?? res.message ?? "Réponse reçue.",
                timestamp: new Date().toISOString(),
            }])
        } catch {
            setMessages((prev) => [...prev, {
                id: crypto.randomUUID(),
                role: "kael",
                content: "Une erreur est survenue.",
                timestamp: new Date().toISOString(),
            }])
        }
    }

    // Collapsed tab
    if (!kaelPanelOpen) {
        return (
            <div className="flex flex-col items-center justify-start pt-4 w-10 h-full shrink-0 border-l border-white/5 bg-[#0a0a0a]">
                <button
                    onClick={toggleKaelPanel}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-primary/10 transition-colors group"
                    title="Ouvrir KAEL"
                >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg group-hover:shadow-primary/20">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="text-[8px] text-muted-foreground/60 uppercase tracking-widest writing-mode-vertical">KAEL</span>
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col shrink-0 w-80 h-full border-l border-white/5 bg-[#0f0f0f] backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-3 py-3 border-b border-white/5 shrink-0 bg-gradient-to-r from-primary/10 to-transparent">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-primary/20 border border-primary/30">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold">KAEL</p>
                    <p className="text-[10px] text-muted-foreground/60">
                        Orchestrateur · Vue globale
                        {currentLab && (
                            <> · <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/30 text-primary">{currentLab.replace(/_/g, " ")}</Badge></>
                        )}
                    </p>
                </div>
                <button
                    onClick={toggleKaelPanel}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    title="Réduire KAEL"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 text-sm">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        {msg.role === "kael" && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center mr-1.5 shrink-0 mt-0.5 bg-primary/10 border border-primary/20">
                                <Sparkles className="h-2.5 w-2.5 text-primary" />
                            </div>
                        )}
                        <div className={cn(
                            "rounded-xl px-3 py-2 text-xs max-w-[88%]",
                            msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                        )}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <p className={cn("text-[9px] mt-0.5 opacity-40", msg.role === "user" ? "text-right" : "")}>
                                {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                    </div>
                ))}

                {sending && (
                    <div className="flex">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center mr-1.5 shrink-0 bg-primary/10 border border-primary/20">
                            <Sparkles className="h-2.5 w-2.5 text-primary animate-pulse" />
                        </div>
                        <div className="bg-muted rounded-xl px-3 py-2">
                            <div className="flex gap-0.5">
                                {[0, 150, 300].map((d) => (
                                    <span key={d} className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 py-2.5 border-t border-white/5">
                <div className="flex items-end gap-1.5">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend() }}
                        placeholder="Message à KAEL… (⌘↵)"
                        className="min-h-[36px] text-xs resize-none rounded-lg py-2 bg-muted/40 border-muted focus:border-primary/40"
                        rows={1}
                        disabled={sending}
                    />
                    {interim && <p className="text-[9px] text-muted-foreground/50 italic">{interim}</p>}
                    <button
                        onClick={toggleVoice}
                        className={cn(
                            "p-2 rounded-lg transition-colors shrink-0",
                            isListening ? "bg-red-500/10 text-red-500" : "hover:bg-muted text-muted-foreground"
                        )}
                    >
                        {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </button>
                    <Button
                        size="sm"
                        onClick={handleSend}
                        disabled={sending || !input.trim()}
                        className="rounded-lg px-2 h-8 shrink-0"
                    >
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}
