"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSpeech } from "@/hooks/use-speech"
import { useAutoResize } from "@/hooks/use-auto-resize"
import { useNotificationSound } from "@/hooks/use-notification-sound"
import {
    useSendPoleMessage,
    useStartPoleSession,
    useActivePoleSession,
    useKaelRoute,
    type PoleData,
    type PoleSessionData,
} from "@/hooks/use-poles"
import { Send, Mic, MicOff, Loader2, Sparkles, BookmarkPlus, Check, X, ChevronDown } from "lucide-react"
import { useWorkspaceStore } from "@/store/workspace.store"

// ─── Pole config ─────────────────────────────────────────────────────────────

const POLE_GRADIENTS: Record<string, string> = {
    P01_STRATEGIE: "from-violet-600 to-purple-800",
    P02_MARKET: "from-blue-600 to-cyan-700",
    P03_PRODUIT_TECH: "from-emerald-600 to-teal-700",
    P04_FINANCE: "from-amber-500 to-yellow-600",
    P05_MARKETING: "from-pink-600 to-rose-700",
    P06_LEGAL: "from-slate-600 to-gray-700",
    P07_TALENT_OPS: "from-orange-600 to-red-700",
}

// ─── Shared types ─────────────────────────────────────────────────────────────

interface Msg {
    id: string
    role: "user" | "manager" | "kael"
    content: string
    timestamp: string
}

// ─── Shared chat input ────────────────────────────────────────────────────────

interface ChatInputProps {
    input: string
    setInput: (v: string | ((p: string) => string)) => void
    onSend: () => void
    sending: boolean
    placeholder: string
}

