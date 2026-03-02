import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"

// ─── Managers K3RN — 7 pôles experts ─────────────────────────────────────────
const MANAGERS = [
    { name: "AXEL",   code: "P01", title: "Directeur Stratégie & Innovation", tagline: "GO / NO–GO",        desc: "Challenge systématique et positionnement.",      hashtags: ["#pitch", "#stratégie", "#brainstorming"], color: "#7c3aed", initiale: "A", avatar: null as string | null },
    { name: "MAYA",   code: "P02", title: "Directrice Market & Intelligence",  tagline: "TAM · SAM · SOM",   desc: "Analyse marché et fenêtres d'opportunité.",      hashtags: ["#market", "#veille", "#concurrents"],     color: "#2563eb", initiale: "M", avatar: null as string | null },
    { name: "KAI",    code: "P03", title: "Architecte Produit & Tech",         tagline: "MVP · STACK",       desc: "Décomposition et plan d'implémentation.",        hashtags: ["#mvp", "#tech", "#stack"],               color: "#059669", initiale: "K", avatar: null as string | null },
    { name: "ELENA",  code: "P04", title: "Directrice Financière",             tagline: "P&L · BREAK-EVEN",  desc: "Business model et projections 12–36 mois.",      hashtags: ["#finance", "#budget", "#investisseur"],   color: "#d97706", initiale: "E", avatar: null as string | null },
    { name: "ZARA",   code: "P05", title: "Chief Marketing Officer",           tagline: "COPY · GROWTH",     desc: "Brand strategy et campagnes de lancement.",      hashtags: ["#marketing", "#brand", "#seo"],          color: "#db2777", initiale: "Z", avatar: null as string | null },
    { name: "MARCUS", code: "P06", title: "Conseiller Juridique",              tagline: "RGPD · CONTRATS",   desc: "Structure légale et conformité sectorielle.",    hashtags: ["#legal", "#rgpd", "#contrat"],           color: "#64748b", initiale: "M", avatar: null as string | null },
    { name: "NOVA",   code: "P07", title: "Directrice des Opérations",         tagline: "TALENT · OPS",      desc: "Sourcing talent et coordination inter-pôles.",   hashtags: ["#talent", "#ops", "#recrutement"],       color: "#ea580c", initiale: "N", avatar: null as string | null },
]

