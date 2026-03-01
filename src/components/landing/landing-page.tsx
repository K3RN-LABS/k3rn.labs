import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { ArrowRight } from "lucide-react"

// ─── Real poles from K3RN_POLES_BLUEPRINT ────────────────────────────────────
const POLES = [
    { code: "P01", name: "Stratégie", tagline: "GO / NO-GO", desc: "Challenge systématique et positionnement." },
    { code: "P02", name: "Market", tagline: "TAM · SAM · SOM", desc: "Analyse marché et fenêtres d'opportunité." },
    { code: "P03", name: "Produit", tagline: "MVP · Architecture", desc: "Décomposition et plan d'implémentation." },
    { code: "P04", name: "Finance", tagline: "P&L · Break-even", desc: "Business model et projections 12–36 mois." },
    { code: "P05", name: "Marketing", tagline: "Copy · Growth", desc: "Brand strategy et campagnes de lancement." },
    { code: "P06", name: "Legal", tagline: "RGPD · Contrats", desc: "Structure légale et conformité sectorielle." },
    { code: "P07", name: "Talent", tagline: "Recrutement", desc: "Sourcing talent et coordination inter-pôles." },
]

const STEPS = [
    { n: "01", title: "Espace Cognitif", desc: "KAEL structure ta pensée en 4 questions précises. Problème, cible, outcome, contraintes. En moins de 5 minutes." },
    { n: "02", title: "Activation Réseau", desc: "Le besoin est routé vers l'expert dédié parmi les 7 pôles. Output actionnable, brut, sans générique." },
    { n: "03", title: "Memory Graph", desc: "Chaque interaction devient une Card typée. Ton historique de décision se transforme en graphe sémantique." },
]

