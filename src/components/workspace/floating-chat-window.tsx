"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSpeech } from "@/hooks/use-speech"
import { useAutoResize } from "@/hooks/use-auto-resize"
import {
    useSendPoleMessage,
    useStartPoleSession,
    useKaelRoute,
    type PoleData,
    type PoleSessionData,
} from "@/hooks/use-poles"
import { Send, Mic, MicOff, Loader2, Sparkles, BookmarkPlus, Check, Minus, X } from "lucide-react"
import { useWorkspaceStore } from "@/store/workspace.store"

const POLE_GRADIENTS: Record<string, string> = {
    P01_STRATEGIE: "from-violet-600 to-purple-800",
    P02_MARKET: "from-blue-600 to-cyan-700",
    P03_PRODUIT_TECH: "from-emerald-600 to-teal-700",
    P04_FINANCE: "from-amber-500 to-yellow-600",
    P05_MARKETING: "from-pink-600 to-rose-700",
    P06_LEGAL: "from-slate-600 to-gray-700",
    P07_TALENT_OPS: "from-orange-600 to-red-700",
}

interface Msg {
    id: string
    role: "user" | "manager" | "kael"
    content: string
    timestamp: string
}

// ─── Pole Chat ───────────────────────────────────────────────────────────────

interface PoleChatWindowProps {
    chatKey: string
    pole: PoleData
    dossierId: string
    currentLab?: string
    isFocused: boolean
    minimized: boolean
}