const STEPS = [
    { n: "01", title: "Briefing instantané",       desc: "Partagez votre idée à KAEL — en quelques échanges, il identifie le besoin, la cible, les enjeux. Pas de formulaire, pas de template." },
    { n: "02", title: "Équipe activée",            desc: "KAEL route votre besoin vers le bon expert parmi les 7 pôles. Stratégie, finance, tech, juridique, marketing : l'output est direct, actionnable, sans générique." },
    { n: "03", title: "Lancement & optimisation",  desc: "Chaque décision est mémorisée. Votre projet évolue, vos experts s'adaptent. Pilotez, ajustez, scalez — en continu." },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function ManagerAvatar({ name, initiale, color, avatar }: { name: string; initiale: string; color: string; avatar: string | null }) {
    if (avatar) return <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover" />
    return (
        <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
            style={{ backgroundColor: color + "18", border: `1px solid ${color}44`, color }}
        >
            {initiale}
        </div>
    )
}

function ManagerCard({ m }: { m: typeof MANAGERS[0] }) {
    return (
        <div className="shrink-0 w-56 border-r border-white/[0.06] hover:bg-white/[0.03] transition-colors flex flex-col gap-4 p-6 min-h-[340px] group">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-widest text-white/25 uppercase">{m.code}</span>
                <span className="text-[9px] font-mono tracking-widest text-white/30 uppercase opacity-0 group-hover:opacity-100 transition-opacity">{m.tagline}</span>
            </div>
            <ManagerAvatar name={m.name} initiale={m.initiale} color={m.color} avatar={m.avatar} />
            <div className="flex-1">
                <h3 className="text-sm font-bold tracking-tight text-white/90">{m.name}</h3>
                <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{m.title}</p>
                <p className="text-xs text-white/30 mt-3 leading-relaxed">{m.desc}</p>
            </div>
            <div className="flex flex-wrap gap-1">
                {m.hashtags.map((h) => (
                    <span key={h} className="text-[9px] font-mono text-white/25 bg-white/[0.05] px-1.5 py-0.5 rounded-sm">{h}</span>
                ))}
            </div>
        </div>
    )
}

// ─── Graph mockup ──────────────────────────────────────────────────────────────
function GraphMockup() {
    const nodes = [
        { id: "ai",            cx: 450, cy: 400, r: 7,  fill: "hsl(var(--primary))", label: "KAEL Orchestrator", primary: true },
        { id: "fondateur",     cx: 350, cy: 300, r: 5,  fill: "rgba(255,255,255,0.5)", label: "Fondateur" },
        { id: "projet",        cx: 550, cy: 230, r: 5,  fill: "rgba(255,255,255,0.4)", label: "proj_8a1b9c2" },
        { id: "vision",        cx: 400, cy: 200, r: 5,  fill: "rgba(255,255,255,0.4)", label: "Vision Produit" },
        { id: "marche",        cx: 250, cy: 400, r: 5,  fill: "rgba(255,255,255,0.4)", label: "TAM Europe" },
        { id: "analyse",       cx: 300, cy: 520, r: 5,  fill: "rgba(255,255,255,0.4)", label: "Analyse Concu" },
        { id: "mvp",           cx: 420, cy: 580, r: 5,  fill: "rgba(255,255,255,0.4)", label: "MVP Scope" },
        { id: "roadmap",       cx: 580, cy: 580, r: 5,  fill: "rgba(255,255,255,0.4)", label: "Roadmap Q3" },
        { id: "go",            cx: 600, cy: 480, r: 5,  fill: "rgba(255,255,255,0.4)", label: "GO Marché" },
        { id: "retention",     cx: 620, cy: 380, r: 5,  fill: "rgba(255,255,255,0.4)", label: "Rét. > 60%" },
        { id: "pricing",       cx: 720, cy: 400, r: 5,  fill: "rgba(255,255,255,0.4)", label: "Pricing B2B" },
        { id: "acquisition",   cx: 820, cy: 420, r: 5,  fill: "rgba(255,255,255,0.4)", label: "Acquisition" },
        { id: "tech",          cx: 650, cy: 150, r: 5,  fill: "rgba(255,255,255,0.4)", label: "Tech Stack" },
        { id: "ia",            cx: 680, cy: 280, r: 5,  fill: "rgba(255,255,255,0.4)", label: "IA Models" },
        { id: "utilisateur",   cx: 750, cy: 580, r: 7,  fill: "hsl(var(--primary))", label: "Utilisateur cible", primary: true },
    ]
    const edges = [
        { from: "ai", to: "fondateur",   label: "ADRESSE" },
        { from: "ai", to: "marche",      label: "ANALYSE" },
        { from: "ai", to: "analyse",     label: "MAPS" },
        { from: "ai", to: "mvp",         label: "SUPPORTE" },
        { from: "ai", to: "roadmap",     label: "PLANIFIE" },
        { from: "ai", to: "go",          label: "VALIDE" },
        { from: "ai", to: "retention",   label: "FORMULE" },
        { from: "ai", to: "pricing",     label: "OPTIMISE" },
        { from: "ai", to: "acquisition", label: "IDENTIFIE" },
        { from: "fondateur", to: "vision",  label: "DÉFINIT" },
        { from: "projet", to: "vision",     label: "METADATA" },
        { from: "projet", to: "tech",       label: "METADATA" },
        { from: "projet", to: "ia",         label: "METADATA" },
        { from: "projet", to: "fondateur",  label: "BELONGS_TO" },
    ]
    return (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9", background: "rgba(0,0,0,0.6)" }}>
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,1) 40px,rgba(255,255,255,1) 41px), repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,1) 40px,rgba(255,255,255,1) 41px)` }} />
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
                <p className="text-white/70 text-lg font-bold tracking-tight">Decision Memory Graph</p>
                <p className="text-white/30 text-xs mt-0.5 font-mono">Live · k3rn.labs workspace</p>
            </div>
            <div className="absolute bottom-6 left-6 z-10">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.05] backdrop-blur">
                    <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span></span>
                    <span className="text-white/40 font-mono uppercase tracking-widest text-[9px]">KAEL Telemetry Active</span>
                </div>
            </div>
            <svg viewBox="0 0 1000 700" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
                {edges.map((e, idx) => {
                    const from = nodes.find(n => n.id === e.from)!
                    const to = nodes.find(n => n.id === e.to)!
                    const mx = (from.cx + to.cx) / 2
                    const my = (from.cy + to.cy) / 2
                    const angle = Math.atan2(to.cy - from.cy, to.cx - from.cx) * 180 / Math.PI
                    const textAngle = (angle > 90 || angle < -90) ? angle + 180 : angle
                    return (
                        <g key={`${e.from}-${e.to}-${idx}`}>
                            <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                            <rect x={mx - (e.label.length * 3)} y={my - 6} width={e.label.length * 6} height="12" fill="black" opacity="0.6" transform={`rotate(${textAngle}, ${mx}, ${my})`} />
                            <text x={mx} y={my + 1} fontSize="6.5" fill="rgba(255,255,255,0.3)" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textAngle}, ${mx}, ${my})`} fontFamily="monospace" letterSpacing="0.5" className="uppercase">{e.label}</text>
                        </g>
                    )
                })}
                {nodes.map((n) => (
                    <g key={n.id} className="cursor-pointer group">
                        {n.primary && <circle cx={n.cx} cy={n.cy} r={n.r + 6} fill={n.fill} opacity="0.1" />}
                        <circle cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} opacity={n.primary ? 1 : 0.6} />
                        <text x={n.cx + 13} y={n.cy + 1} fontSize="10.5" fill={n.primary ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"} dominantBaseline="middle" fontFamily="sans-serif" fontWeight={n.primary ? "600" : "400"}>{n.label}</text>
                    </g>
                ))}
            </svg>
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#060608] text-foreground flex flex-col selection:bg-primary/20">

            {/* ─── Header — glass liquid pill ─────────────────────────── */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="max-w-[1400px] mx-auto">
                    <div className="flex items-center justify-between px-5 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-10 bg-gradient-to-b from-transparent via-primary/50 to-transparent pointer-events-none" />
                        <Logo size="lg" />
                        <nav className="flex items-center gap-1">
                            <Link href="/auth/login" className="px-4 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-all duration-200">
                                Log in
                            </Link>
                            <Link href="/auth/login" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/92 transition-all duration-200 shadow-[0_2px_16px_rgba(255,255,255,0.18),inset_0_1px_0_rgba(255,255,255,0.8)]">
                                Early Access
                                <span className="text-black/40 text-xs">→</span>
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* ─── Hero ───────────────────────────────────────────────── */}
            <section className="relative min-h-[96vh] w-full flex flex-col items-center justify-center overflow-hidden bg-[#000000] pt-32 pb-24">
                {/* Ambient orbs */}
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary/25 blur-[160px] rounded-full pointer-events-none" />
                <div className="absolute top-[20%] left-[15%] w-[400px] h-[400px] bg-violet-700/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-[30%] right-[10%] w-[300px] h-[300px] bg-blue-600/8 blur-[100px] rounded-full pointer-events-none" />

                {/* Perspective grid floor */}
                <div className="absolute bottom-0 left-0 right-0 h-[55vh] bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,#000_60%,transparent_100%)] pointer-events-none" style={{ transform: 'perspective(1000px) rotateX(60deg) translateY(80px) scale(3)' }} />

                <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto gap-8 mt-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/[0.12] bg-white/[0.06] backdrop-blur text-white/70 text-xs font-medium tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-70"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                        </span>
                        Votre équipe de direction. Disponible dès maintenant.
                    </div>

                    {/* Headline */}
                    <h1 className="text-[clamp(3.5rem,9vw,7rem)] font-jakarta font-extrabold tracking-[-0.04em] leading-[1.02] pb-2">
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/50">Une idée.</span>
                        <br />
                        <span className="font-serif italic font-light text-primary/90">Une multinationale</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/80 to-white/30"> derrière.</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-lg sm:text-xl text-white/40 max-w-2xl leading-relaxed font-light tracking-wide">
                        De l'idée au lancement — seul, mais armé comme une grande structure.
                        Stratégie, finance, juridique, marketing, tech&nbsp;:&nbsp;
                        <strong className="text-white/80 font-medium">7 experts dédiés</strong>, coordonnés par KAEL.
                    </p>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 mt-6">
                        <Link href="/auth/login" className="group relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 via-violet-500/50 to-primary/50 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-700" />
                            <button className="relative h-14 px-10 rounded-xl text-sm font-semibold tracking-wide bg-white text-black hover:bg-white/94 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_24px_rgba(255,255,255,0.1)] overflow-hidden flex items-center gap-3">
                                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="relative">Démarrer avec KAEL</span>
                                <svg className="w-4 h-4 text-black/50 group-hover:translate-x-1 transition-transform relative" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-white/25">
                            <div className="w-px h-7 bg-white/10 hidden sm:block" />
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <span>Accès beta réservé aux fondateurs</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Graph preview ───────────────────────────────────────── */}
            <section className="relative w-full max-w-[1280px] mx-auto px-6 -mt-20 pb-32 z-20">
                <div className="rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.9),0_0_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.07)] overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-white/10 hover:bg-[#ff5f56]/80 transition-colors cursor-pointer" />
                            <div className="w-3 h-3 rounded-full bg-white/10 hover:bg-[#ffbd2e]/80 transition-colors cursor-pointer" />
                            <div className="w-3 h-3 rounded-full bg-white/10 hover:bg-[#27c93f]/80 transition-colors cursor-pointer" />
                        </div>
                        <span className="text-[10px] font-mono tracking-widest text-white/25 uppercase">Decision Memory Graph · Live</span>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-emerald-400/70 uppercase bg-emerald-400/[0.07] px-2.5 py-1 rounded-lg border border-emerald-400/10">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400/70 animate-pulse" />
                            Sync
                        </div>
                    </div>
                    <div className="relative">
                        <GraphMockup />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* ─── How it works ────────────────────────────────────────── */}
            <section className="py-32 px-6 max-w-[1400px] mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-16 gap-y-20">
                    <div className="lg:col-span-4">
                        <p className="text-[10px] font-mono tracking-widest text-primary/60 uppercase mb-6">Comment ça marche</p>
                        <h2 className="text-4xl font-jakarta font-bold tracking-tight mb-5 leading-tight">De l'idée<br />au marché.</h2>
                        <p className="text-white/40 leading-relaxed">Vous avez une idée. Nous avons l'équipe. Du premier brief jusqu'au lancement et à l'optimisation continue — sans recruter, sans agence, sans attendre.</p>
                    </div>
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {STEPS.map((s) => (
                            <div key={s.n} className="flex flex-col group">
                                <div className="text-[10px] font-mono tracking-widest text-white/20 uppercase mb-6 pb-5 border-b border-white/[0.06] flex justify-between items-center">
                                    <span>Phase {s.n}</span>
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary text-sm">→</span>
                                </div>
                                <h3 className="text-lg font-bold tracking-tight mb-3 text-white/90">{s.title}</h3>
                                <p className="text-sm leading-relaxed text-white/35">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── 7 Pôles — horizontal scroll ─────────────────────────── */}
            <section className="border-y border-white/[0.06] overflow-hidden bg-[#030304]">
                <div className="flex">
                    {/* KAEL — sticky */}
                    <div className="shrink-0 w-72 border-r border-white/[0.06] flex flex-col justify-between p-8 sticky left-0 z-10 bg-[#030304]">
                        <div>
                            <p className="text-[10px] font-mono tracking-widest text-white/20 uppercase mb-6">7 Pôles. Une Voix.</p>
                            <h2 className="text-3xl font-jakarta font-bold tracking-tighter mb-4 leading-tight text-white/90">Votre équipe<br />de direction<br />complète.</h2>
                            <p className="text-sm text-white/35 leading-relaxed">
                                L'expertise d'une grande structure, accessible à chaque fondateur — seul, dès le premier jour.
                            </p>
                        </div>
                        <div className="mt-8 pt-8 border-t border-white/[0.06]">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-mono tracking-widest text-primary/70 uppercase">Intelligence Centrale</span>
                            </div>
                            <p className="text-sm font-bold mb-1.5 text-white/80">KAEL</p>
                            <p className="text-xs text-white/30 leading-relaxed">
                                Votre assistant stratégique personnel. Il reçoit vos besoins, active le bon expert, et garde mémoire de chaque décision prise pour votre projet.
                            </p>
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {MANAGERS.map((m) => <ManagerCard key={m.code} m={m} />)}
                    </div>
                </div>
            </section>

            {/* ─── Incubateur & Communauté ─────────────────────────────── */}
            <section className="py-32 px-6 max-w-[1400px] mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-16 gap-y-16">
                    <div className="lg:col-span-4">
                        <p className="text-[10px] font-mono tracking-widest text-primary/60 uppercase mb-6">Horizon</p>
                        <h2 className="text-4xl font-jakarta font-bold tracking-tight mb-5 leading-tight">Au-delà<br />de l'idée.</h2>
                        <p className="text-white/40 leading-relaxed">
                            k3rn.labs n'est pas seulement un outil. C'est un écosystème ouvert où les projets se structurent, se financent, et trouvent leurs collaborateurs.
                        </p>
                    </div>
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.05] rounded-xl overflow-hidden">
                        {[
                            {
                                title: "Financement\ncommunautaire",
                                desc: "Présentez votre projet structuré à la communauté k3rn. Recevez des pledges, validez votre marché, levez les premiers fonds — sans intermédiaire.",
                                status: "Bientôt disponible",
                                active: false,
                            },
                            {
                                title: "Collaboration\ninter-projets",
                                desc: "Trouvez des co-fondateurs, des freelances, des premiers clients dans l'écosystème. Chaque projet est une opportunité de connexion.",
                                status: "Bientôt disponible",
                                active: false,
                            },
                            {
                                title: "Lancement\n& optimisation continue",
                                desc: "Le marché change, votre projet évolue. Vos 7 pôles restent actifs — pour ajuster la stratégie, challenger les hypothèses, et scaler.",
                                status: "Disponible dès maintenant",
                                active: true,
                            },
                        ].map((item) => (
                            <div key={item.title} className="bg-[#060608] p-8 flex flex-col gap-5 group hover:bg-white/[0.02] transition-colors">
                                <div className="w-6 h-px bg-primary/60 group-hover:w-10 transition-all duration-300" />
                                <h3 className="text-base font-bold tracking-tight text-white/80 whitespace-pre-line leading-snug">{item.title}</h3>
                                <p className="text-sm text-white/35 leading-relaxed flex-1">{item.desc}</p>
                                <span className={`text-[9px] font-mono tracking-widest uppercase mt-auto ${item.active ? "text-primary/70" : "text-white/20"}`}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Final CTA ───────────────────────────────────────────── */}
            <section className="relative py-40 px-6 text-center overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-[800px] mx-auto">
                    <p className="text-[10px] font-mono tracking-widest text-primary/60 uppercase mb-8">Rejoignez k3rn.labs</p>
                    <h2 className="text-5xl md:text-6xl font-jakarta font-extrabold tracking-[-0.03em] mb-6 leading-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">Votre idée mérite<br />une vraie équipe.</span>
                    </h2>
                    <p className="text-white/35 mb-12 max-w-md mx-auto leading-relaxed">
                        Rejoignez les fondateurs qui construisent avec k3rn.labs — seuls, mais armés comme une multinationale.
                    </p>
                    <Link href="/auth/login" className="group relative inline-flex">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 via-violet-500/40 to-primary/40 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition duration-700" />
                        <button className="relative h-14 px-12 rounded-xl text-sm font-bold tracking-widest uppercase bg-white text-black hover:bg-white/94 transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(255,255,255,0.12)] flex items-center gap-3">
                            Démarrer maintenant
                            <svg className="w-4 h-4 text-black/40 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                    </Link>
                    <p className="mt-8 text-[10px] font-mono tracking-widest text-white/20 uppercase">
                        Accès beta gratuit · 7 Pôles experts · KAEL inclus
                    </p>
                </div>
            </section>

            {/* ─── Footer ──────────────────────────────────────────────── */}
            <footer className="border-t border-white/[0.06]">
                <div className="max-w-[1400px] mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <Logo size="lg" />
                    <p className="text-[10px] font-mono tracking-widest text-white/20 uppercase">
                        KAEL · n8n · Claude · GPT-4o · Supabase · pgvector
                    </p>
                    <div className="flex gap-8 text-[10px] font-mono tracking-widest text-white/20 uppercase">
                        <span className="cursor-pointer hover:text-white/50 transition-colors">CGU</span>
                        <span className="cursor-pointer hover:text-white/50 transition-colors">Privacy</span>
                    </div>
                </div>
            </footer>

        </div>
    )
}
