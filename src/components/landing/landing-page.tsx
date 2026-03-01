import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/ui/logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"

// ─── Real poles from K3RN_POLES_BLUEPRINT ────────────────────────────────────
const POLES = [
    { code: "P01", icon: "⚡", name: "Stratégie & Innovation", tagline: "GO / PIVOT / NO-GO", desc: "Challenge systématique, brainstorming structuré, positionnement concurrentiel et pitch en 5 phrases." },
    { code: "P02", icon: "🔍", name: "Market & Intelligence", tagline: "TAM · SAM · SOM", desc: "Analyse marché express, veille concurrentielle, tendances et fenêtres d'opportunité." },
    { code: "P03", icon: "🏗️", name: "Produit & Tech", tagline: "MVP · Architecture", desc: "Décomposition fonctionnelle, stack technique, plan d'implémentation étape par étape." },
    { code: "P04", icon: "📊", name: "Finance & Modélisation", tagline: "P&L · Break-even", desc: "Business model, projections 12–36 mois, pricing strategy, dossier investisseur." },
    { code: "P05", icon: "🎯", name: "Marketing & Brand", tagline: "Copy · SEO · Growth", desc: "Brand strategy, messaging, contenu organique, cold outreach, campagnes de lancement." },
    { code: "P06", icon: "⚖️", name: "Legal & Compliance", tagline: "RGPD · Contrats", desc: "Structure légale, analyse risques, PI, CGU, conformité sectorielle, due diligence." },
    { code: "P07", icon: "🤝", name: "Talent & Ops", tagline: "Recrutement · Suivi", desc: "Sourcing talent, briefs prestataires, coordination inter-pôles, reporting." },
]

const STEPS = [
    { n: "01", title: "Crée un dossier", sub: "Onboarding KAEL", desc: "KAEL te pose 4 questions précises — problème, cible, outcome, contraintes — pour structurer ton espace cognitif en moins de 5 minutes." },
    { n: "02", title: "Active les pôles", sub: "7 équipes spécialisées", desc: "KAEL route ta demande vers le bon expert. Chaque pôle livre un output actionnable, jamais générique. Tu décides." },
    { n: "03", title: "Navigue le graphe", sub: "Memory Graph · Canvas", desc: "Chaque échange génère des Cards typées (Décision, Vision, Analyse…) connectées en graphe. Ta mémoire projet devient navigable." },
]

