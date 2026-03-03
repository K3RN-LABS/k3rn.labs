"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { ChevronLeft, Save, User, Building2, Target, Settings, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"


export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "subscription">("profile")
    const [user, setUser] = useState<any>(null)
    const router = useRouter()


    useEffect(() => {
        fetch("/api/user/profile")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch")
                return res.json()
            })
            .then(data => {
                // L'API renvoie l'objet user directement via apiSuccess
                setUser(data)
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user),
            })
            if (!res.ok) throw new Error("Failed to save")

        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
            <div className="animate-spin-double w-12 h-12 border-2 border-white/10 border-t-[#E84000] rounded-full" />
        </div>
    )

    if (!user) return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
            <p className="text-white/40">Impossible de charger votre profil.</p>
            <Button onClick={() => window.location.reload()} variant="outline">Réessayer</Button>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#060608] text-foreground selection:bg-primary/20">
            {/* Background Effects — Ambient blur */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
            </div>

            {/* Header — Minimalist thin border */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="max-w-[1400px] mx-auto">
                    <div className="flex items-center justify-between px-5 py-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-white/30 hover:text-white hover:bg-white/[0.05] transition-all rounded-lg"
                                onClick={() => router.push("/home")}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                <span className="text-[10px] font-medium tracking-wide">Retour</span>
                            </Button>
                            <Separator orientation="vertical" className="h-4 bg-white/[0.15]" />
                            <h1 className="text-xs font-jakarta font-semibold tracking-wider text-white/70">Paramètres du Compte</h1>
                        </div>
                        <Logo size="sm" className="opacity-60 hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-6 pt-32 pb-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    {/* Sidebar Nav — Minimalist layout */}
                    <aside className="lg:col-span-3 space-y-8">
                        <div>
                            <p className="text-[10px] font-jakarta font-bold tracking-[0.2em] text-white/50 uppercase mb-6 px-4">Navigation</p>
                            <nav className="flex flex-col gap-1">
                                {[
                                    { id: "profile", label: "Profil Personnel", icon: User },
                                    { id: "preferences", label: "Préférences Système", icon: Settings },
                                    { id: "subscription", label: "Abonnement & Licence", icon: Zap },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all border group",
                                            activeTab === tab.id
                                                ? "bg-white/[0.04] text-white border-white/[0.08]"
                                                : "text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.02]"
                                        )}
                                    >
                                        <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-primary/70" : "text-white/20 group-hover:text-white/40")} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="pt-8 border-t border-white/[0.04]">
                            <button
                                onClick={async () => {
                                    await fetch("/api/auth/session", { method: "DELETE" })
                                    router.push("/auth/signin")
                                }}
                                className="flex items-center gap-3 px-4 py-2 text-[11px] font-medium text-red-500/60 hover:text-red-400 transition-colors"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                                Déconnexion
                            </button>
                        </div>
                    </aside>

                    {/* Content Section — Fine lines and spacing */}
                    <div className="lg:col-span-9 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        {activeTab === "profile" && (
                            <div className="space-y-16">
                                <header className="space-y-3">
                                    <h2 className="text-3xl font-jakarta font-bold tracking-tight text-white/90">Profil Personnel</h2>
                                    <p className="text-sm text-white/50 max-w-xl leading-relaxed font-sans font-light">
                                        KAEL utilise ces informations pour calibrer ses réponses et le suivi de vos missions.
                                    </p>
                                </header>

                                <form onSubmit={handleSave} className="space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                        <div className="space-y-2.5">
                                            <Label htmlFor="firstName" className="text-sm font-sans font-medium text-white/70 ml-1">Prénom</Label>
                                            <Input
                                                id="firstName"
                                                value={user.firstName || ""}
                                                onChange={e => setUser({ ...user, firstName: e.target.value })}
                                                className="h-11 bg-white/[0.01] border-white/[0.1] focus:border-primary/40 focus:ring-0 transition-all rounded-xl px-4 text-sm font-sans tracking-tight placeholder:text-white/20"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label htmlFor="lastName" className="text-sm font-sans font-medium text-white/70 ml-1">Nom</Label>
                                            <Input
                                                id="lastName"
                                                value={user.lastName || ""}
                                                onChange={e => setUser({ ...user, lastName: e.target.value })}
                                                className="h-11 bg-white/[0.01] border-white/[0.1] focus:border-primary/40 focus:ring-0 transition-all rounded-xl px-4 text-sm font-sans tracking-tight placeholder:text-white/20"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2.5">
                                            <Label htmlFor="company" className="text-sm font-sans font-medium text-white/70 ml-1">Organisation / Entité</Label>
                                            <Input
                                                id="company"
                                                value={user.company || ""}
                                                onChange={e => setUser({ ...user, company: e.target.value })}
                                                className="h-11 bg-white/[0.01] border-white/[0.1] focus:border-primary/40 focus:ring-0 transition-all rounded-xl px-4 text-sm font-sans tracking-tight placeholder:text-white/20"
                                                placeholder="Saisissez votre entreprise"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2.5">
                                            <Label htmlFor="industry" className="text-sm font-sans font-medium text-white/70 ml-1">Secteur d'activité</Label>
                                            <Input
                                                id="industry"
                                                value={user.industry || ""}
                                                onChange={e => setUser({ ...user, industry: e.target.value })}
                                                className="h-11 bg-white/[0.01] border-white/[0.1] focus:border-primary/40 focus:ring-0 transition-all rounded-xl px-4 text-sm font-sans tracking-tight placeholder:text-white/20"
                                                placeholder="Fintech, DeepTech, Web3..."
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2.5">
                                            <Label htmlFor="goal" className="text-sm font-sans font-medium text-white/70 ml-1">Objectif Stratégique</Label>
                                            <textarea
                                                id="goal"
                                                value={user.goal || ""}
                                                onChange={e => setUser({ ...user, goal: e.target.value })}
                                                className="w-full min-h-[120px] bg-white/[0.01] border border-white/[0.1] rounded-xl p-4 text-sm font-sans focus:border-primary/40 focus:ring-0 transition-all outline-none resize-none font-light leading-relaxed placeholder:text-white/20"
                                                placeholder="Définissez votre trajectoire..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-12 flex items-center justify-between border-t border-white/[0.04]">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-sans text-white/30 uppercase tracking-widest italic">Authentification</p>
                                            <p className="text-[10px] font-sans text-white/40 italic">Dernière synchro : {new Date(user.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={saving}
                                            className="px-8 h-11 bg-white text-black hover:bg-white/90 transition-all active:scale-[0.98] font-jakarta font-bold text-xs rounded-xl disabled:opacity-50"
                                        >
                                            {saving ? "Synchronisation..." : "Enregistrer les modifications"}
                                        </Button>
                                    </div>
                                </form>

                                {/* Quota Section — Clean and minimal */}
                                <div className="pt-16">
                                    <div className="border border-white/[0.04] bg-white/[0.01] p-10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-12 group">
                                        <div className="space-y-4">
                                            <h3 className="text-2xl font-jakarta font-bold tracking-tight text-white/90">Budget Missions</h3>
                                            <p className="text-sm font-sans text-white/50 max-w-sm font-light leading-relaxed">
                                                Suivi de votre exploration de vos dossiers et missions.
                                            </p>
                                        </div>
                                        <div className="w-full md:w-64 space-y-4 text-right">
                                            <div className="flex items-baseline justify-end gap-1 font-jakarta font-bold">
                                                <span className="text-5xl font-black text-white/90">{user.missionBudget}</span>
                                                <span className="text-sm text-white/30">/30</span>
                                            </div>
                                            <div className="h-[2px] w-full bg-white/[0.03] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-white/40 transition-all duration-1000"
                                                    style={{ width: `${(user.missionBudget / 30) * 100}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] font-sans tracking-[0.2em] text-white/40 uppercase">Missions Disponibles</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "preferences" && (
                            <div className="space-y-12">
                                <header className="space-y-3">
                                    <h2 className="text-3xl font-jakarta font-bold tracking-tight text-white/90">Préférences Système</h2>
                                    <p className="text-sm font-sans text-white/50 max-w-xl font-light">Paramètres de personnalisation de l'interface.</p>
                                </header>
                                <div className="border border-dashed border-white/[0.06] rounded-2xl p-20 flex flex-col items-center justify-center text-center gap-4">
                                    <div className="w-10 h-10 rounded-full border border-white/[0.04] flex items-center justify-center text-white/20">
                                        <Settings className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-jakarta font-medium text-white/50 uppercase">Module en cours de déploiement</p>
                                        <p className="text-[11px] font-sans text-white/40 font-light italic">La configuration détaillée arrive prochainement.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "subscription" && (
                            <div className="space-y-12">
                                <header className="space-y-3">
                                    <h2 className="text-3xl font-jakarta font-bold tracking-tight text-white/90">Statut de la Licence</h2>
                                    <p className="text-sm font-sans text-white/50 max-w-xl font-light">Vérifiez vos missions et votre niveau de licence.</p>
                                </header>
                                <div className="border border-white/[0.06] bg-white/[0.01] rounded-2xl p-12 relative overflow-hidden group">
                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
                                        <div className="space-y-8">
                                            <div>
                                                <Badge className="bg-white/[0.06] text-white/80 border-0 mb-6 px-3 py-0.5 rounded-full font-sans font-semibold text-[10px] uppercase tracking-wider">Palier Actif</Badge>
                                                <h3 className="text-4xl font-jakarta font-black tracking-tight text-white/90">Alpha Labs</h3>
                                                <p className="text-white/50 text-sm font-sans max-w-xs mt-4 leading-relaxed font-light">Accès illimité aux modules de DISCOVERY et STRUCTURATION pendant la phase 1.</p>
                                            </div>
                                            <div className="flex items-baseline gap-2 font-jakarta font-bold">
                                                <span className="text-3xl">0,00 €</span>
                                                <span className="text-white/40 text-[10px] font-sans uppercase tracking-widest italic font-normal">Offre Labs</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-4 text-right">
                                            <Button variant="outline" className="border-white/[0.08] text-white/50 text-[10px] font-sans font-bold tracking-widest uppercase cursor-not-allowed rounded-xl">
                                                Licence Active
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

