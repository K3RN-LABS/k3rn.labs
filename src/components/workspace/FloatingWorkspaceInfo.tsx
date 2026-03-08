"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ScoreMeter } from "@/components/score/score-meter"
import { ChevronRight, ChevronDown, Loader2 } from "lucide-react"

const LAB_LABELS: Record<string, string> = {
    DISCOVERY: "Discovery",
    STRUCTURATION: "Structuration",
    VALIDATION_MARCHE: "Market Validation",
    DESIGN_PRODUIT: "Product Design",
    ARCHITECTURE_TECHNIQUE: "Tech Architecture",
    BUSINESS_FINANCE: "Business & Finance",
}

interface FloatingWorkspaceInfoProps {
    dossierId: string
    labData?: {
        labState?: { currentLab: string }
        nextLab?: string
        canTransition?: boolean
        missingCards?: string[]
    }
    onTransitionLab?: () => void
    transitioning?: boolean
    className?: string
}

export function FloatingWorkspaceInfo({
    dossierId,
    labData,
    onTransitionLab,
    transitioning,
    className
}: FloatingWorkspaceInfoProps) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div className={cn(
            "absolute bottom-24 left-4 z-20 pointer-events-auto",
            "w-52 flex flex-col gap-2",
            "animate-in fade-in slide-in-from-left-2 duration-300",
            className
        )}>
            {/* Score panel */}
            <div className={cn(
                "rounded-2xl border border-white/8 bg-black/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
                "overflow-hidden transition-all duration-200"
            )}>
                {/* Header */}
                <button
                    onClick={() => setCollapsed(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/4 transition-colors"
                >
                    <span className="text-[9px] font-jakarta uppercase tracking-[0.2em] text-white/30">Progression</span>
                    {collapsed
                        ? <ChevronDown className="h-3 w-3 text-white/20" />
                        : <ChevronRight className="h-3 w-3 text-white/20 rotate-90" />
                    }
                </button>

                {!collapsed && <ScoreMeter dossierId={dossierId} />}
            </div>

            {/* Lab transition panel */}
            {labData?.nextLab && !collapsed && (
                <div className="rounded-xl border border-white/8 bg-black/50 backdrop-blur-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-jakarta uppercase tracking-[0.15em] text-white/25">Prochaine phase</p>
                            <p className="text-[11px] font-semibold text-white/60 mt-0.5">
                                {LAB_LABELS[labData.nextLab] ?? labData.nextLab.replace(/_/g, " ")}
                            </p>
                        </div>
                        <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                            labData.canTransition
                                ? "bg-primary/20 border border-primary/30"
                                : "bg-white/5 border border-white/10"
                        )}>
                            <ChevronRight className={cn("h-3 w-3", labData.canTransition ? "text-primary" : "text-white/20")} />
                        </div>
                    </div>

                    {labData.missingCards && labData.missingCards.length > 0 && (
                        <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-2.5 py-2">
                            <p className="text-[9px] text-red-400/70 leading-relaxed">
                                Manque : {labData.missingCards.join(", ")}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={onTransitionLab}
                        disabled={!labData.canTransition || transitioning}
                        className={cn(
                            "w-full text-[10px] font-semibold h-7 rounded-lg transition-all",
                            labData.canTransition
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-white/5 text-white/20 cursor-not-allowed"
                        )}
                    >
                        {transitioning ? (
                            <span className="flex items-center justify-center gap-1.5">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Transition...
                            </span>
                        ) : (
                            "Passer à l\u2019étape suivante"
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