function ChatInput({ input, setInput, onSend, sending, placeholder }: ChatInputProps) {
    const textareaRef = useAutoResize(input)
    const handleVoiceResult = useCallback((t: string) => setInput((p) => p ? p + " " + t : t), [setInput])
    const { isListening, toggle: toggleVoice, interim } = useSpeech({ onResult: handleVoiceResult })

    return (
        <div className="shrink-0 px-4 py-3 border-t border-white/[0.05]">
            {interim && (
                <p className="text-[10px] text-white/30 italic mb-1.5 px-1">{interim}</p>
            )}
            <div className="flex items-end gap-2">
                <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSend() }}
                    placeholder={placeholder}
                    className="min-h-[36px] max-h-[120px] text-sm resize-none rounded-xl py-2 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 focus:border-primary/40 focus:bg-white/[0.06] transition-colors overflow-y-auto"
                    rows={1}
                    disabled={sending}
                />
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={toggleVoice}
                        className={cn(
                            "p-2 rounded-xl transition-colors",
                            isListening ? "bg-red-500/15 text-red-400" : "bg-white/[0.04] text-white/30 hover:bg-white/[0.08] hover:text-white/60"
                        )}
                    >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <Button
                        size="sm"
                        onClick={onSend}
                        disabled={sending || !input.trim()}
                        className="rounded-xl px-3 h-9 bg-primary/90 hover:bg-primary border-0 shadow-[0_4px_12px_rgba(var(--primary),0.3)]"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <p className="text-[9px] text-white/15 text-right mt-1">⌘↵ pour envoyer</p>
        </div>
    )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
    msg,
    avatar,
    onSave,
    saving,
    saved,
}: {
    msg: Msg
    avatar?: React.ReactNode
    onSave?: () => void
    saving?: boolean
    saved?: boolean
}) {
    const isUser = msg.role === "user"
    return (
        <div className={cn("flex group gap-2", isUser ? "justify-end" : "justify-start")}>
            {!isUser && avatar && <div className="shrink-0 mt-0.5">{avatar}</div>}
            <div className="max-w-[78%] flex flex-col gap-1">
                <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    isUser
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-white/[0.06] text-white/90 rounded-bl-sm border border-white/[0.05]"
                )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn("text-[9px] mt-1 opacity-35", isUser ? "text-right" : "")}>
                        {new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
                {!isUser && onSave && (
                    <button
                        onClick={onSave}
                        disabled={saving || saved}
                        className={cn(
                            "self-start flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-all",
                            saved ? "text-emerald-400" : "text-white/20 opacity-0 group-hover:opacity-100 hover:text-white/50 hover:bg-white/[0.05]"
                        )}
                    >
                        {saved ? <><Check className="h-2.5 w-2.5" /> Carte créée</> : saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><BookmarkPlus className="h-2.5 w-2.5" /> Carte</>}
                    </button>
                )}
            </div>
        </div>
    )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ avatar }: { avatar: React.ReactNode }) {
    return (
        <div className="flex gap-2">
            <div className="shrink-0">{avatar}</div>
            <div className="bg-white/[0.06] border border-white/[0.05] rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                        <span key={d} className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Panel shell ──────────────────────────────────────────────────────────────

interface PanelShellProps {
    header: React.ReactNode
    children: React.ReactNode
    onClose: () => void
    className?: string
}

function PanelShell({ header, children, onClose, className }: PanelShellProps) {
    return (
        <>
            <div className="fixed inset-0 z-[65] bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
            <div
                className={cn(
                    "fixed bottom-[80px] z-[66] w-[400px]",
                    "flex flex-col rounded-2xl overflow-hidden",
                    "border border-white/[0.08] bg-[#0d0d0d]",
                    "shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]",
                    "animate-in slide-in-from-bottom-4 duration-250",
                    className
                )}
                style={{ height: 540 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none rounded-2xl" />
                {header}
                {children}
            </div>
        </>
    )
}

// ─── KAEL Slide-Up Panel ──────────────────────────────────────────────────────

interface KaelSlideUpProps {
    dossierId: string
    currentLab?: string
    onClose: () => void
}

export function KaelSlideUpPanel({ dossierId, currentLab, onClose }: KaelSlideUpProps) {
    const { clearUnread } = useWorkspaceStore()
    const [messages, setMessages] = useState<Msg[]>([{
        id: "kael-welcome",
        role: "kael",
        content: "Bonjour. Je suis KAEL, ton assistant.\n\nJ'ai une vue globale de ton workspace. Qu'est-ce que tu veux explorer ou débloquer ?",
        timestamp: new Date().toISOString(),
    }])
    const [input, setInput] = useState("")
    const bottomRef = useRef<HTMLDivElement>(null)
    const { mutateAsync: kaelRoute, isPending: sending } = useKaelRoute()
    const { play: playSound } = useNotificationSound()

    // Clear unread badge when panel opens
    useEffect(() => {
        clearUnread("kael")
    }, [clearUnread])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    async function handleSend() {
        const text = input.trim()
        if (!text || sending) return
        setInput("")
        const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date().toISOString() }
        setMessages((prev) => [...prev, userMsg])
        try {
            const history = messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }))
            const res = await kaelRoute({ dossierId, message: text, history })
            setMessages((prev) => [...prev, {
                id: crypto.randomUUID(),
                role: "kael",
                content: res.response ?? res.message ?? "Réponse reçue.",
                timestamp: new Date().toISOString(),
            }])
            // Play sound — panel is open so no badge, but still audible feedback
            playSound()
        } catch {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "kael", content: "Une erreur est survenue.", timestamp: new Date().toISOString() }])
        }
    }

    const kaelAvatar = (
        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 border border-primary/25 shrink-0">
            <img src="/images/experts/Kael.webp" alt="KAEL" className="w-full h-full object-cover" />
        </div>
    )

    return (
        <PanelShell
            onClose={onClose}
            className="left-1/2 -translate-x-1/2"
            header={
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05] shrink-0 bg-gradient-to-r from-primary/[0.08] to-transparent relative z-[1]">
                    <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center bg-primary/15 border border-primary/25 shrink-0 shadow-sm transition-transform hover:scale-105">
                        <img src="/images/experts/Kael.webp" alt="KAEL" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold tracking-tight">KAEL</p>
                        <p className="text-[10px] text-white/35">Assistant · Vue globale</p>
                    </div>
                    {currentLab && (
                        <Badge variant="outline" className="text-[9px] h-5 border-primary/25 text-primary/70">
                            {currentLab.replace(/_/g, " ")}
                        </Badge>
                    )}
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                        <ChevronDown className="h-4 w-4" />
                    </button>
                </div>
            }
        >
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} avatar={kaelAvatar} />
                ))}
                {sending && <TypingIndicator avatar={kaelAvatar} />}
                <div ref={bottomRef} />
            </div>
            <ChatInput input={input} setInput={setInput} onSend={handleSend} sending={sending} placeholder="Message à KAEL…" />
        </PanelShell>
    )
}

// ─── Pole Slide-Up Panel ──────────────────────────────────────────────────────

interface PoleSlideUpProps {
    pole: PoleData
    dossierId: string
    currentLab?: string
    onClose: () => void
}

