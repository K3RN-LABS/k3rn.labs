"use client"

import { useState, useEffect } from "react"
import { invalidateUserProfileCache } from "@/hooks/use-user-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/ui/logo"
import { ChevronLeft, Save, User, Building2, Target, Settings, Zap, Edit2, Trash2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { AvatarCropper } from "@/components/ui/avatar-cropper"
import { Suspense } from "react"

type ReferralStats = {
    signupsCount: number
    activatedCount: number
    totalMissions: number
}

type ReferralHistoryEntry = {
    id: string
    type: string
    missions: number
    createdAt: string
    user: { firstName: string | null; email: string } | null
}

function SettingsContent() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "subscription" | "ambassador">("profile")
    const [user, setUser] = useState<any>(null)
    const [savedUser, setSavedUser] = useState<any>(null)
    const [showCropper, setShowCropper] = useState(false)
    const [referralStats, setReferralStats] = useState<ReferralStats>({ signupsCount: 0, activatedCount: 0, totalMissions: 0 })
    const [referralHistory, setReferralHistory] = useState<ReferralHistoryEntry[]>([])
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const tab = searchParams.get("tab")
        if (tab === "preferences" || tab === "subscription" || tab === "ambassador" || tab === "profile") {
            setActiveTab(tab)
        }
    }, [searchParams])

    useEffect(() => {
        fetch("/api/user/profile")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch")
                return res.json()
            })
            .then(data => {
                setUser(data)
                setSavedUser(data)
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (activeTab === "ambassador") {
            fetch("/api/user/referral")
                .then(res => res.json())
                .then(data => {
                    if (data.stats) setReferralStats(data.stats)
                    if (data.history) setReferralHistory(data.history)
                    if (data.referralCode && user && !user.referralCode) {
                        setUser((u: any) => ({ ...u, referralCode: data.referralCode }))
                    }
                })
                .catch(err => console.error("Referral stats error:", err))
        }
    }, [activeTab])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setSaveSuccess(false)
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    company: user.company,
                    industry: user.industry,
                    goal: user.goal,
                }),
            })
            if (!res.ok) throw new Error("Failed to save")
            invalidateUserProfileCache()
            setSavedUser({ ...user })
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarUpload = async (blob: Blob) => {
        const formData = new FormData()
        formData.append("file", blob, "avatar.webp")

        const res = await fetch("/api/user/avatar", {
            method: "POST",
            body: formData,
        })
        if (!res.ok) throw new Error("Upload failed")

        const data = await res.json()
        setUser({ ...user, avatarUrl: data.avatarUrl })
        invalidateUserProfileCache()
    }

    const handleAvatarDelete = async () => {
        const res = await fetch("/api/user/avatar", { method: "DELETE" })
        if (!res.ok) console.error("Failed to delete avatar")
        setUser({ ...user, avatarUrl: null })
        invalidateUserProfileCache()
    }

    const PROFILE_FIELDS = ["firstName", "lastName", "company", "industry", "goal"] as const
    const isDirty = savedUser !== null && PROFILE_FIELDS.some(
        f => (user?.[f] ?? null) !== (savedUser?.[f] ?? null)
    )

    // Helper initiales
    const getInitials = (first?: string, last?: string) => {
        if (!first && !last) return "U"
        return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase()
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
            {showCropper && (
                <AvatarCropper
                    onClose={() => setShowCropper(false)}
                    onUpload={handleAvatarUpload}
                />
            )}

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
                                    { id: "ambassador", label: "Programme Ambassadeur", icon: Target },
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

                                {/* Photo Avatar Section */}
                                <div className="flex items-center gap-8 pb-8 border-b border-white/[0.04]">
                                    <div className="relative group/avatar">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center text-3xl font-jakarta font-bold text-white/40">
                                            {user.avatarUrl ? (
                                                <img src={`${user.avatarUrl}?t=${Date.now()}`} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(user.firstName, user.lastName)
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-white/90">Photo de profil</h3>
                                        <div className="flex items-center gap-3">
                                            {user.avatarUrl && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-3 text-red-400 bg-red-400/10 hover:bg-red-400/20 hover:text-red-300"
                                                    onClick={handleAvatarDelete}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                    Supprimer
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-4 border-white/10 text-white/70 hover:text-white"
                                                onClick={() => setShowCropper(true)}
                                            >
                                                {user.avatarUrl ? "Mettre à jour" : "Ajouter une photo"}
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">JPEG, PNG ou WEBP. Max 2MB.</p>
                                    </div>
                                </div>

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
                                            disabled={saving || (!isDirty && !saveSuccess)}
                                            className={cn(
                                                "px-8 h-11 transition-all active:scale-[0.98] font-jakarta font-bold text-xs rounded-xl",
                                                saveSuccess
                                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                    : isDirty
                                                        ? "bg-white text-black hover:bg-white/90"
                                                        : "bg-white/[0.04] text-white/20 border border-white/[0.06] cursor-not-allowed"
                                            )}
                                        >
                                            {saving ? "Synchronisation..." : saveSuccess ? "✓ Enregistré" : "Enregistrer les modifications"}
                                        </Button>
                                    </div>
                                </form>

                                {/* Budget Section — Clean and minimal */}
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
                                                <span className="text-sm text-white/30">/{Math.max(30, user.missionBudget)}</span>
                                            </div>
                                            <div className="h-[2px] w-full bg-white/[0.03] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-white/40 transition-all duration-1000"
                                                    style={{ width: `${Math.min(100, (user.missionBudget / Math.max(30, user.missionBudget)) * 100)}%` }}
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
                                                <h3 className="text-4xl font-jakarta font-black tracking-tight text-white/90">
                                                    {user?.plan === "PRO" ? "K3RN Pro" : "Alpha Labs"}
                                                </h3>
                                                <p className="text-white/50 text-sm font-sans max-w-xs mt-4 leading-relaxed font-light">
                                                    {user?.plan === "PRO"
                                                        ? "Accès complet à tous les modules et experts K3RN."
                                                        : "Accès illimité aux modules de DISCOVERY et STRUCTURATION pendant la phase 1."}
                                                </p>
                                            </div>
                                            <div className="flex items-baseline gap-2 font-jakarta font-bold">
                                                <span className="text-3xl">{user?.plan === "PRO" ? "49,00 €" : "0,00 €"}</span>
                                                <span className="text-white/40 text-[10px] font-sans uppercase tracking-widest italic font-normal">
                                                    {user?.plan === "PRO" ? "/ mois" : "Offre Labs"}
                                                </span>
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

                        {activeTab === "ambassador" && (
                            <div className="space-y-12">
                                <header className="space-y-4 pb-2">
                                    <div className="flex items-start gap-5">
                                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shrink-0">
                                            <img src="/images/experts/Nova.webp" alt="NOVA" className="w-full h-full object-cover object-[center_20%] opacity-90" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h2 className="text-2xl font-jakarta font-bold tracking-tight text-white/90">Programme Ambassadeur</h2>
                                                <Badge className="bg-white/5 text-white/40 hover:bg-white/10 border-white/10 text-[9px] uppercase font-sans tracking-widest px-2 py-0.5 rounded-full">Nova</Badge>
                                            </div>
                                            <p className="text-sm font-sans text-white/50 max-w-xl font-light leading-relaxed">
                                                Partagez k3rn.labs et débloquez des accès exclusifs en invitant vos pairs.
                                            </p>
                                        </div>
                                    </div>
                                </header>

                                <Card className="bg-white/[0.01] border-white/[0.06]">
                                    <CardHeader>
                                        <CardTitle className="text-white">Votre Lien Personnel</CardTitle>
                                        <CardDescription className="text-white/40">
                                            Personnalisez votre URL d'invitation (lettres, chiffres, ou tirets uniquement).
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="referralSlug" className="text-white/70">URL d'invitation</Label>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="flex flex-1 items-center bg-white/[0.02] border border-white/[0.1] rounded-xl overflow-hidden focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                                                    <span className="pl-4 pr-1 py-3 text-white/40 text-sm whitespace-nowrap hidden sm:inline-block">k3rnlabs.com/invite/</span>
                                                    <span className="pl-4 pr-1 py-3 text-white/40 text-sm whitespace-nowrap sm:hidden">.../invite/</span>
                                                    <input
                                                        id="referralSlug"
                                                        type="text"
                                                        value={user.referralCode || ""}
                                                        onChange={(e) => {
                                                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                                                            setUser({ ...user, referralCode: val })
                                                        }}
                                                        placeholder="votre-prenom"
                                                        className="w-full bg-transparent text-white text-sm focus:outline-none py-3 pr-4"
                                                    />
                                                </div>
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            setSaving(true)
                                                            const res = await fetch("/api/user/referral", {
                                                                method: "POST",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ referralCode: user.referralCode })
                                                            })
                                                            const data = await res.json()
                                                            if (!res.ok) alert(data.error || "Erreur lors de l'enregistrement.")
                                                            else alert("Lien mis à jour avec succès !")
                                                        } finally {
                                                            setSaving(false)
                                                        }
                                                    }}
                                                    disabled={saving || !user.referralCode || user.referralCode.length < 3}
                                                    className="bg-white text-black hover:bg-white/90 h-11 px-8 rounded-xl font-medium"
                                                >
                                                    Enregistrer
                                                </Button>
                                            </div>
                                        </div>

                                        {user.referralCode && (
                                            <div className="pt-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        const url = `https://k3rnlabs.com/invite/${user.referralCode}`
                                                        navigator.clipboard.writeText(url)
                                                        alert("Lien copié dans le presse-papier !")
                                                    }}
                                                    className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary w-full sm:w-auto h-11 px-6 rounded-xl"
                                                >
                                                    Copier le lien d'invitation
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-8 border border-white/[0.04] bg-white/[0.01] rounded-2xl flex flex-col gap-2">
                                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Filleuls Inscrits</p>
                                        <div className="flex items-end gap-3">
                                            <span className="text-5xl font-black text-white/90">{referralStats.signupsCount}</span>
                                            <span className="text-white/30 text-sm mb-1">personnes</span>
                                        </div>
                                    </div>
                                    <div className="p-8 border border-white/[0.04] bg-white/[0.01] rounded-2xl flex flex-col gap-2">
                                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Filleuls Activés</p>
                                        <div className="flex items-end gap-3">
                                            <span className="text-5xl font-black text-white/70">{referralStats.activatedCount}</span>
                                            <span className="text-white/30 text-sm mb-1">actifs</span>
                                        </div>
                                    </div>
                                    <div className="p-8 border border-white/[0.04] bg-white/[0.01] rounded-2xl flex flex-col gap-2 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] -mr-10 -mt-10 rounded-full pointer-events-none" />
                                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Missions Gagnées</p>
                                        <div className="flex items-end gap-3 relative z-10">
                                            <span className="text-5xl font-black text-primary">{referralStats.totalMissions}</span>
                                            <span className="text-primary/50 text-sm mb-1">missions bonus</span>
                                        </div>
                                    </div>
                                </div>

                                {referralHistory.length > 0 && (
                                    <Card className="bg-white/[0.01] border-white/[0.06]">
                                        <CardHeader>
                                            <CardTitle className="text-white text-base">Historique des Récompenses</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {referralHistory.map(log => (
                                                    <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b border-white/[0.04] last:border-0">
                                                        <div className="flex items-center gap-3">
                                                            <span className={cn(
                                                                "text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full",
                                                                log.type === "ACTIVATED"
                                                                    ? "bg-primary/10 text-primary"
                                                                    : "bg-white/5 text-white/40"
                                                            )}>
                                                                {log.type === "ACTIVATED" ? "Activation" : "Inscription"}
                                                            </span>
                                                            <span className="text-white/40 text-xs">
                                                                {log.user?.firstName || log.user?.email || "Filleul"}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {log.missions > 0 && (
                                                                <span className="text-primary font-medium">+{log.missions} missions</span>
                                                            )}
                                                            <span className="text-white/30 text-xs">
                                                                {new Date(log.createdAt).toLocaleDateString("fr-FR")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    )
}
