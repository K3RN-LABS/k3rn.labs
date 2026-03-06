"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useAutoResize } from "@/hooks/use-auto-resize"
import { useSpeech } from "@/hooks/use-speech"
import { useKaelRoute, usePoles, useActiveKaelSession } from "@/hooks/use-poles"
import { normalizeManagerName, getExpertImage } from "@/lib/experts"
import { Sparkles, Send, Mic, MicOff, Loader2, ChevronDown, LayoutGrid } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Msg {
    id: string
    role: "user" | "kael"
    content: string
    timestamp: string
}

const POLE_CONFIG: Record<string, { gradient: string; initials?: string }> = {
    P01_STRATEGIE: { gradient: "from-violet-600 to-purple-700" },
    P02_MARKET: { gradient: "from-blue-600 to-cyan-700" },
    P03_PRODUIT_TECH: { gradient: "from-emerald-600 to-teal-700" },
    P04_FINANCE: { gradient: "from-amber-500 to-yellow-600" },
    P05_MARKETING: { gradient: "from-pink-600 to-rose-700" },
    P06_LEGAL: { gradient: "from-slate-500 to-gray-600" },
    P07_TALENT_OPS: { gradient: "from-orange-500 to-red-600" },
}

// ─── Quick action pill ────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
    { label: "Structurer mon idée", msg: "Aide-moi à structurer mon idée de projet." },
    { label: "Analyser le marché", msg: "Je veux analyser mon marché cible." },
    { label: "Définir le MVP", msg: "Aide-moi à définir mon MVP." },
    { label: "Business model", msg: "Aide-moi à construire mon business model." },
    { label: "Prochaine étape", msg: "Quelle est ma prochaine étape ?" },
]

// ─── Mobile Orchestrator ──────────────────────────────────────────────────────

interface MobileOrchestratorProps {
    dossierId: string
    currentLab?: string
    dossierName: string
    onOpenDesktop?: () => void
}

