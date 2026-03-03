"use client"

import { cn } from "@/lib/utils"
import { ScoreMeter } from "@/components/score/score-meter"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

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
    return (
        <div className={cn(
            "absolute bottom-24 left-6 z-20 flex flex-col gap-4 w-64 pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-500",
            className
        )}>
            {/* Score Meter - Glass implementation */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-none">
                <ScoreMeter dossierId={dossierId} />
            </div>

            {/* Lab Progression */}
            {labData?.nextLab && (
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-none space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-jakarta tracking-[0.2em] text-white/20 uppercase">Prochaine phase</p>
                            <p className="text-xs font-semibold text-white/70">
                                {LAB_LABELS[labData.nextLab] ?? labData.nextLab.replace(/_/g, " ")}
                            </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <ArrowRight className="h-3.5 w-3.5 text-primary" />
                        </div>
                    </div>

                    {labData.missingCards && labData.missingCards.length > 0 && (
                        <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                            <p className="text-[10px] text-red-400/80 leading-relaxed font-medium">
                                <span className="text-red-400 mr-1">•</span>
                                Manque : {labData.missingCards.join(", ")}
                            </p>
                        </div>
                    )}

                    <Button
                        size="sm"
                        className={cn(
                            "w-full text-xs h-9 rounded-xl border-0 transition-all font-semibold",
                            labData.canTransition
                                ? "bg-primary text-white hover:bg-primary/90 shadow-[0_0_15px_rgba(232,64,0,0.3)] active:scale-[0.98]"
                                : "bg-white/5 text-white/20 cursor-not-allowed"
                        )}
                        disabled={!labData.canTransition || transitioning}
                        onClick={onTransitionLab}
                    >
                        {transitioning ? (
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Transition...
                            </div>
                        ) : (
                            "Passer à l'étape suivante"
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}
