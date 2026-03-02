"use client"

import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace.store"
import { PoleChatWindow, KaelChatWindow } from "@/components/workspace/floating-chat-window"
import { usePoles } from "@/hooks/use-poles"
import { Sparkles } from "lucide-react"

const POLE_GRADIENTS: Record<string, string> = {
    P01_STRATEGIE: "from-violet-600 to-purple-800",
    P02_MARKET: "from-blue-600 to-cyan-700",
    P03_PRODUIT_TECH: "from-emerald-600 to-teal-700",
    P04_FINANCE: "from-amber-500 to-yellow-600",
    P05_MARKETING: "from-pink-600 to-rose-700",
    P06_LEGAL: "from-slate-600 to-gray-700",
    P07_TALENT_OPS: "from-orange-600 to-red-700",
}

interface ChatTrayProps {
    dossierId: string
    currentLab?: string
}

export function ChatTray({ dossierId, currentLab }: ChatTrayProps) {
    const { openChats, focusedChatKey, closeChat, toggleMinimizeChat, focusChat } = useWorkspaceStore()
    const { data: poles = [] } = usePoles()

    if (openChats.length === 0) return null

    const minimizedChats = openChats.filter((c) => c.minimized)
    const expandedChats = openChats.filter((c) => !c.minimized)

    return (
        <>
            {/* Expanded chat windows — stack bottom-right horizontally, above dock
                Dock: fixed bottom-6 (24px) + ~72px height + 8px gap = bottom-[108px] */}
            <div className="fixed bottom-[108px] right-4 z-50 flex items-end gap-3 pointer-events-none">
                {expandedChats.map((chat) => {
                    const isFocused = focusedChatKey === chat.key

                    if (chat.type === "kael") {
                        return (
                            <div key={chat.key} className="pointer-events-auto">
                                <KaelChatWindow
                                    chatKey={chat.key}
                                    dossierId={dossierId}
                                    currentLab={currentLab}
                                    isFocused={isFocused}
                                    minimized={false}
                                />
                            </div>
                        )
                    }

                    if (chat.type === "pole" && chat.poleId) {
                        const pole = poles.find((p) => p.id === chat.poleId)
                        if (!pole) return null
                        return (
                            <div key={chat.key} className="pointer-events-auto">
                                <PoleChatWindow
                                    chatKey={chat.key}
                                    pole={pole}
                                    dossierId={dossierId}
                                    currentLab={currentLab}
                                    isFocused={isFocused}
                                    minimized={false}
                                />
                            </div>
                        )
                    }

                    return null
                })}
            </div>

            {/* Minimized chats — compact tabs above the dock */}
            {minimizedChats.length > 0 && (
                <div className="fixed bottom-[108px] right-4 z-40 flex flex-row-reverse gap-1.5 items-end pointer-events-auto">
                    {minimizedChats.map((chat) => {
                        const isFocused = focusedChatKey === chat.key
                        const gradient = chat.poleCode ? (POLE_GRADIENTS[chat.poleCode] ?? "from-gray-600 to-gray-800") : "from-primary to-primary/80"
                        const displayName = chat.type === "kael" ? "KAEL" : (chat.managerName ?? "Expert")
                        const initials = chat.type === "kael" ? "✦" : displayName.slice(0, 2)

                        return (
                            <button
                                key={chat.key}
                                onClick={() => { focusChat(chat.key); toggleMinimizeChat(chat.key) }}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-medium shadow-lg transition-all hover:scale-105",
                                    `bg-gradient-to-r ${gradient}`,
                                    isFocused && "ring-2 ring-white/40"
                                )}
                            >
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-black shrink-0">
                                    {chat.type === "kael" ? <Sparkles className="h-3 w-3" /> : initials}
                                </div>
                                <span>{displayName}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); closeChat(chat.key) }}
                                    className="ml-1 hover:bg-white/20 rounded p-0.5 transition-colors"
                                >
                                    <span className="text-[10px] leading-none">×</span>
                                </button>
                            </button>
                        )
                    })}
                </div>
            )}
        </>
    )
}