export function PoleSlideUpPanel({ pole, dossierId, currentLab, onClose }: PoleSlideUpProps) {
    const { markUnread, clearUnread, notifSoundEnabled } = useWorkspaceStore()
    const [session, setSession] = useState<PoleSessionData | null>(null)
    const [messages, setMessages] = useState<Msg[]>([])
    const [input, setInput] = useState("")
    const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set())
    const [savingMsgId, setSavingMsgId] = useState<string | null>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    // Track if panel is visible (mounted = visible)
    const isVisibleRef = useRef(true)

    const { mutateAsync: startSession } = useStartPoleSession()
    const { mutateAsync: sendMessage, isPending: sending } = useSendPoleMessage()
    const { play: playSound } = useNotificationSound()

    const chatKey = `pole-${pole.id}`
    const gradient = POLE_GRADIENTS[pole.code] ?? "from-gray-600 to-gray-800"

    const { data: activeSessionData, isLoading: isLoadingSession } = useActivePoleSession(pole.id, dossierId)

    // Initial load from active session or greeting
    useEffect(() => {
        if (session) return // Already explicitly set

        if (!isLoadingSession) {
            if (activeSessionData?.session) {
                setSession(activeSessionData.session)
                setMessages(activeSessionData.session.messages as Msg[])
            } else if (messages.length === 0) {
                setMessages([{
                    id: crypto.randomUUID(),
                    role: "manager",
                    content: getManagerGreeting(pole.managerName),
                    timestamp: new Date().toISOString(),
                }])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingSession, activeSessionData?.session?.id, pole.managerName])

    // Clear unread when panel opens, mark not visible on unmount
    useEffect(() => {
        clearUnread(chatKey)
        isVisibleRef.current = true
        return () => { isVisibleRef.current = false }
    }, [chatKey, clearUnread])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

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
            // Sound feedback on manager reply
            if (notifSoundEnabled) playSound()
        } catch {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "manager", content: "Une erreur est survenue.", timestamp: new Date().toISOString() }])
        }
    }

    async function handleSaveAsCard(msg: Msg) {
        if (savingMsgId || savedMsgIds.has(msg.id)) return
        setSavingMsgId(msg.id)
        try {
            await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dossierId, title: msg.content.split("\n")[0].slice(0, 120) || "Note",
                    content: { text: msg.content }, cardType: "ANALYSIS", poleCode: pole.code, source: "EXPERT",
                }),
            })
            setSavedMsgIds((prev) => { const next = new Set(prev); next.add(msg.id); return next })
        } finally { setSavingMsgId(null) }
    }

    let managerImageName = pole.managerName.split(" ")[0]
    if (managerImageName.toLowerCase() === "zara") managerImageName = "Sky"
    const displayManagerName = managerImageName === "Sky" ? "Sky" : pole.managerName

    const managerAvatar = (
        <div className={cn("w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br shrink-0", gradient)}>
            <img src={`/images/experts/${managerImageName}.webp`} alt={displayManagerName} className="w-full h-full object-cover" />
        </div>
    )

    return (
        <PanelShell
            onClose={onClose}
            className="left-1/2 -translate-x-1/2"
            header={
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.05] shrink-0 relative z-[1]">
                    {/* Subtle gradient tint from pole color */}
                    <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-r to-transparent pointer-events-none", gradient)} />
                    <div className={cn("w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br shadow-lg shrink-0 transition-transform hover:scale-105", gradient)}>
                        <img src={`/images/experts/${managerImageName}.webp`} alt={displayManagerName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold tracking-tight">{displayManagerName.toUpperCase()}</p>
                        <p className="text-[10px] text-white/35">{pole.code.replace(/_/g, " ")}</p>
                    </div>
                    {currentLab && (
                        <Badge variant="outline" className="text-[9px] h-5 border-white/15 text-white/40">
                            {currentLab.replace(/_/g, " ")}
                        </Badge>
                    )}
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            }
        >
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {isLoadingSession && !session ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <MessageBubble
                                key={msg.id}
                                msg={msg}
                                avatar={managerAvatar}
                                onSave={msg.role === "manager" ? () => handleSaveAsCard(msg) : undefined}
                                saving={savingMsgId === msg.id}
                                saved={savedMsgIds.has(msg.id)}
                            />
                        ))}
                        {sending && <TypingIndicator avatar={managerAvatar} />}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>
            <ChatInput input={input} setInput={setInput} onSend={handleSend} sending={sending} placeholder={`Message à ${displayManagerName.toUpperCase()}…`} />
        </PanelShell>
    )
}

// ─── Manager greetings ────────────────────────────────────────────────────────

function getManagerGreeting(name: string): string {
    let checkName = name.split(" ")[0]
    if (checkName.toLowerCase() === "zara") checkName = "SKY"
    else checkName = checkName.toUpperCase()

    const greetings: Record<string, string> = {
        AXEL: "Bonjour. Je suis AXEL, ton Directeur Stratégie & Innovation.\n\nJe challenge les idées sans ménagement et valide ce qui est solide. Sur quel défi stratégique travaillons-nous ?",
        MAYA: "Bonjour. Je suis MAYA, ta Directrice Market & Intelligence.\n\nJe produis de l'intelligence marché pour décider, pas juste informer. Quel marché veux-tu analyser ?",
        KAI: "Bonjour. Je suis KAI, ton Architecte Produit & Tech.\n\nJe transforme les idées en plans d'implémentation actionnables. Décris-moi ce que tu veux construire.",
        ELENA: "Bonjour. Je suis ELENA, ta Directrice Financière.\n\nJe travaille toujours avec des hypothèses explicites. Quel modèle économique modélisons-nous ?",
        SKY: "Bonjour. Je suis SKY, ta Chief Marketing Officer.\n\nJe construis des marques qui convertissent. Quel projet de marque travaillons-nous ?",
        MARCUS: "Bonjour. Je suis MARCUS, ton Conseiller Juridique.\n\nJ'identifie les risques et propose des solutions concrètes. Quel risque légal veux-tu traiter ?",
        NOVA: "Bonjour. Je suis NOVA, ta Directrice des Opérations.\n\nQuels sont tes besoins en ressources ou coordination ?",
    }
    return greetings[checkName] ?? `Bonjour, je suis ${checkName}. Comment puis-je vous aider ?`
}