// ─── Node-link graph mockup (SVG-based, aligned to app design) ─────────────────
function GraphMockup() {
    // Adapted data for k3rn.labs context, preserving the exact layout structure
    const nodes = [
        { id: "ai", cx: 450, cy: 400, r: 6, fill: "hsl(var(--primary))", label: "KAEL Orchestrator" },
        { id: "michel", cx: 350, cy: 300, r: 6, fill: "hsl(var(--muted-foreground))", label: "Fondateur" },
        { id: "zep", cx: 550, cy: 230, r: 6, fill: "hsl(var(--muted-foreground))", label: "proj_8a1b9c2" },
        { id: "maison", cx: 400, cy: 200, r: 6, fill: "hsl(var(--muted-foreground))", label: "Vision Produit" },
        { id: "ordre", cx: 250, cy: 400, r: 6, fill: "hsl(var(--muted-foreground))", label: "TAM Europe" },
        { id: "logique", cx: 300, cy: 520, r: 6, fill: "hsl(var(--muted-foreground))", label: "Analyse Concu" },
        { id: "clarte", cx: 420, cy: 580, r: 6, fill: "hsl(var(--muted-foreground))", label: "MVP Scope" },
        { id: "vie_pro", cx: 580, cy: 580, r: 6, fill: "hsl(var(--muted-foreground))", label: "Roadmap Q3" },
        { id: "nettoyage", cx: 600, cy: 480, r: 6, fill: "hsl(var(--muted-foreground))", label: "GO Marché" },
        { id: "brocolis", cx: 620, cy: 380, r: 6, fill: "hsl(var(--muted-foreground))", label: "Ret > 60%" },
        { id: "structure", cx: 720, cy: 400, r: 6, fill: "hsl(var(--muted-foreground))", label: "Pricing B2B" },
        { id: "menage", cx: 820, cy: 420, r: 6, fill: "hsl(var(--muted-foreground))", label: "Acquisition" },
        { id: "clarte_mentale", cx: 650, cy: 150, r: 6, fill: "hsl(var(--muted-foreground))", label: "Tech Stack" },
        { id: "ia", cx: 680, cy: 280, r: 6, fill: "hsl(var(--muted-foreground))", label: "IA Models" },
        { id: "human", cx: 750, cy: 580, r: 6, fill: "hsl(var(--primary))", label: "Utilisateur cible" },
    ]

    const edges = [
        { from: "ai", to: "michel", label: "ASSISTANT_ADDRESSED" },
        { from: "ai", to: "ordre", label: "ANALYSE" },
        { from: "ai", to: "logique", label: "MAPS" },
        { from: "ai", to: "clarte", label: "SUPPORTE" },
        { from: "ai", to: "vie_pro", label: "PLANIFIE" },
        { from: "ai", to: "nettoyage", label: "VALIDE" },
        { from: "ai", to: "brocolis", label: "FORMULE" },
        { from: "ai", to: "structure", label: "OPTIMISE" },
        { from: "ai", to: "menage", label: "IDENTIFIE" },
        { from: "michel", to: "ai", label: "HAS_NAME" },
        { from: "michel", to: "maison", label: "DÉFINIT" },
        { from: "zep", to: "maison", label: "METADATA_OF" },
        { from: "zep", to: "clarte_mentale", label: "METADATA_OF" },
        { from: "zep", to: "ia", label: "METADATA_OF" },
        { from: "zep", to: "brocolis", label: "METADATA_OF" },
        { from: "zep", to: "michel", label: "BELONGS_TO" },
    ]

    return (
        <div className="relative w-full overflow-hidden bg-background border border-border shadow-2xl" style={{ aspectRatio: "16/9" }}>
            {/* Subtle brutally minimal background pattern */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 40px,hsl(var(--foreground)) 40px,hsl(var(--foreground)) 41px),
                                      repeating-linear-gradient(90deg,transparent,transparent 40px,hsl(var(--foreground)) 40px,hsl(var(--foreground)) 41px)`,
                }}
            />

            {/* Header aligned with project design */}
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
                <h3 className="text-foreground text-xl font-bold tracking-tight font-sans">Semantic Memory Graph</h3>
                <p className="text-muted-foreground text-sm mt-1 font-mono">Visualization of contextual SaaS entities</p>
                <div className="mt-4 px-3 py-1.5 bg-primary/10 text-primary text-[10px] w-fit font-bold border border-primary/20 uppercase tracking-widest">
                    Entity Types
                </div>
            </div>

            {/* Bottom left Telemetry indicator replacing refresh */}
            <div className="absolute bottom-6 left-6 z-10">
                <div className="flex items-center gap-3 px-4 py-2 bg-background/80 backdrop-blur text-sm font-medium border border-border">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span className="text-muted-foreground font-mono uppercase tracking-widest text-[10px]">KAEL Telemetry Active</span>
                </div>
            </div>

            <svg viewBox="0 0 1000 700" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
                {edges.map((e, idx) => {
                    const from = nodes.find(n => n.id === e.from)!
                    const to = nodes.find(n => n.id === e.to)!
                    const mx = (from.cx + to.cx) / 2
                    const my = (from.cy + to.cy) / 2
                    const angle = Math.atan2(to.cy - from.cy, to.cx - from.cx) * 180 / Math.PI
                    const isFlipped = angle > 90 || angle < -90
                    const textAngle = isFlipped ? angle + 180 : angle
                    const isDoubleEdge = e.from === "michel" && e.to === "ai"

                    // Offset line if it's a double edge to prevent hard overlapping
                    const offsetX = isDoubleEdge ? 6 : 0
                    const offsetY = isDoubleEdge ? -6 : 0

                    return (
                        <g key={`${e.from}-${e.to}-${idx}`}>
                            <line
                                x1={from.cx + offsetX} y1={from.cy + offsetY}
                                x2={to.cx + offsetX} y2={to.cy + offsetY}
                                stroke="hsl(var(--border))"
                                strokeWidth="1.5"
                            />
                            {/* Mask over the line aligned with background */}
                            <rect
                                x={mx + offsetX - (e.label.length * 3)} y={my + offsetY - 6} width={e.label.length * 6} height="12"
                                fill="currentColor"
                                className="text-background"
                                transform={`rotate(${textAngle}, ${mx + offsetX}, ${my + offsetY})`}
                            />
                            <text
                                x={mx + offsetX} y={my + offsetY + 1}
                                fontSize="7"
                                fill="hsl(var(--muted-foreground))"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(${textAngle}, ${mx + offsetX}, ${my + offsetY})`}
                                fontFamily="monospace"
                                letterSpacing="0.5"
                                className="font-semibold uppercase opacity-70"
                            >
                                {e.label}
                            </text>
                        </g>
                    )
                })}
                {/* Loop for 'michel' to 'ai' connection */}
                <g>
                    <path
                        d={`M 345 295 C 310 240, 390 240, 355 295`}
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeWidth="1.5"
                    />
                    <rect x={328} y={244} width={44} height={12} fill="currentColor" className="text-background" />
                    <text
                        x={350} y={250}
                        fontSize="6"
                        fill="hsl(var(--muted-foreground))"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontFamily="monospace"
                        className="font-semibold uppercase opacity-70"
                    >
                        IS_NAMED
                    </text>
                </g>
                {nodes.map((n) => (
                    <g key={n.id} className="cursor-pointer group">
                        <circle cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} className="group-hover:scale-125 transition-transform duration-300 origin-center opacity-80 group-hover:opacity-100" style={{ transformBox: "fill-box" }} />
                        <text
                            x={n.cx + 12} y={n.cy + 1}
                            fontSize="11"
                            fill="hsl(var(--foreground))"
                            dominantBaseline="middle"
                            fontFamily="sans-serif"
                            className="font-medium tracking-tight"
                        >
                            {n.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">

            {/* ─── Header ─────────────────────────────────────────────── */}
            <header className="fixed top-0 left-0 right-0 z-50 mix-blend-difference px-6 py-6 transition-all duration-300">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Logo size="md" />
                    <div className="flex items-center gap-6 text-sm font-medium tracking-wide">
                        <Link href="/auth/login" className="text-muted-foreground hover:text-foreground transition-colors">
                            Log in
                        </Link>
                        <Link href="/auth/login" className="text-foreground hover:opacity-70 transition-opacity">
                            Early Access <span className="text-primary ml-1">→</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* ─── Hero ───────────────────────────────────────────────── */}
            <section className="relative min-h-[90vh] w-full flex flex-col border-none overflow-hidden bg-[#050505]">
                {/* Architectural Layout Lines */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: `linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                                           linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)`,
                        backgroundSize: '4rem 4rem',
                        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)'
                    }}
                />

                <div className="flex-1 flex flex-col justify-end px-6 md:px-12 max-w-[1600px] mx-auto w-full pb-24 pt-40 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-16 items-end">

                        {/* Main Typography Column */}
                        <div className="lg:col-span-9 flex flex-col gap-10">
                            {/* System Status Text */}
                            <div className="flex items-center gap-4 text-[11px] font-mono tracking-widest text-muted-foreground uppercase opacity-80">
                                <span className="flex items-center gap-2 text-primary font-bold">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    Cognitive OS
                                </span>
                                <span>/</span>
                                <span>7 Poles Experts</span>
                                <span className="hidden sm:inline">/</span>
                                <span className="hidden sm:inline">Build v0.9.4-beta</span>
                            </div>

                            {/* Massive Headline */}
                            <h1 className="text-[4rem] sm:text-[6rem] lg:text-[8rem] xl:text-[9.5rem] font-black tracking-[-0.04em] leading-[0.85] text-foreground uppercase mix-blend-difference">
                                Ton équipe <span className="text-primary italic pr-4 font-serif font-light">IA</span><br />
                                <span className="text-[#888]">Orchestrée.</span>
                            </h1>

                            {/* Action Row */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 mt-4">
                                <Link href="/auth/login" className="group relative">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-purple-500/50 blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                    <Button size="lg" className="relative rounded-none h-16 px-10 text-sm tracking-widest uppercase font-bold bg-foreground text-background hover:bg-foreground hover:scale-[1.02] transition-all border border-transparent">
                                        Initialiser KAEL <span className="ml-3 font-serif italic font-normal opacity-70 group-hover:translate-x-1 transition-transform">→</span>
                                    </Button>
                                </Link>
                                <div className="flex flex-col text-[10px] font-mono tracking-widest text-muted-foreground uppercase leading-[1.6] border-l border-border pl-6 py-1">
                                    <span>Accès restreint</span>
                                    <span className="text-foreground font-semibold">Authentification requise</span>
                                </div>
                            </div>
                        </div>

                        {/* Specs / Description Column */}
                        <div className="lg:col-span-3 pb-2">
                            <div className="border border-border/50 bg-background/40 backdrop-blur-xl p-8 relative overflow-hidden group hover:border-border transition-colors duration-500">
                                {/* Brutalist UI Accents */}
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-foreground opacity-50 group-hover:opacity-100 transition-opacity" />

                                <h3 className="text-[10px] font-mono tracking-widest text-primary uppercase mb-6 flex justify-between items-center">
                                    <span>Architecture</span>
                                    <span className="text-muted-foreground">01</span>
                                </h3>
                                <p className="text-[13px] leading-relaxed text-muted-foreground font-sans">
                                    k3rn.labs orchestre <strong className="text-foreground font-semibold">7 pôles experts</strong> autour de ton projet. <strong className="text-foreground font-semibold">KAEL</strong>, ton copilote central, route, synthétise et construit ta mémoire structurée en temps réel.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Graph preview (Full bleed) ─────────────────────────── */}
            <section className="w-full border-y border-border">
                <div className="flex border-b border-border">
                    <div className="px-6 py-4 flex-1 text-[10px] font-mono tracking-widest text-muted-foreground uppercase border-r border-border">
                        System Topology
                    </div>
                    <div className="px-6 py-4 flex-1 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                        Live Cognitive Graph
                    </div>
                </div>
                <GraphMockup />
                <div className="flex border-t border-border">
                    {["Vision", "Décision", "Analyse", "Hypothèse", "Problème"].map((t, i) => (
                        <div key={t} className={`flex-1 px-6 py-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase text-center ${i !== 4 ? 'border-r border-border' : ''}`}>
                            {t}
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── How it works (Editorial Layout) ────────────────────── */}
            <section className="py-32 px-6 max-w-[1400px] mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-24">
                    <div className="lg:col-span-4 flex flex-col justify-between">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight mb-4">De l'idée à la<br />décision structurée.</h2>
                            <p className="text-muted-foreground">Un flux cognitif conçu pour les fondateurs qui pensent vite et décident seuls.</p>
                        </div>
                        <div className="hidden lg:block w-16 h-px bg-border mt-24" />
                    </div>

                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {STEPS.map((s, i) => (
                            <div key={s.n} className="flex flex-col group">
                                <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-6 pb-6 border-b border-border flex justify-between">
                                    <span>Phase {s.n}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">→</span>
                                </div>
                                <h3 className="text-xl font-bold tracking-tight mb-4">{s.title}</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── 7 Pôles (Grid Asymmetry) ───────────────────────────── */}
            <section className="border-y border-border bg-muted/10">
                <div className="max-w-[1400px] mx-auto w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-l border-border">

                        {/* Title Block */}
                        <div className="p-8 md:p-12 lg:col-span-2 border-r border-border flex flex-col justify-between min-h-[400px] bg-background">
                            <div>
                                <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">7 Pôles.<br />Une Voix.</h2>
                                <p className="text-lg text-muted-foreground max-w-sm">
                                    Chaque pôle est une équipe spécialisée world-class. Output directement actionnable, jamais générique.
                                </p>
                            </div>

                            <div className="mt-12 p-6 border border-primary/20 bg-primary/5">
                                <div className="text-[10px] font-mono tracking-widest text-primary uppercase mb-2">Orchestrateur Central</div>
                                <h3 className="text-xl font-bold mb-2">KAEL</h3>
                                <p className="text-sm text-muted-foreground">Mémoire vectorielle. Route, synthétise, consolide. Une seule voix qui coordonne les 7 pôles experts en asynchrone.</p>
                            </div>
                        </div>

                        {/* Poles Grid */}
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2">
                            {POLES.map((p, i) => (
                                <div key={p.code} className={`p-8 border-b border-r border-border hover:bg-background transition-colors flex flex-col h-full min-h-[200px] ${(i === POLES.length - 1) && (POLES.length % 2 !== 0) ? 'sm:col-span-2' : ''}`}>
                                    <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-6 flex justify-between items-center">
                                        <span>{p.code}</span>
                                        <span className="text-foreground">{p.tagline}</span>
                                    </div>
                                    <div className="mt-auto">
                                        <h3 className="text-lg font-bold tracking-tight mb-2">{p.name}</h3>
                                        <p className="text-sm text-muted-foreground">{p.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </section>

            {/* ─── Final CTA ───────────────────────────────────────────── */}
            <section className="py-32 px-6 text-center max-w-[800px] mx-auto w-full">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-8">Structure ton<br />espace cognitif.</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/auth/login">
                        <Button size="lg" className="rounded-none h-14 px-12 text-sm tracking-widest uppercase font-bold bg-foreground text-background hover:bg-muted-foreground transition-all">
                            Créer mon workspace
                        </Button>
                    </Link>
                </div>
                <p className="mt-8 text-xs font-mono tracking-widest text-muted-foreground uppercase">
                    Beta gratuite · 7 Pôles · Claude + GPT-4o
                </p>
            </section>

            {/* ─── Footer ─────────────────────────────────────────────── */}
            <footer className="border-t border-border">
                <div className="max-w-[1400px] mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <Logo size="md" />
                    <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                        KAEL · n8n · Claude · GPT-4o · Supabase · pgvector
                    </p>
                    <div className="flex gap-8 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                        <span className="cursor-pointer hover:text-foreground transition-colors">CGU</span>
                        <span className="cursor-pointer hover:text-foreground transition-colors">Privacy</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}