export function MobileOrchestrator({ dossierId, currentLab, dossierName, onOpenDesktop }: MobileOrchestratorProps) {
    const [sessionData, setSessionData] = useState<{ id: string } | null>(null)
    const [messages, setMessages] = useState<Msg[]>([])
    const [input, setInput] = useState("")
    const [showPoles, setShowPoles] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const textareaRef = useAutoResize(input)
    const { mutateAsync: kaelRoute, isPending: sending } = useKaelRoute()
    const { data: poles = [] } = usePoles()
    const { data: activeSessionData, isLoading: isLoadingSession } = useActiveKaelSession(dossierId)

    // Initial load from active session or greeting
    useEffect(() => {
        if (sessionData) return

        if (!isLoadingSession) {
            if (activeSessionData?.session) {
                setSessionData({ id: activeSessionData.session.id })
                setMessages(activeSessionData.session.messages as Msg[])
            } else if (messages.length === 0) {
                setMessages([{
                    id: crypto.randomUUID(),
                    role: "kael",
                    content: `Bonjour. Je suis KAEL, ton assistant pour **${dossierName}**.\n\nQue veux-tu faire avancer aujourd'hui ?`,
                    timestamp: new Date().toISOString(),
                }])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingSession, activeSessionData?.session?.id])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleVoiceResult = useCallback((t: string) => setInput((p) => p ? p + " " + t : t), [])
    const { isListening, toggle: toggleVoice, interim } = useSpeech({ onResult: handleVoiceResult })

    async function handleSend(text?: string) {
        const msg = (text ?? input).trim()
        if (!msg || sending) return
        setInput("")
        const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: msg, timestamp: new Date().toISOString() }
        setMessages((prev) => [...prev, userMsg])
        try {
            const history = messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }))
            const res = await kaelRoute({ dossierId, message: msg, history, sessionId: sessionData?.id })

            if (res.sessionId && !sessionData) {
                setSessionData({ id: res.sessionId })
            }

            setMessages((prev) => [...prev, {
                id: crypto.randomUUID(),
                role: "kael",
                content: res.response ?? res.message ?? "Réponse reçue.",
                timestamp: new Date().toISOString(),
            }])
        } catch {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "kael", content: "Une erreur est survenue.", timestamp: new Date().toISOString() }])
        }
    }

    return (
        <div className="h-dvh flex flex-col bg-[#060608] overflow-hidden">
            {/* ── Header ── */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center bg-primary/15 border border-primary/25 shrink-0">
                        <img src="/images/experts/Kael.webp" alt="KAEL" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white/90">KAEL</p>
                        <p className="text-[9px] text-white/30">{dossierName}
                            {currentLab && <> · <span className="text-primary/60">{currentLab.replace(/_/g, " ")}</span></>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {/* Poles toggle */}
                    <button
                        onClick={() => setShowPoles((p) => !p)}
                        className={cn(
                            "p-2 rounded-xl transition-colors text-xs font-medium",
                            showPoles ? "bg-white/[0.08] text-white/70" : "bg-white/[0.04] text-white/25 hover:text-white/50"
                        )}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    {/* Switch to desktop (tablet+) */}
                    {onOpenDesktop && (
                        <button
                            onClick={onOpenDesktop}
                            className="p-2 rounded-xl bg-white/[0.04] text-white/25 hover:text-white/50 transition-colors"
                        >
                            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                        </button>
                    )}
                </div>
            </header>

            {/* ── Experts row (collapsible) ── */}
            {showPoles && (
                <div className="flex gap-2 px-4 py-3 border-b border-white/[0.04] overflow-x-auto [&::-webkit-scrollbar]:hidden shrink-0">
                    {poles.map((pole) => {
                        const cfg = POLE_CONFIG[pole.code] ?? { gradient: "from-gray-600 to-gray-700" }
                        return (
                            <button
                                key={pole.id}
                                onClick={() => handleSend(`Je veux parler avec ${pole.managerName}.`)}
                                className={cn(
                                    "flex flex-col items-center gap-1 shrink-0 transition-transform active:scale-95"
                                )}
                            >
                                <div className={cn(
                                    "w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br shadow-lg shrink-0",
                                    cfg.gradient
                                )}>
                                    <img src={getExpertImage(pole.managerName)} alt={pole.managerName} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[8px] text-white/30 font-medium">{normalizeManagerName(pole.managerName)}</span>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {isLoadingSession && !sessionData ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                                {msg.role === "kael" && (
                                    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
                                        <img src="/images/experts/Kael.webp" alt="KAEL" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className={cn(
                                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                    msg.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-br-sm"
                                        : "bg-white/[0.05] text-white/85 rounded-bl-sm border border-white/[0.04]"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    <p className={cn("text-[9px] mt-0.5 opacity-30", msg.role === "user" ? "text-right" : "")}>
                                        {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {sending && (
                            <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 border border-primary/20 shrink-0">
                                    <img src="/images/experts/Kael.webp" alt="KAEL" className="w-full h-full object-cover opacity-50 animate-pulse" />
                                </div>
                                <div className="bg-white/[0.05] border border-white/[0.04] rounded-2xl rounded-bl-sm px-4 py-3">
                                    <div className="flex gap-1">
                                        {[0, 150, 300].map((d) => (
                                            <span key={d} className="w-1.5 h-1.5 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>

            {/* ── Quick actions (only if few messages) ── */}
            {!isLoadingSession && messages.length <= 2 && (
                <div className="px-4 pb-3 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden shrink-0">
                    {QUICK_ACTIONS.map((a) => (
                        <button
                            key={a.label}
                            onClick={() => handleSend(a.msg)}
                            className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/70 transition-colors active:scale-95"
                        >
                            {a.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Input ── */}
            <div className="shrink-0 px-4 pb-6 pt-3 border-t border-white/[0.04]">
                {interim && (
                    <p className="text-[10px] text-white/25 italic mb-2 px-1">{interim}</p>
                )}
                <div className="flex items-end gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3 py-2 focus-within:border-primary/30 transition-colors">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                        placeholder="Message à KAEL…"
                        className="flex-1 min-h-[36px] max-h-[100px] text-sm resize-none bg-transparent border-0 shadow-none text-white/85 placeholder:text-white/20 focus:ring-0 focus-visible:ring-0 p-0 overflow-y-auto"
                        rows={1}
                        disabled={sending}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={toggleVoice}
                            className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                isListening ? "text-red-400" : "text-white/25 hover:text-white/50"
                            )}
                        >
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                        <Button
                            size="sm"
                            onClick={() => handleSend()}
                            disabled={sending || !input.trim()}
                            className="rounded-xl h-8 w-8 p-0 bg-primary/80 hover:bg-primary border-0"
                        >
                            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
