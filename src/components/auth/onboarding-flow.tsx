"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ChevronRight, ArrowRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface OnboardingStep {
    id: string
    question: string
    description?: string
    placeholder: string
    field: string
    type?: "text" | "email" | "select"
    options?: string[]
}

const STEPS: OnboardingStep[] = [
    {
        id: "name",
        question: "Commençons par faire connaissance. Quel est ton prénom ?",
        placeholder: "Ton prénom",
        field: "firstName"
    },
    {
        id: "lastName",
        question: "Et ton nom de famille ?",
        placeholder: "Ton nom",
        field: "lastName"
    },
    {
        id: "company",
        question: "Où travailles-tu actuellement ?",
        description: "Nom de ton entreprise ou de ton projet.",
        placeholder: "Startup co. / Projet Alpha",
        field: "company"
    },
    {
        id: "industry",
        question: "Dans quel secteur d'activité évolues-tu ?",
        placeholder: "Secteur (ex: IA, Santé, Fintech...)",
        field: "industry"
    },
    {
        id: "goal",
        question: "Quel est ton objectif principal avec k3rn ?",
        description: "Explique-nous ce que tu veux débloquer aujourd'hui.",
        placeholder: "Ex: Accélérer ma R&D, valider mon marché...",
        field: "goal"
    }
]

export default function OnboardingFlow() {
    const [currentStepIdx, setCurrentStepIdx] = useState(0)
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [inputValue, setInputValue] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const currentStep = STEPS[currentStepIdx]
    const progress = ((currentStepIdx + 1) / STEPS.length) * 100

    useEffect(() => {
        // Restore value if user goes back
        setInputValue(formData[currentStep.field] || "")
    }, [currentStepIdx, currentStep.field, formData])

    const handleNext = async () => {
        if (!inputValue.trim()) return

        const newData = { ...formData, [currentStep.field]: inputValue }
        setFormData(newData)

        if (currentStepIdx < STEPS.length - 1) {
            setCurrentStepIdx(currentStepIdx + 1)
            setInputValue("")
        } else {
            await handleSubmit(newData)
        }
    }

    const handleSubmit = async (finalData: Record<string, string>) => {
        setIsSubmitting(true)
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...finalData,
                    onboardingCompleted: true
                })
            })

            if (!res.ok) throw new Error("Erreur lors de la sauvegarde")

            router.push("/home")
            router.refresh()
        } catch (err) {
            console.error(err)
            setIsSubmitting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleNext()
        }
    }

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#E84000]/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full p-8 z-50">
                <div className="max-w-xl mx-auto space-y-2">
                    <div className="flex justify-between text-[10px] text-white/30 font-medium uppercase tracking-widest">
                        <span>Question {currentStepIdx + 1} sur {STEPS.length}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-white/5 transition-all duration-700" />
                </div>
            </div>

            {/* Step Container */}
            <div className="relative w-full max-w-2xl z-40">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-[#E84000]">{currentStepIdx + 1} <ArrowRight className="inline-block w-3 h-3 ml-1 opacity-50" /></span>
                                <h1 className="text-2xl sm:text-3xl font-semibold text-white/90 leading-tight">
                                    {currentStep.question}
                                </h1>
                            </div>
                            {currentStep.description && (
                                <p className="text-base text-white/40 ml-8 max-w-lg">
                                    {currentStep.description}
                                </p>
                            )}
                        </div>

                        <div className="ml-8 space-y-6">
                            <div className="relative group">
                                <input
                                    autoFocus
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={currentStep.placeholder}
                                    className="w-full bg-transparent border-b border-white/10 py-4 text-xl sm:text-2xl text-white outline-none transition-all placeholder:text-white/10 focus:border-[#E84000]/50"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="flex items-center gap-4 pt-4">
                                <Button
                                    onClick={handleNext}
                                    disabled={!inputValue.trim() || isSubmitting}
                                    className="bg-[#E84000] hover:bg-[#ff4d00] text-white px-8 h-12 rounded-lg font-medium shadow-[0_0_20px_rgba(232,64,0,0.2)] transition-all hover:scale-105"
                                >
                                    {currentStepIdx === STEPS.length - 1 ? (isSubmitting ? "Finalisation..." : "C'est parti !") : "Continuer"}
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                                <div className="text-[10px] text-white/20 font-medium uppercase tracking-widest">
                                    Appuie sur <span className="text-white/40 px-1.5 py-0.5 border border-white/10 rounded-sm mx-1">Entrée</span> pour passer à la suite
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Branding */}
            <div className="absolute bottom-12 text-center z-40 opacity-30">
                <div className="flex items-center gap-2 grayscale group hover:grayscale-0 transition-all cursor-default">
                    <img src="/logo-icon/logo.svg" alt="k3rn" className="w-6 h-6 animate-pulse" />
                    <span className="text-sm font-semibold tracking-tighter text-white">k3rn.<span className="text-white">labs</span></span>
                </div>
            </div>

            {/* Decorative Panels (Glassmorphism inspired by Dock) */}
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
        </div>
    )
}