export function PoleChatWindow({
    chatKey,
    pole,
    dossierId,
    currentLab,
    isFocused,
    minimized,
}: PoleChatWindowProps) {
    const { closeChat, toggleMinimizeChat, focusChat } = useWorkspaceStore()
    const [session, setSession] = useState<PoleSessionData | null>(null)
    const [messages, setMessages] = useState<Msg[]>([])
    const [input, setInput] = useState("")
    const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set())
    const [savingMsgId, setSavingMsgId] = useState<string | null>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const textareaRef = useAutoResize(input)

    const { mutateAsync: startSession } = useStartPoleSession()
    const { mutateAsync: sendMessage, isPending: sending } = useSendPoleMessage()

    const gradient = POLE_GRADIENTS[pole.code] ?? "from-gray-600 to-gray-800"

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: crypto.randomUUID(),
                role: "manager",
                content: getManagerGreeting(pole.managerName),
                timestamp: new Date().toISOString(),
            }])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pole.managerName])

    useEffect(() => {
        if (!minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, minimized])

    async function handleSend() {
        const text = input.trim()
        if (!text || sending) return
        setInput("")
        const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date().toISOString() }
        setMessages((prev) => [...prev, userMsg])
        try {
            if (!session) {
                const result = await startSession({ poleId: pole.id, dossierId, userMessage: text, currentLab })
                setSession(result.session)
                setMessages(result.session.messages as Msg[])
            } else {
                const result = await sendMessage({ sessionId: session.id, userMessage: text })
                setSession(result.session)
                setMessages(result.session.messages as Msg[])
            }
        } catch {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "manager", content: "Une erreur est survenue. Réessayez.", timestamp: new Date().toISOString() }])
        }
    }

    async function handleSaveAsCard(msg: Msg) {
        if (savingMsgId || savedMsgIds.has(msg.id)) return
        setSavingMsgId(msg.id)
        try {
            await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dossierId, title: msg.content.split("\n")[0].slice(0, 120) || "Note", content: { text: msg.content }, cardType: "ANALYSIS", poleCode: pole.code, source: "EXPERT" }),
            })
            setSavedMsgIds((prev) => { const next = new Set(prev); next.add(msg.id); return next })
        } finally { setSavingMsgId(null) }
    }

    const handleVoiceResult = useCallback((t: string) => setInput((p) => p ? p + " " + t : t), [])
    const { isListening, toggle: toggleVoice, interim } = useSpeech({ onResult: handleVoiceResult })

    if (minimized) return null // rendered as tab by ChatTray

    return (
        <div
            className={cn(
                "flex flex-col w-[320px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 border",
                "bg-[#111111]",
                isFocused ? "border-primary/40 shadow-primary/10" : "border-white/10"
            )}
            style={{ height: 480 }}
            onClick={() => focusChat(chatKey)}
        >
            {/* Header */}
            <div className={cn("flex items-center gap-2.5 px-3 py-2.5 shrink-0 bg-gradient-to-r text-white", gradient)}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black bg-white/20">
                    {pole.managerName.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{pole.managerName}</p>
                    <p className="text-[10px] opacity-70 truncate">{pole.code.replace(/_/g, " ")}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleMinimizeChat(chatKey) }} className="p-1 rounded hover:bg-white/20 transition-colors">
                    <Minus className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); closeChat(chatKey) }} className="p-1 rounded hover:bg-white/20 transition-colors">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0 text-sm">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex group", msg.role === "user" ? "justify-end" : "justify-start")}>
                        {msg.role === "manager" && (
                            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white mr-1.5 shrink-0 mt-0.5 bg-gradient-to-br", gradient)}>
                                {pole.managerName.slice(0, 1)}
                            </div>
                        )}
                        <div className="max-w-[82%] flex flex-col gap-0.5">
                            <div className={cn("rounded-xl px-3 py-2 text-xs", msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white/8 text-white/90 rounded-bl-sm")}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                <p className={cn("text-[9px] mt-0.5 opacity-40", msg.role === "user" ? "text-right" : "")}>
                                    {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                            {msg.role === "manager" && (
                                <button
                                    onClick={() => handleSaveAsCard(msg)}
                                    disabled={savingMsgId === msg.id || savedMsgIds.has(msg.id)}
                                    className={cn("self-start flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] transition-all",
                                        savedMsgIds.has(msg.id) ? "text-emerald-500" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:bg-muted")}
                                >
                                    {savedMsgIds.has(msg.id) ? <><Check className="h-2.5 w-2.5" /> Carte créée</> : savingMsgId === msg.id ? <><Loader2 className="h-2.5 w-2.5 animate-spin" /></> : <><BookmarkPlus className="h-2.5 w-2.5" /> Carte</>}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {sending && (
                    <div className="flex"><div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white mr-1.5 shrink-0 bg-gradient-to-br", gradient)}>{pole.managerName.slice(0, 1)}</div><div className="bg-white/8 rounded-xl px-3 py-2"><div className="flex gap-0.5">{[0, 150, 300].map((d) => <span key={d} className="w-1 h-1 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div></div></div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 py-2 border-t border-white/5">
                <div className="flex items-end gap-1.5">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend() }}
                        placeholder={`Message à ${pole.managerName}…`}
                        className="min-h-[36px] text-xs resize-none rounded-lg py-2 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/40"
                        rows={1}
                        disabled={sending}
                    />
                    {interim && <p className="text-[9px] text-muted-foreground/50 italic">{interim}</p>}
                    <button onClick={toggleVoice} className={cn("p-2 rounded-lg transition-colors shrink-0", isListening ? "bg-red-500/10 text-red-500" : "hover:bg-muted text-muted-foreground")}>
                        {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </button>
                    <Button size="sm" onClick={handleSend} disabled={sending || !input.trim()} className="rounded-lg px-2 h-8 shrink-0">
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─── KAEL Chat ────────────────────────────────────────────────────────────────

interface KaelChatWindowProps {
    chatKey: string
    dossierId: string
    currentLab?: string
    isFocused: boolean
    minimized: boolean
}

interface KaelMsg {
    id: string
    role: "user" | "kael"
    content: string
    timestamp: string
}

export function KaelChatWindow({ chatKey, dossierId, currentLab, isFocused, minimized }: KaelChatWindowProps) {
    const { closeChat, toggleMinimizeChat, focusChat } = useWorkspaceStore()
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
        if (!minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, minimized])

    const handleVoiceResult = useCallback((t: string) => setInput((p) => p ? p + " " + t : t), [])
    const { isListening, toggle: toggleVoice, interim } = useSpeech({ onResult: handleVoiceResult })

    async function handleSend() {
        const text = input.trim()
        if (!text || sending) return
        setInput("")
        const userMsg: KaelMsg = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date().toISOString() }
        setMessages((prev) => [...prev, userMsg])
        try {
            const history = messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }))
            const res = await kaelRoute({ dossierId, message: text, history })
            setMessages((prev) => [...prev, {
                id: crypto.randomUUID(), role: "kael",
                content: res.response ?? res.message ?? "Réponse reçue.",
                timestamp: new Date().toISOString(),
            }])
        } catch {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "kael", content: "Une erreur est survenue.", timestamp: new Date().toISOString() }])
        }
    }

    if (minimized) return null

    return (
        <div
            className={cn(
                "flex flex-col w-[320px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 border",
                "bg-[#111111]",
                isFocused ? "border-primary/60 shadow-primary/20 ring-1 ring-primary/20" : "border-white/10"
            )}
            style={{ height: 480 }}
            onClick={() => focusChat(chatKey)}
        >
            {/* Header — KAEL style */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 shrink-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/20">
                    <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs">KAEL</p>
                    <p className="text-[10px] opacity-70">Orchestrateur · Vue globale</p>
                </div>
                {currentLab && (
                    <Badge variant="outline" className="text-white border-white/30 text-[9px] h-5">
                        {currentLab.replace(/_/g, " ")}
                    </Badge>
                )}
                <button onClick={(e) => { e.stopPropagation(); toggleMinimizeChat(chatKey) }} className="p-1 rounded hover:bg-white/20 transition-colors">
                    <Minus className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); closeChat(chatKey) }} className="p-1 rounded hover:bg-white/20 transition-colors">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0 text-sm">
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        {msg.role === "kael" && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center mr-1.5 shrink-0 mt-0.5 bg-primary/10 border border-primary/20">
                                <Sparkles className="h-2.5 w-2.5 text-primary" />
                            </div>
                        )}
                        <div className={cn("rounded-xl px-3 py-2 text-xs max-w-[82%]", msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white/8 text-white/90 rounded-bl-sm")}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            <p className={cn("text-[9px] mt-0.5 opacity-40", msg.role === "user" ? "text-right" : "")}>
                                {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                    </div>
                ))}
                {sending && (
                    <div className="flex"><div className="w-5 h-5 rounded-full flex items-center justify-center mr-1.5 shrink-0 bg-primary/10 border border-primary/20"><Sparkles className="h-2.5 w-2.5 text-primary animate-pulse" /></div><div className="bg-white/8 rounded-xl px-3 py-2"><div className="flex gap-0.5">{[0, 150, 300].map((d) => <span key={d} className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div></div></div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 py-2 border-t border-white/5">
                <div className="flex items-end gap-1.5">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend() }}
                        placeholder="Message à KAEL… (⌘↵)"
                        className="min-h-[36px] text-xs resize-none rounded-lg py-2 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/40"
                        rows={1}
                        disabled={sending}
                    />
                    {interim && <p className="text-[9px] text-muted-foreground/50 italic">{interim}</p>}
                    <button onClick={toggleVoice} className={cn("p-2 rounded-lg transition-colors shrink-0", isListening ? "bg-red-500/10 text-red-500" : "hover:bg-muted text-muted-foreground")}>
                        {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </button>
                    <Button size="sm" onClick={handleSend} disabled={sending || !input.trim()} className="rounded-lg px-2 h-8 shrink-0">
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// Greeting helper
function getManagerGreeting(name: string): string {
    const greetings: Record<string, string> = {
        AXEL: "Bonjour. Je suis AXEL, ton Directeur Stratégie & Innovation.\n\nJe challenge les idées sans ménagement et je valide ce qui est solide. Sur quel défi stratégique travaillons-nous ?",
        MAYA: "Bonjour. Je suis MAYA, ta Directrice Market & Intelligence.\n\nJe produis de l'intelligence marché qui permet de décider, pas juste d'informer. Quel marché veux-tu analyser ?",
        KAI: "Bonjour. Je suis KAI, ton Architecte Produit & Tech.\n\nJe transforme les idées en plans d'implémentation actionnables. Décris-moi ce que tu veux construire.",
        ELENA: "Bonjour. Je suis ELENA, ta Directrice Financière.\n\nJe travaille toujours avec des hypothèses explicites. Quel modèle économique modélisons-nous ?",
        ZARA: "Bonjour. Je suis ZARA, ta Chief Marketing Officer.\n\nJe construis des marques qui convertissent. Quel projet de marque travaillons-nous ?",
        MARCUS: "Bonjour. Je suis MARCUS, ton Conseiller Juridique.\n\nJ'identifie les risques et propose des solutions concrètes. Quel risque légal veux-tu traiter ?",
        NOVA: "Bonjour. Je suis NOVA, ta Directrice des Opérations.\n\nQuels sont tes besoins en ressources ou coordination ?",
    }
    return greetings[name] ?? `Bonjour, je suis ${name}. Comment puis-je vous aider ?`
}