// ─── Node-link graph mockup (SVG-based, aligned to app design) ─────────────────
function GraphMockup() {
    // Nodes: cx/cy in % of 100x100 viewBox, r in SVG units, color, label, type
    const nodes = [
        { id: "kael", cx: 50, cy: 50, r: 9, fill: "hsl(var(--primary))", label: "KAEL", type: "ORCHESTRATEUR" },
        { id: "vision", cx: 22, cy: 18, r: 6.5, fill: "hsl(var(--muted-foreground))", label: "Vision produit", type: "VISION" },
        { id: "tam", cx: 76, cy: 14, r: 6, fill: "hsl(var(--muted-foreground))", label: "TAM Europe", type: "ANALYSE" },
        { id: "mvp", cx: 82, cy: 48, r: 6, fill: "hsl(var(--muted-foreground))", label: "MVP scope", type: "DÉCISION" },
        { id: "michel", cx: 18, cy: 55, r: 5.5, fill: "hsl(var(--muted-foreground))", label: "Fondateur", type: "UTILISATEUR" },
        { id: "hyp", cx: 35, cy: 78, r: 5.5, fill: "hsl(var(--muted-foreground))", label: "Rétention > 60%", type: "HYPOTHÈSE" },
        { id: "go", cx: 68, cy: 76, r: 5.5, fill: "hsl(var(--muted-foreground))", label: "GO marché B2C", type: "DÉCISION" },
    ]

    const edges = [
        { from: "kael", to: "vision", label: "DÉRIVÉ DE", mid: { x: 33, y: 30 } },
        { from: "kael", to: "tam", label: "ANALYSE", mid: { x: 65, y: 28 } },
        { from: "kael", to: "mvp", label: "SUPPORTE", mid: { x: 68, y: 50 } },
        { from: "kael", to: "michel", label: "COORDONNE", mid: { x: 30, y: 53 } },
        { from: "kael", to: "hyp", label: "FORMULE", mid: { x: 40, y: 66 } },
        { from: "kael", to: "go", label: "DÉLIVRE", mid: { x: 62, y: 65 } },
        { from: "vision", to: "mvp", label: "IMPLÉMENTE", mid: { x: 55, y: 27 } },
        { from: "tam", to: "go", label: "VALIDE", mid: { x: 76, y: 62 } },
    ]

    return (
        <Card className="relative w-full overflow-hidden bg-muted/10 border-border" style={{ aspectRatio: "16/9" }}>
            {/* Header chrome */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-destructive/70" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">Memory Graph — Dossier actif</span>
                <div className="w-12" />
            </div>

            {/* Graph canvas */}
            <div className="relative h-[calc(100%-37px)]">
                {/* Subtle grid */}
                <div className="absolute inset-0 opacity-[0.2]"
                    style={{
                        backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 40px,hsl(var(--border)) 40px,hsl(var(--border)) 41px),
                              repeating-linear-gradient(90deg,transparent,transparent 40px,hsl(var(--border)) 40px,hsl(var(--border)) 41px)`,
                    }}
                />

                <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0 w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ overflow: "visible" }}
                >
                    {/* Edges */}
                    {edges.map((e) => {
                        const from = nodes.find(n => n.id === e.from)!
                        const to = nodes.find(n => n.id === e.to)!
                        const mx = e.mid.x
                        const my = e.mid.y
                        const angle = Math.atan2(to.cy - from.cy, to.cx - from.cx) * 180 / Math.PI
                        return (
                            <g key={`${e.from}-${e.to}`}>
                                <line
                                    x1={`${from.cx}%`} y1={`${from.cy}%`}
                                    x2={`${to.cx}%`} y2={`${to.cy}%`}
                                    stroke="hsl(var(--border))"
                                    className="opacity-50"
                                    strokeWidth="0.35"
                                />
                                {/* Relation label */}
                                <text
                                    x={`${mx}%`} y={`${my}%`}
                                    fontSize="1.6"
                                    fill="hsl(var(--muted-foreground))"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    transform={`rotate(${angle > 90 || angle < -90 ? angle + 180 : angle}, ${mx}, ${my})`}
                                    fontFamily="monospace"
                                    letterSpacing="0.3"
                                >
                                    {e.label}
                                </text>
                            </g>
                        )
                    })}

                    {/* Nodes */}
                    {nodes.map((n) => (
                        <g key={n.id}>
                            {/* Glow ring */}
                            <circle cx={`${n.cx}%`} cy={`${n.cy}%`} r={`${n.r + 1.5}%`}
                                fill="none" stroke={n.fill} strokeWidth="0.4" opacity="0.1" />
                            {/* Node */}
                            <circle cx={`${n.cx}%`} cy={`${n.cy}%`} r={`${n.r}%`} fill={n.fill} className={n.id !== "kael" ? "opacity-80" : ""} />
                            {/* Label */}
                            <text
                                x={`${n.cx + n.r + 1}%`} y={`${n.cy}%`}
                                fontSize="2.2"
                                fill="hsl(var(--foreground))"
                                dominantBaseline="middle"
                                fontFamily="system-ui, -apple-system, sans-serif"
                                fontWeight="500"
                            >
                                {n.label}
                            </text>
                            {/* Type pill */}
                            <text
                                x={`${n.cx + n.r + 1}%`} y={`${n.cy + 3}%`}
                                fontSize="1.5"
                                fill="hsl(var(--muted-foreground))"
                                dominantBaseline="middle"
                                fontFamily="monospace"
                                letterSpacing="0.2"
                            >
                                {n.type}
                            </text>
                        </g>
                    ))}
                </svg>

                {/* KAEL tooltip */}
                <Card className="absolute top-3 right-3 p-2.5 text-left max-w-[140px] shadow-sm bg-background/95 backdrop-blur">
                    <div className="text-[7px] font-mono mb-1 text-primary">KAEL → P02</div>
                    <div className="text-[8px] leading-tight text-muted-foreground">
                        Rapport marché routé vers Market Intelligence…
                    </div>
                    <div className="flex gap-1 mt-1.5">
                        {[0, 150, 300].map((d) => (
                            <div key={d} className="w-1 h-1 rounded-full bg-primary/40 animate-bounce"
                                style={{ animationDelay: `${d}ms` }} />
                        ))}
                    </div>
                </Card>
            </div>
        </Card>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">

            {/* ─── Header ─────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Logo size="md" />
                    <div className="flex items-center gap-3">
                        <Link href="/auth/login">
                            <Button variant="ghost" size="sm">
                                Se connecter
                            </Button>
                        </Link>
                        <Link href="/auth/login">
                            <Button size="sm">
                                Démarrer
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* ─── Hero ───────────────────────────────────────────────── */}
            <section className="flex flex-col items-center text-center px-6 pt-20 pb-14 max-w-3xl mx-auto">
                <Badge variant="secondary" className="mb-5 px-3 py-1 font-mono text-xs gap-2 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Cognitive OS · 7 pôles · Memory Graph · BETA
                </Badge>

                <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.06] mb-6">
                    Ton équipe IA world-class.
                    <br />
                    <span className="text-muted-foreground">Un seul OS cognitif.</span>
                </h1>

                <p className="text-base leading-relaxed mb-4 max-w-xl text-muted-foreground">
                    k3rn.labs orchestre <strong className="text-foreground font-semibold">7 pôles experts</strong> autour de ton projet.{" "}
                    <strong className="text-foreground font-semibold">KAEL</strong>, ton copilote central, route, synthétise et construit ta mémoire structurée en temps réel.
                </p>

                <p className="text-sm mb-10 max-w-lg text-muted-foreground/80">
                    Chaque décision devient une <span className="text-foreground/80">Card</span>. Chaque Card s'intègre dans un{" "}
                    <span className="text-foreground/80">graphe navigable</span>. Plus jamais de connaissance perdue dans un chat.
                </p>

                <div className="flex items-center gap-3 mb-4">
                    <Link href="/auth/login">
                        <Button size="lg" className="gap-2">
                            Créer mon premier dossier
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/auth/login">
                        <Button size="lg" variant="outline">
                            Se connecter
                        </Button>
                    </Link>
                </div>
                <p className="text-xs text-muted-foreground">Beta gratuite · Aucune carte · Claude + GPT-4o</p>
            </section>

            {/* ─── Graph preview ──────────────────────────────────────── */}
            <section className="px-6 pb-20 max-w-4xl mx-auto w-full">
                <p className="text-center text-[10px] font-mono mb-3 text-muted-foreground tracking-widest">
                    MEMORY GRAPH — PROJECTION EN TEMPS RÉEL
                </p>
                <GraphMockup />
                <div className="flex justify-center gap-2 mt-4 flex-wrap">
                    {["VISION", "DÉCISION", "ANALYSE", "HYPOTHÈSE", "PROBLÈME", "TÂCHE"].map((t) => (
                        <Badge variant="outline" key={t} className="text-[9px] font-mono px-2 py-0.5 rounded text-muted-foreground">
                            {t}
                        </Badge>
                    ))}
                </div>
            </section>

            {/* ─── Divider ────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto w-full px-6">
                <Separator className="w-full" />
            </div>

            {/* ─── How it works ───────────────────────────────────────── */}
            <section className="py-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-2">De l'idée à la décision structurée</h2>
                    <p className="text-sm text-center mb-14 text-muted-foreground">
                        Un flux cognitif conçu pour les fondateurs qui pensent vite et décident seuls.
                    </p>
                    <div className="space-y-12">
                        {STEPS.map((s, i) => (
                            <div key={s.n} className="flex gap-8 items-start">
                                <div className="shrink-0 w-12 text-right">
                                    <span className="text-3xl font-black leading-none text-muted">{s.n}</span>
                                </div>
                                <div className="border-l border-border pl-8">
                                    <div className="text-[10px] font-mono mb-1 uppercase tracking-widest text-primary/70">{s.sub}</div>
                                    <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                                    {i < STEPS.length - 1 && (
                                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/30">
                                            <div className="h-px flex-1 bg-border" />
                                            <ArrowRight className="h-3 w-3" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="max-w-5xl mx-auto w-full px-6">
                <Separator className="w-full" />
            </div>

            {/* ─── 7 Pôles ─────────────────────────────────────────────── */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-2">7 pôles experts. Une seule voix : KAEL.</h2>
                    <p className="text-sm text-center mb-12 max-w-xl mx-auto text-muted-foreground">
                        Chaque pôle est une équipe spécialisée world-class. Output directement actionnable, jamais générique.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {POLES.map((p) => (
                            <Card key={p.code} className="transition-all hover:bg-muted/50 border-border/50">
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-md text-base flex items-center justify-center shrink-0 bg-muted">
                                            {p.icon}
                                        </span>
                                        <div>
                                            <CardTitle className="text-sm font-semibold leading-tight">{p.name}</CardTitle>
                                            <div className="text-[10px] font-mono mt-0.5 text-muted-foreground">{p.tagline}</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                                        {p.desc}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}

                        {/* KAEL */}
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-md text-base flex items-center justify-center shrink-0 bg-primary/10">
                                        🧠
                                    </span>
                                    <div>
                                        <CardTitle className="text-sm font-semibold leading-tight">KAEL</CardTitle>
                                        <div className="text-[10px] font-mono mt-0.5 text-primary/70">Copilote central</div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                                    Orchestrateur à mémoire vectorielle. Route, synthétise, consolide. Une seule voix qui coordonne les 7 pôles.
                                </CardDescription>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            <div className="max-w-5xl mx-auto w-full px-6">
                <Separator className="w-full" />
            </div>

            {/* ─── Memory Graph callout ────────────────────────────────── */}
            <section className="py-20 px-6">
                <div className="max-w-2xl mx-auto text-center">
                    <Badge variant="outline" className="mb-4 px-3 py-1 font-mono text-xs gap-2 text-primary">
                        ✦ Memory Graph System
                    </Badge>
                    <h2 className="text-2xl font-bold mb-4">Chaque échange devient mémoire structurée.</h2>
                    <p className="text-sm leading-relaxed mb-8 text-muted-foreground">
                        Les conversations alimentent un graphe de mémoire persisté en base : Cards typées, relations sémantiques (DÉRIVÉ_DE, SUPPORTE, IMPLÉMENTE…), projection Canvas ReactFlow. Recherche full-text. Mémoire vectorielle pgvector.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {["Cards persistées", "Relations sémantiques", "Projection ReactFlow", "Recherche full-text", "pgvector", "Chat → Card en 1 clic"].map((f) => (
                            <Badge variant="secondary" key={f} className="text-[11px] font-mono px-3 py-1 rounded-full text-muted-foreground">
                                {f}
                            </Badge>
                        ))}
                    </div>
                </div>
            </section>

            <div className="max-w-5xl mx-auto w-full px-6">
                <Separator className="w-full" />
            </div>

            {/* ─── Final CTA ───────────────────────────────────────────── */}
            <section className="py-24 px-6 text-center">
                <div className="max-w-lg mx-auto">
                    <h2 className="text-3xl font-bold mb-4">Prêt à structurer ton projet ?</h2>
                    <p className="text-sm mb-8 text-muted-foreground">
                        Beta gratuite. Aucune carte bancaire. 7 pôles disponibles immédiatement.
                    </p>
                    <Link href="/auth/login">
                        <Button size="lg" className="w-full sm:w-auto">
                            Créer mon workspace
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* ─── Footer ─────────────────────────────────────────────── */}
            <footer className="py-6 px-6 border-t">
                <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
                    <Logo size="md" />
                    <p className="text-xs font-mono text-muted-foreground">
                        ✦ KAEL · n8n · Claude · GPT-4o · Supabase · pgvector
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="cursor-pointer hover:text-foreground transition-colors">CGU</span>
                        <span className="cursor-pointer hover:text-foreground transition-colors">Confidentialité</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}
