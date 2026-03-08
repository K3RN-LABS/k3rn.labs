"use client"

import { useState, useEffect, useRef } from "react"
import { invalidateUserProfileCache } from "@/hooks/use-user-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/logo"
import { Trash2, Bell, MessageSquare, ChevronLeft } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { AvatarCropper } from "@/components/ui/avatar-cropper"
import { Suspense } from "react"
import { CreditsModal } from "@/components/billing/CreditsModal"
import { useMissionBudget } from "@/hooks/use-mission-budget"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"

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

const TABS = [
    { id: "profile", label: "Profil" },
    { id: "preferences", label: "Préférences" },
    { id: "subscription", label: "Plan & Missions" },
    { id: "ambassador", label: "Ambassadeur" },
] as const

type TabId = typeof TABS[number]["id"]

function SettingsContent() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [activeTab, setActiveTab] = useState<TabId>("profile")
    const [creditsModalOpen, setCreditsModalOpen] = useState(false)
    const [subscribing, setSubscribing] = useState<string | null>(null)
    const { data: budget } = useMissionBudget()
    const [user, setUser] = useState<any>(null)
    const [savedUser, setSavedUser] = useState<any>(null)
    const [showCropper, setShowCropper] = useState(false)
    const [referralStats, setReferralStats] = useState<ReferralStats>({ signupsCount: 0, activatedCount: 0, totalMissions: 0 })
    const [referralHistory, setReferralHistory] = useState<ReferralHistoryEntry[]>([])
    const [notifSettings, setNotifSettings] = useState<{ missionProgressUpdates: boolean; telegramOnComplete: boolean; telegramChatId?: string | null } | null>(null)
    const [savingNotif, setSavingNotif] = useState(false)
    const [telegramToken, setTelegramToken] = useState<string | null>(null)
    const [generatingToken, setGeneratingToken] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const tab = searchParams.get("tab")
        if (tab === "preferences" || tab === "subscription" || tab === "ambassador" || tab === "profile") {
            setActiveTab(tab as TabId)
        }
    }, [searchParams])

    useEffect(() => {
        fetch("/api/user/profile")
            .then(res => { if (!res.ok) throw new Error("Failed"); return res.json() })
            .then(data => { setUser(data); setSavedUser(data) })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (activeTab === "preferences" && !notifSettings) {
            fetch("/api/user/notifications").then(r => r.json()).then(data => setNotifSettings(data)).catch(() => {})
        }
    }, [activeTab, notifSettings])

    useEffect(() => {
        if (activeTab === "ambassador") {
            fetch("/api/user/referral").then(res => res.json()).then(data => {
                if (data.stats) setReferralStats(data.stats)
                if (data.history) setReferralHistory(data.history)
                if (data.referralCode && user && !user.referralCode) setUser((u: any) => ({ ...u, referralCode: data.referralCode }))
            }).catch(err => console.error(err))
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
                body: JSON.stringify({ firstName: user.firstName, lastName: user.lastName, company: user.company, industry: user.industry, goal: user.goal }),
            })
            if (!res.ok) throw new Error("Failed")
            invalidateUserProfileCache()
            setSavedUser({ ...user })
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) { console.error(err) }
        finally { setSaving(false) }
    }

    const handleAvatarUpload = async (blob: Blob) => {
        const formData = new FormData()
        formData.append("file", blob, "avatar.webp")
        const res = await fetch("/api/user/avatar", { method: "POST", body: formData })
        if (!res.ok) throw new Error("Upload failed")
        const data = await res.json()
        setUser({ ...user, avatarUrl: data.avatarUrl })
        invalidateUserProfileCache()
    }

    const handleAvatarDelete = async () => {
        await fetch("/api/user/avatar", { method: "DELETE" })
        setUser({ ...user, avatarUrl: null })
        invalidateUserProfileCache()
    }

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
    useEffect(() => {
        if (!telegramToken || notifSettings?.telegramChatId) {
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
            return
        }
        pollingRef.current = setInterval(async () => {
            try {
                const r = await fetch("/api/user/notifications")
                if (!r.ok) return
                const data = await r.json()
                if (data.telegramChatId) {
                    setNotifSettings(data)
                    setTelegramToken(null)
                    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
                }
            } catch { /* ignore */ }
        }, 5000)
        return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null } }
    }, [telegramToken, notifSettings?.telegramChatId])

    const PROFILE_FIELDS = ["firstName", "lastName", "company", "industry", "goal"] as const
    const isDirty = savedUser !== null && PROFILE_FIELDS.some(f => (user?.[f] ?? null) !== (savedUser?.[f] ?? null))

    const getInitials = (first?: string, last?: string) => {
        if (!first && !last) return "U"
        return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase()
    }

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-border border-t-foreground/40 animate-spin" />
        </div>
    )

    if (!user) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground text-sm">Impossible de charger votre profil.</p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">Réessayer</Button>
        </div>
    )

    return (
        <div className="min-h-screen bg-background pb-24">
            {showCropper && (
                <AvatarCropper onClose={() => setShowCropper(false)} onUpload={handleAvatarUpload} />
            )}

            {/* Header — identique au dashboard */}
            <header className="border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/home")}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Retour
                    </button>
                    <span className="text-border">|</span>
                    <span className="text-sm font-medium">Paramètres</span>
                </div>
                <Logo size="sm" />
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Paramètres du compte</h1>
                    <p className="text-muted-foreground text-sm mt-1">Gérez votre profil, préférences et abonnement.</p>
                </div>

                <div className="flex gap-10">
                    {/* Sidebar nav */}
                    <aside className="w-48 shrink-0">
                        <nav className="flex flex-col gap-1">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                        activeTab === tab.id
                                            ? "bg-zinc-800 text-foreground font-medium"
                                            : "text-muted-foreground hover:text-foreground hover:bg-zinc-900"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                            <div className="mt-4 pt-4 border-t border-border">
                                <button
                                    onClick={async () => {
                                        await fetch("/api/auth/session", { method: "DELETE" })
                                        router.push("/auth/signin")
                                    }}
                                    className="text-left px-3 py-2 rounded-lg text-sm text-red-500/60 hover:text-red-400 hover:bg-red-500/5 transition-colors w-full"
                                >
                                    Déconnexion
                                </button>
                            </div>
                        </nav>
                    </aside>

                    {/* Content */}
                    <div className="flex-1 min-w-0">

                        {/* ── PROFIL ── */}
                        {activeTab === "profile" && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-semibold">Profil personnel</h2>
                                    <p className="text-muted-foreground text-sm mt-1">KAEL utilise ces informations pour calibrer ses réponses.</p>
                                </div>

                                {/* Avatar */}
                                <div className="flex items-center gap-5 pb-6 border-b border-border">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border border-border bg-zinc-900 flex items-center justify-center text-lg font-semibold text-muted-foreground shrink-0">
                                        {user.avatarUrl
                                            ? <img src={`${user.avatarUrl}?t=${Date.now()}`} alt="Avatar" className="w-full h-full object-cover" />
                                            : getInitials(user.firstName, user.lastName)
                                        }
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Photo de profil</p>
                                        <p className="text-xs text-muted-foreground">JPEG, PNG ou WEBP · Max 2 MB</p>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setShowCropper(true)}>
                                                {user.avatarUrl ? "Mettre à jour" : "Ajouter une photo"}
                                            </Button>
                                            {user.avatarUrl && (
                                                <Button variant="ghost" size="sm" className="text-red-500/60 hover:text-red-400 hover:bg-red-500/5" onClick={handleAvatarDelete}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="firstName" className="text-sm">Prénom</Label>
                                            <Input id="firstName" value={user.firstName || ""} onChange={e => setUser({ ...user, firstName: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="lastName" className="text-sm">Nom</Label>
                                            <Input id="lastName" value={user.lastName || ""} onChange={e => setUser({ ...user, lastName: e.target.value })} />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <Label htmlFor="company" className="text-sm">Organisation</Label>
                                            <Input id="company" value={user.company || ""} onChange={e => setUser({ ...user, company: e.target.value })} placeholder="Votre entreprise…" />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <Label htmlFor="industry" className="text-sm">Secteur d'activité</Label>
                                            <Input id="industry" value={user.industry || ""} onChange={e => setUser({ ...user, industry: e.target.value })} placeholder="Fintech, DeepTech, Web3…" />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <Label htmlFor="goal" className="text-sm">Objectif stratégique</Label>
                                            <textarea
                                                id="goal"
                                                value={user.goal || ""}
                                                onChange={e => setUser({ ...user, goal: e.target.value })}
                                                className="w-full min-h-[100px] bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed placeholder:text-muted-foreground"
                                                placeholder="Définissez votre trajectoire…"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-border">
                                        <p className="text-xs text-muted-foreground">Membre depuis {new Date(user.createdAt).toLocaleDateString("fr-FR")}</p>
                                        <Button
                                            type="submit"
                                            disabled={saving || (!isDirty && !saveSuccess)}
                                            variant={saveSuccess ? "outline" : "default"}
                                            className={saveSuccess ? "border-green-500/40 text-green-400" : ""}
                                        >
                                            {saving ? "Enregistrement…" : saveSuccess ? "✓ Enregistré" : "Enregistrer"}
                                        </Button>
                                    </div>
                                </form>

                            </div>
                        )}

                        {/* ── PRÉFÉRENCES ── */}
                        {activeTab === "preferences" && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-xl font-semibold">Préférences système</h2>
                                    <p className="text-muted-foreground text-sm mt-1">Notifications et intégrations des missions autonomes.</p>
                                </div>

                                {/* Notifications */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-3 border-b border-border">
                                        <Bell className="w-4 h-4 text-muted-foreground" />
                                        <h3 className="text-sm font-medium">Notifications missions</h3>
                                    </div>

                                    {notifSettings === null ? (
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                                            <div className="w-4 h-4 rounded-full border-2 border-border border-t-foreground/40 animate-spin" />
                                            Chargement…
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {[
                                                { key: "missionProgressUpdates" as const, label: "Mises à jour en temps réel", description: "Affiche les messages de progression dans le chat KAEL pendant qu'une mission est en cours." },
                                                { key: "telegramOnComplete" as const, label: "Notification Telegram à la fin", description: "Envoie un message Telegram quand un expert termine sa mission." },
                                            ].map(({ key, label, description }) => (
                                                <div key={key} className="flex items-start justify-between gap-6 p-4 rounded-xl border border-border">
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium">{label}</p>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const next = { ...notifSettings, [key]: !notifSettings[key] }
                                                            setNotifSettings(next)
                                                            setSavingNotif(true)
                                                            try {
                                                                await fetch("/api/user/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: next[key] }) })
                                                            } finally { setSavingNotif(false) }
                                                        }}
                                                        disabled={savingNotif}
                                                        className={cn("relative shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50", notifSettings[key] ? "bg-primary" : "bg-zinc-700")}
                                                        style={{ height: "22px", width: "40px" }}
                                                    >
                                                        <span className={cn("absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200", notifSettings[key] ? "translate-x-[18px]" : "translate-x-0")} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Telegram */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-3 border-b border-border">
                                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                        <h3 className="text-sm font-medium">Intégration Telegram</h3>
                                    </div>

                                    <div className={cn(
                                        "p-5 rounded-xl border space-y-4 transition-colors",
                                        notifSettings?.telegramChatId ? "border-green-500/25 bg-green-500/[0.03]" : "border-border"
                                    )}>
                                        <div className="flex items-start gap-3">
                                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", notifSettings?.telegramChatId ? "bg-green-500/10" : "bg-zinc-800")}>
                                                <svg className={cn("w-4 h-4", notifSettings?.telegramChatId ? "text-green-400" : "text-[#229ED9]")} fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{notifSettings?.telegramChatId ? "Telegram connecté" : "Connecter Telegram"}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {notifSettings?.telegramChatId
                                                        ? <span className="text-green-400">Chat ID ···{String(notifSettings.telegramChatId).slice(-4)}</span>
                                                        : "Liez votre Telegram pour recevoir les livrables de missions."}
                                                </p>
                                            </div>
                                            {notifSettings?.telegramChatId && (
                                                <span className="text-[10px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Actif</span>
                                            )}
                                        </div>

                                        {!notifSettings?.telegramChatId && (
                                            <div className="border-t border-border pt-4 space-y-3">
                                                {!telegramToken ? (
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-muted-foreground">Générez un code de liaison unique (valable 15 minutes), puis tapez la commande dans le bot Telegram K3RN.</p>
                                                        <Button
                                                            variant="outline" size="sm"
                                                            onClick={async () => {
                                                                setGeneratingToken(true)
                                                                try {
                                                                    const res = await fetch("/api/user/telegram/token", { method: "POST" })
                                                                    const data = await res.json()
                                                                    if (res.ok && data.token) setTelegramToken(data.token)
                                                                } finally { setGeneratingToken(false) }
                                                            }}
                                                            disabled={generatingToken}
                                                        >
                                                            {generatingToken ? <><div className="w-3 h-3 rounded-full border border-border border-t-foreground/40 animate-spin mr-2" />Génération…</> : "Générer un code de liaison"}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <a
                                                            href={`https://t.me/k3rn_bot?start=${telegramToken}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-[#229ED9]/15 border border-[#229ED9]/30 text-[#229ED9] hover:bg-[#229ED9]/20 transition-colors text-sm font-medium"
                                                        >
                                                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.563l-2.948-.924c-.64-.204-.654-.64.135-.954l11.57-4.461c.537-.194 1.006.131.877.997z"/></svg>
                                                            Ouvrir dans Telegram
                                                        </a>
                                                        <div
                                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900 border border-border font-mono text-sm text-foreground/80 cursor-pointer hover:border-zinc-700 transition-colors group"
                                                            onClick={() => navigator.clipboard.writeText(`/link ${telegramToken}`)}
                                                        >
                                                            <span className="flex-1">/link {telegramToken}</span>
                                                            <span className="text-xs text-muted-foreground group-hover:text-foreground/60 transition-colors font-sans">Copier</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse shrink-0" />
                                                            Vérification automatique en cours…
                                                        </div>
                                                        <button onClick={() => setTelegramToken(null)} className="text-xs text-muted-foreground hover:text-foreground/60 transition-colors">
                                                            Générer un nouveau code
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {notifSettings?.telegramChatId && (
                                            <div className="border-t border-border pt-3">
                                                <button
                                                    onClick={async () => {
                                                        await fetch("/api/user/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramChatId: null }) })
                                                        setNotifSettings(prev => prev ? { ...prev, telegramChatId: null } : null)
                                                    }}
                                                    className="text-xs text-red-500/40 hover:text-red-400/70 transition-colors"
                                                >
                                                    Délier ce compte Telegram
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── CRÉDITS & ACCÈS ── */}
                        {activeTab === "subscription" && (
                            <div className="space-y-8">
                                <CreditsModal open={creditsModalOpen} onClose={() => setCreditsModalOpen(false)} currentBudget={budget?.total} />

                                <div>
                                    <h2 className="text-xl font-semibold">Plan & Missions</h2>
                                    <p className="text-muted-foreground text-sm mt-1">Gérez vos missions et votre niveau d'accès à K3RN Labs.</p>
                                </div>

                                {/* Solde */}
                                <div className="border border-border rounded-xl p-6 flex items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Solde de missions</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className={cn("text-4xl font-bold", (budget?.total ?? 5) <= 2 ? "text-red-400" : (budget?.total ?? 5) <= 5 ? "text-amber-400" : "text-foreground")}>
                                                {budget?.total ?? "—"}
                                            </span>
                                            <span className="text-muted-foreground text-sm">missions disponibles</span>
                                        </div>
                                        {(budget?.allowanceLeft ?? 0) > 0 && (
                                            <p className="text-xs text-muted-foreground">{budget?.allowanceLeft} incluses ce mois</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">KAEL est gratuit. Seuls les experts consomment des missions.</p>
                                    </div>
                                    <Button onClick={() => setCreditsModalOpen(true)} size="sm">Recharger</Button>
                                </div>

                                {/* Plans */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Abonnement mensuel</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {SUBSCRIPTION_PLANS.map((plan) => {
                                            const currentTier = user?.subscriptionTier ?? "FREE"
                                            const isCurrent = currentTier === plan.tier
                                            const isDowngrade = plan.tier === "FREE" && currentTier !== "FREE"
                                            return (
                                                <div key={plan.tier} className={cn(
                                                    "relative rounded-xl border p-5 flex flex-col gap-3",
                                                    isCurrent ? "border-zinc-600 bg-zinc-900" : plan.highlight ? "border-primary/30 bg-primary/5" : "border-border"
                                                )}>
                                                    {plan.highlight && !isCurrent && (
                                                        <span className="absolute top-3 right-3 text-[9px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">Populaire</span>
                                                    )}
                                                    {isCurrent && (
                                                        <span className="absolute top-3 right-3 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground bg-zinc-800 border border-border rounded-full px-2 py-0.5">Actuel</span>
                                                    )}
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-0.5">{plan.missionsPerMonth} missions/mois</p>
                                                        <p className="text-base font-semibold">{plan.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{plan.tagline}</p>
                                                    </div>
                                                    <div className="flex items-baseline gap-1 mt-auto">
                                                        <span className="text-2xl font-bold">{plan.priceEur}€</span>
                                                        <span className="text-xs text-muted-foreground">{plan.priceEur === 0 ? "gratuit" : "/ mois"}</span>
                                                    </div>
                                                    {plan.tier === "FREE" ? (
                                                        isDowngrade ? (
                                                            <button onClick={async () => { const res = await fetch("/api/billing/portal", { method: "POST" }); const d = await res.json(); if (d.data?.url) window.location.href = d.data.url }} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors text-left">
                                                                Gérer via Stripe →
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Accès de base</span>
                                                        )
                                                    ) : (
                                                        <button
                                                            disabled={isCurrent || !!subscribing}
                                                            onClick={async () => {
                                                                if (isCurrent) return
                                                                setSubscribing(plan.tier)
                                                                try {
                                                                    const res = await fetch("/api/billing/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier: plan.tier }) })
                                                                    const data = await res.json()
                                                                    if (data.data?.url) window.location.href = data.data.url
                                                                } finally { setSubscribing(null) }
                                                            }}
                                                            className={cn(
                                                                "h-8 px-4 rounded-lg text-xs font-medium transition-all",
                                                                isCurrent ? "bg-zinc-800 text-muted-foreground cursor-default" : plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-zinc-800 text-foreground hover:bg-zinc-700"
                                                            )}
                                                        >
                                                            {subscribing === plan.tier ? "Redirection…" : isCurrent ? "Actif" : "Choisir"}
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {user?.subscriptionTier && user.subscriptionTier !== "FREE" && (
                                    <div className="flex items-center justify-between border border-border rounded-xl p-4">
                                        <div>
                                            <p className="text-sm font-medium">Gérer votre abonnement</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Factures, changement de moyen de paiement, annulation.</p>
                                        </div>
                                        <button
                                            onClick={async () => { const res = await fetch("/api/billing/portal", { method: "POST" }); const d = await res.json(); if (d.data?.url) window.location.href = d.data.url }}
                                            className="text-sm text-muted-foreground hover:text-foreground border border-border hover:border-zinc-600 rounded-lg px-3 py-1.5 transition-all"
                                        >
                                            Portail Stripe →
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── AMBASSADEUR ── */}
                        {activeTab === "ambassador" && (
                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-zinc-900 shrink-0">
                                        <img src="/images/experts/Nova.webp" alt="NOVA" className="w-full h-full object-cover object-[center_20%]" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold">Programme Ambassadeur</h2>
                                        <p className="text-muted-foreground text-sm mt-1">Partagez k3rnlabs.com et débloquez des accès exclusifs en invitant vos pairs.</p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: "Inscrits", value: referralStats.signupsCount, unit: "filleuls" },
                                        { label: "Activés", value: referralStats.activatedCount, unit: "actifs" },
                                        { label: "Missions gagnées", value: referralStats.totalMissions, unit: "bonus", highlight: true },
                                    ].map(stat => (
                                        <div key={stat.label} className={cn("border rounded-xl p-5", stat.highlight ? "border-primary/20 bg-primary/[0.03]" : "border-border")}>
                                            <p className="text-xs text-muted-foreground mb-2">{stat.label}</p>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className={cn("text-3xl font-bold", stat.highlight ? "text-primary" : "")}>{stat.value}</span>
                                                <span className="text-xs text-muted-foreground">{stat.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Lien de parrainage */}
                                <div className="space-y-4 border border-border rounded-xl p-5">
                                    <div>
                                        <p className="text-sm font-medium">Votre lien personnel</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Personnalisez votre URL d'invitation (lettres, chiffres ou tirets).</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex flex-1 items-center bg-zinc-900 border border-border rounded-lg overflow-hidden focus-within:border-zinc-600 transition-colors">
                                            <span className="pl-3 pr-1 text-xs text-muted-foreground whitespace-nowrap hidden sm:block">k3rnlabs.com/invite/</span>
                                            <span className="pl-3 pr-1 text-xs text-muted-foreground sm:hidden">.../invite/</span>
                                            <input
                                                type="text"
                                                value={user.referralCode || ""}
                                                onChange={(e) => setUser({ ...user, referralCode: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                                                placeholder="votre-prenom"
                                                className="w-full bg-transparent text-sm focus:outline-none py-2 pr-3"
                                            />
                                        </div>
                                        <Button
                                            onClick={async () => {
                                                try {
                                                    setSaving(true)
                                                    const res = await fetch("/api/user/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ referralCode: user.referralCode }) })
                                                    const data = await res.json()
                                                    if (!res.ok) alert(data.error || "Erreur.")
                                                    else alert("Lien mis à jour !")
                                                } finally { setSaving(false) }
                                            }}
                                            disabled={saving || !user.referralCode || user.referralCode.length < 3}
                                            size="sm"
                                        >
                                            Enregistrer
                                        </Button>
                                    </div>
                                    {user.referralCode && (
                                        <Button
                                            variant="outline" size="sm"
                                            onClick={() => { navigator.clipboard.writeText(`https://k3rnlabs.com/invite/${user.referralCode}`); alert("Lien copié !") }}
                                        >
                                            Copier le lien d'invitation
                                        </Button>
                                    )}
                                </div>

                                {/* Historique */}
                                {referralHistory.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium">Historique des récompenses</h3>
                                        <div className="border border-border rounded-xl overflow-hidden">
                                            {referralHistory.map((log, i) => (
                                                <div key={log.id} className={cn("flex items-center justify-between px-4 py-3 text-sm", i < referralHistory.length - 1 && "border-b border-border")}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full", log.type === "ACTIVATED" ? "bg-primary/10 text-primary" : "bg-zinc-800 text-muted-foreground")}>
                                                            {log.type === "ACTIVATED" ? "Activation" : "Inscription"}
                                                        </span>
                                                        <span className="text-muted-foreground">{log.user?.firstName || log.user?.email || "Filleul"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {log.missions > 0 && <span className="text-primary font-medium">+{log.missions} missions</span>}
                                                        <span className="text-muted-foreground text-xs">{new Date(log.createdAt).toLocaleDateString("fr-FR")}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-7 h-7 rounded-full border-2 border-border border-t-foreground/40 animate-spin" />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    )
}
