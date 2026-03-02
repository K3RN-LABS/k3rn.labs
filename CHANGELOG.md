# Changelog

All notable changes to this project are documented in this file.

Format based on Keep a Changelog.
Types: FEATURE, FIX, REFACTOR, CHORE.

---

## 2026-03-02

REFACTOR: Full landing redesign — bg #060608 unifié, ambient orbs hero, glassmorphism graph mockup, typographie font-jakarta, sections avec depth (border white/6), CTA final avec ambient glow, footer minimaliste
REFACTOR: Header landing — glass liquid effect (backdrop-blur, border white/8, shimmer layer, left-edge glow), pill nav avec bouton Early Access solid white, logo size lg
FEATURE: Add section incubateur/communauté — financement communautaire, collaboration inter-projets, lancement & optimisation continue
REFACTOR: Rewrite landing page copy — promesse "idée → multinationale" au lieu de "système cognitif", hero, sous-titre, steps, KAEL block, CTA
REFACTOR: Redesign section "7 Pôles" en scrollable horizontal — KAEL sticky à gauche, 7 manager cards défilantes, cards compactes (w-52, min-h-340px)
FIX: Update KAEL description on landing page — "Copilote" → "Assistant stratégique personnel", label "Orchestrateur Central" → "Intelligence Centrale", tu→vous, fix typo "tese"
FEATURE: Refonte section "7 Pôles" landing page — vrais managers AXEL/MAYA/KAI/ELENA/ZARA/MARCUS/NOVA avec avatar placeholder (initiale colorée), titre, description, hashtags, grille 4 colonnes responsive
FEATURE: Add copy button (hover) on every chat message in onboarding — clipboard copy with 1.5s check feedback
FEATURE: Add retry button (hover) on KAEL messages — DELETE last exchange then re-send same user input for a fresh response
FIX: KAEL stops after weak-acceptance without asking next aspect — prompt now enforces question on next aspect after every confirmation (strong or weak)
FIX: stateReminder now lists remaining aspects and explicitly mandates question on next aspect in scope
FEATURE: Add KaelQuestionWizard — paginated multi-question modal with per-question single/multi-select and progress bar
FEATURE: Extend KAELResponse and ChatMessage with questions[] field for guided questionnaire blocks
FEATURE: Update invokeChefDeProjet prompt to generate questions[] when multiple aspects need collection
FEATURE: Update onboarding route to propagate questions[] to ChatMessage (priority over flat choices)

FEATURE: Tags libres couleur sur les dossiers — badge coloré sur chaque carte, popover d'édition inline, palette 8 couleurs, stocké en DB (tags String[])
FEATURE: HomeDock flottant sur la page Home — filtres par tag/statut/lab + bouton nouveau dossier, style Apple dock
FIX: Avertissement nom dupliqué dans le dialog de création de dossier (bandeau ambre, sans blocage)
FIX: Variabilité réponses KAEL — temperature 0.3 dans callLLMProxy (n8n.ts), invokeChefDeProjet (claude.ts) et workflow n8n LLMProxy (Validate + Call OpenAI)
FIX: Bouton retour workspace redirige vers /home au lieu de / (landing page)
FIX: KAEL s'arrête après acquittement — ajout règle "jamais terminer sans question si aspects manquants", exemple concret dans prompt
FIX: KAEL choices sans question — choices conditionnels (prompt + guard serveur), omis si message est acquittement/transition sans "?"
FIX: KaelInlineChoices display bug — add prompt rule forbidding question text inside choices array (labels only, 2-5 words max)
FEATURE: KaelInlineChoices multi-select — checkbox accumulation mode with Valider (N) button, auto "Tout cela" option when 3+ choices
FIX: KAEL challenge prompt — une seule dimension par message, choices cohérentes avec la question posée, max 20 mots par question
FEATURE: OnboardingProgress badge ambre pour aspects weak — bar segment et label en amber-400, tooltip "à affiner"
REFACTOR: Redesign invokeChefDeProjet system prompt — KAEL becomes YC-associate mode with dual role (natural assistant + silent extractor), solidarity criteria, challenge flow capped at 2, and dynamic JSON example reflecting actual state
FEATURE: Add aspectQuality and challengeCount fields to KAELResponse interface
FEATURE: Add confirmedQualities and challengeCounts to invokeChefDeProjet stateContext parameter
FIX: Add guard capping challengeCount values at 2 in invokeChefDeProjet response parsing

REFACTOR: Pass confirmedQualities and challengeCounts from existingState to invokeChefDeProjet stateContext in onboarding POST route
REFACTOR: Forward aspectQuality and challengeCount from aiResponse into applyLLMResponse call in onboarding POST route

REFACTOR: applyLLMResponse now LLM-driven — accepts llmQuality and llmChallengeCount params, replaces server-side heuristic auto-confirm with guard at 2 challenges (weak force-confirm)
FEATURE: toDTO exposes aspectQuality field in OnboardingStateDTO so UI can render weak/strong badge

FIX: KAEL no longer re-asks confirmed aspects — added end-of-prompt state reminder with recency weight and fixed confirmedAspects JSON example to reflect actual confirmed list
FEATURE: OnboardingProgress bar fades in after first KAEL message load (300ms delay, premium entrance)
FEATURE: OnboardingProgress bar animates a scanning shimmer dot across segments while KAEL is thinking
FIX: Strip choices from history messages on each POST — inline choices no longer persist after user replies
FIX: Move OnboardingProgress to header (sticky) — no longer scrolls out of view during conversation
FIX: Replace scrollable KAEL badge+progress block in chat with compact "KAEL" pill in header right slot
FIX: Raise onboarding message max length from 4000 to 10000 — long project descriptions were rejected by Zod
FIX: Add maxLength={10000} to onboarding Textarea — browser enforces same limit as server schema
FIX: Display Zod field details in onboarding error messages — easier debugging of future validation failures
FIX: Add console.error in validateBody on Zod failure — logs field errors in Vercel/server logs
CHORE: Create CLAUDE.md at project root — architecture rules, MCP servers, critical files index
CHORE: Add .claude/rules/onboarding-ux.md — onboarding patterns, layout rules, known bugs
FIX: Add "binary" to fileContextSchema kind enum — prevents Zod validation error on POST
FIX: Filter binary files client-side before POST — binary files have no content/dataUrl for LLM
FIX: Move interim voice transcript above input row — no longer pushes buttons off-screen
FIX: Add max-h-[200px] + overflow-y-auto to onboarding textarea — prevents unlimited vertical growth
FIX: useAutoResize hook respects CSS maxHeight — textarea height capped at computed max

FIX: Floating chat windows use explicit bg-[#111111] — no more white background on dark theme
FIX: Chat message bubbles use bg-white/8 — no dependency on bg-muted CSS variable
FIX: Chat input zone uses bg-white/5 and border-white/10 — fully dark regardless of theme
FIX: Auto-minimize limit reduced from 3 to 2 — prevents chat windows from overflowing screen width
FIX: Chat window width reduced from 360px to 320px — better fit with 2-up layout
FIX: Chat windows bottom offset raised to bottom-[108px] — no overlap with Dock (bottom-6 + 72px height)
FIX: Minimized chat tabs repositioned to bottom-[108px] and displayed in horizontal row (flex-row-reverse)
FIX: KaelPanel collapsed state uses bg-[#0a0a0a] — eliminates white strip on dark theme
FIX: KaelPanel open state uses bg-[#0f0f0f] instead of bg-background/90 — consistent dark background
FEATURE: Workspace loading screen uses animated spinning logo instead of ✦ star icon
FEATURE: Dossier redirect loading screen uses animated spinning logo instead of ✦ star icon

## 2026-03-01

FIX: Dock z-index raised to z-60 — always accessible above floating chat windows
FIX: Chat windows anchored to bottom-[72px] — no longer overlap the Dock
FIX: Minimized chat tabs repositioned to bottom-[140px] z-40 — no collision with MiniMap or KaelPanel
FIX: MiniMap repositioned to top-4 right-4 — out of floating-layer zone
FEATURE: FIFO auto-minimize for chat windows — oldest expanded window minimizes when 4th is opened (max 3 visible)
REFACTOR: Dock KAEL button unified — always toggles KaelPanel permanent (no duplicate floating KAEL window)
FIX: Add onboarding gate in WorkspacePage — redirect to onboarding if step !== COMPLETE
FEATURE: Add GET /api/status/worker endpoint — reports CardIngestionJob counts (pending/running/stale/failed)
REFACTOR: Link ExpertSession to PoleSession via optional poleSessionId FK in Prisma schema
FIX: Add postinstall script to force deterministic prisma generate on Vercel CI (fixes CardState not exported from @prisma/client)
FIX: Remove duplicate CardState enum declaration in prisma/schema.prisma (lines 455-459)
CHORE: Delete orphaned floating-dock.tsx component (replaced by Dock.tsx, zero imports)
CHORE: Add .env and .env.* to .gitignore and remove .env from git tracking

---

## 2026-03-01

FIX: onboarding — Prevent UI race condition showing completion banner simultaneously with unanswered question by deferring step=COMPLETE on server when hasPendingChoices
FIX: applyLLMResponse — server-side auto-confirmation of currentQuestion when user gives substantive answer (>= 8 chars, not "je sais pas")
FIX: KAEL onboarding reasoning — LLM stateBlock now shows confirmed aspect VALUES so KAEL never re-poses an already-answered question
FIX: invokeChefDeProjet — mandatory acknowledgement rule + stronger progression rules added to system prompt
REFACTOR: invokeChefDeProjet — stateContext now includes confirmedValues map for richer LLM context
FEATURE: Implement Outbox Ingestion System — CardIngestionJob table (PENDING/RUNNING/DONE/FAILED, retries, backoff)
FEATURE: Create ingestion-worker.ts standalone worker (poll loop, exponential backoff, stale-job recovery, JSON logs)
CHORE: Register cardIngestionJob and cardIngestionLog models in DbClient
CHORE: Add 'worker' npm script for running the ingestion worker via tsx
FEATURE: Implement Chat-to-Graph pipeline for automatic background ingestion of expert chat messages
FEATURE: Create Realtime 'graph' channel to broadcast GRAPH_UPDATED events and sync client-side canvas
FEATURE: Add INGESTION_ENABLED kill-switch and AuditLog tracing for the card ingestion lifecycle

FIX: Restaure fetch() dans les 4 Code nodes GuichetUnique — ni fetch ni $helpers.httpRequest disponibles dans le task runner n8n (requiert N8N_RUNNERS_DISABLED=true)
FIX: TelegramGateway Send Reply lit depuis Extract Response au lieu de Upsert Pole Session (données chat_id/manager_message absentes du retour Supabase)
FIX: Upsert Pole Session continueOnFail=true + return=minimal + service key — l'absence d'id UUID bloquait l'envoi Telegram
FIX: Build Session Body génère un UUID v4 pour le champ id de PoleSession (colonne NOT NULL sans default Postgres)

FIX: Bouton retour onboarding utilise router.back() au lieu d'un redirect hardcodé vers le dossier

FEATURE: Add Actifs/Archivés tabs on dashboard to browse and restore archived dossiers
FIX: Fix ConfirmDeleteDialog footer overflow — buttons no longer escape modal bounds on narrow widths
FIX: Clear custom textarea content in KaelInlineChoices after sending (removes perceived latency/confusion)
FIX: KAEL no longer loops on same question when user says "je sais pas" — detects ignorance and offers choices immediately
FIX: Pass server-side state context (currentQuestion, confirmedAspects) to invokeChefDeProjet for deterministic LLM routing

FEATURE: Notifications & Autonomie supervisée (TICKET 8) — kael_tasks table (short_id 8-char, action_type, action_payload JSONB, scheduled_at, status, requires_validation), K3RN__DailyReport__v1 (cron 8h → rapport Supabase + LLMProxy → Telegram), K3RN__Scheduler__v1 (toutes les 5min → tâches dues → demande validation Telegram), GuichetUnique CONFIRME/ANNULE detection (regex → fetch kael_tasks → execute/cancel → bypass PoleRouter + Synthese), scheduling detection dans routing LLM (task_to_schedule → kael_tasks insert + confirmation message)
FEATURE: Add back button in onboarding page header to return to dossier workspace

FEATURE: Vector memory (TICKET 7) — pgvector + kael_embeddings table (HNSW index) + kael_semantic_search RPC, K3RN__Embedder__v1 (ID: UXriPTQpkD6QL9OJ, text-embedding-3-small), GuichetUnique updated: Load Memory ajoute semantic search 21j + briefing, KAEL+Tavily reçoit briefing dans contexte, KAEL Synthese stocke embeddings après chaque échange
FEATURE: KAEL GuichetUnique — single orchestrator entry point (TICKET 6) — rebuild K3RN__KAEL__GuichetUnique__v1 (8 nodes: Webhook→Config→Normalize Input→Load Memory→KAEL+Tavily→Call PoleRouter→KAEL Synthese→Respond), create kael_memory Supabase table, invokeN8nPole() always routes through GUICHET_URL with sync COMPLETED detection, TelegramGateway POLE_ROUTER_WEBHOOK→GuichetUnique
FEATURE: Centralize all LLM calls through n8n LLMProxy (TICKET 5) — create K3RN__LLMProxy__v1 (ID: yyQlNd4b2ERIRQHj), add callLLMProxy() to n8n.ts, remove OpenAI SDK from claude.ts (invokeExpert/getExpertInitialMessage/invokeExpertChat/invokeKAEL/invokeChefDeProjet), remove OPENAI_API_KEY from .env
FEATURE: Telegram Menu (TICKET 4) — /menu InlineKeyboard (Mes dossiers/Status/Reset), /dossiers liste cliquable, /status rapport budget+dossier, callback_query select_dossier → upsert telegram_state, CERVEAU KAEL étendu aux 6 nouvelles routes
CHORE: Supabase migration telegram_state (chat_id PK, active_dossier_id, updated_at) pour persistance sélection dossier
FIX: Reset Reply + Send Reply — ajouter resource+operation manquants (Telegram node)
FEATURE: Create K3RN__TelegramGateway__v1 (n8n ID: wtP6kvqw7ZU8NBLm) — Telegram text+voice → KAEL routing → PoleRouter → Supabase PoleSession persistence, 22 nodes, /reset + /menu commands, Whisper transcription

## 2026-02-28

CHORE: Create k3rn_idempotency + k3rn_task_budget tables in Supabase k3rn (circuit breaker operational)
CHORE: Delete orphan n8n workflows — My workflow 2 + TEST (unnamed/unroled)
CHORE: Rename KAEL_CoreEngine_v5 → [ARCHIVÉ] KAEL_CoreEngine_v5 in n8n
CHORE: Remove 24 STRYVR role nodes from K3RN__KAEL__GuichetUnique__v1 (CEO/DIRECTEUR/MANAGER/EMPLOYE) — 23 K3RN nodes remain

FEATURE: KaelInlineChoices — panel sombre numéroté (task chat style) attaché dans la bulle KAEL, navigation clavier 1–4/↑↓/Entrée, "Autre choix" inline
REFACTOR: Onboarding page — supprime KaelGuidedModal, choices inline dans la bulle, input toujours visible, premier contact libre sans choices
REFACTOR: OnboardingState (Étape C) — step enum FREE_INPUT/IN_PROGRESS/COMPLETE, migration v1→v2, isComplete dérivé serveur uniquement, STATE_SCHEMA_VERSION 2
FIX: invokeChefDeProjet — premier message analyse l'input réel (pas le nom du projet), reçoit currentStep pour comportement adapté
REFACTOR: Onboarding (Étape G) — bouton workspace uniquement si isComplete serveur, suppression du bouton "Passer cette étape" ambigu

FEATURE: Implement Memory Graph System (T1–T8) — Expert Identity from DB, n8n execution authority, CardRelation schema, Memory Graph API (POST/GET /api/cards, PATCH /api/cards/[id], relations CRUD), Chat→Card pipeline (save button in PoleManagerChat), GET /api/dossiers/[id]/graph, Canvas projection from graph DB, GET /api/cards/search with GIN full-text index
REFACTOR: src/app/api/labs/[lab]/experts/route.ts — replace EXPERTS_REGISTRY with prisma.expert.findMany (DB as source of truth)
REFACTOR: src/lib/n8n.ts — remove OpenAI fallback from invokeN8nPole, n8n is now exclusive execution authority
FEATURE: Supabase migration memory_graph_schema — CardType/CardSource/RelationType enums, Card extended (cardType, source, poleCode, dossierId nullable), CardRelation table
FEATURE: Supabase migration card_search_gin_index — GIN index on Card title+content for full-text search
REFACTOR: src/lib/db.ts — add CardRelation model, new relations (Card.outgoingRelations, Card.incomingRelations, Card.dossier, Dossier.cards), skip/offset support in findMany
REFACTOR: src/components/canvas/CanvasView.tsx — Canvas now projects graph from /api/dossiers/[id]/graph (not CanvasNode/CanvasEdge store)

FEATURE: Transform KAEL onboarding into guided "Task Chat" UX — KaelGuidedModal (src/components/kael/kael-guided-modal.tsx) avec choix numérotés, navigation clavier (1-4), "Répondre librement", backdrop dismiss
FEATURE: Create src/lib/onboarding-state.ts — state machine server-authoritative (problem → target → outcome → constraint), audit trail, stateSchemaVersion, migration v0→v1, toDTO()
FEATURE: Create src/lib/__tests__/onboarding-state.test.ts — 22 tests vitest couvrant les 6 invariants (isComplete, recommendedLab, currentQuestion, immuabilité, audit trail, sérialisation, toDTO)
FEATURE: Supabase migration — ADD COLUMN "onboardingState" JSONB sur table Dossier
FEATURE: Add GET /api/test endpoint (src/app/api/test/route.ts)
REFACTOR: src/app/api/dossiers/[id]/onboarding/route.ts — state persisté en DB via deserializeState + applyLLMResponse + toDTO, idempotent si COMPLETE
REFACTOR: src/app/dossiers/[id]/onboarding/page.tsx — consomme onboardingState depuis serveur (source unique de vérité), OnboardingProgress component, input masqué quand COMPLETE
REFACTOR: src/lib/claude.ts — importe ConfirmedAspect/VALID_LABS depuis onboarding-state.ts, prompt état machine strict (4 aspects ordonnés), guard safeValidateLab
FIX: src/app/globals.css — déplacer @keyframes kaelModalIn depuis styled-jsx (non disponible en App Router)
REFACTOR: Replace HTTP Request node with native LangChain nodes (lmChatOpenAi + chainLlm) in K3RN__PoleRouter__v1
FIX: Correct lmChatOpenAi typeVersion (1.3) and model parameter format ({mode:"id",value:"gpt-4o"})
FEATURE: Create n8n workflow K3RN__PoleRouter__v1 — webhook unique pour les 7 pôles (https://agent.k3rnlabs.com/webhook/k3rn-pole-router)
FEATURE: Seed 22 experts en base de données via prisma/seed.ts (idempotent)
FEATURE: Set n8nWebhookUrl + n8nWorkflowId sur les 7 pôles en DB
REFACTOR: src/app/api/experts/[expertId]/sessions/route.ts — lookup DB (findUnique) au lieu de EXPERTS_REGISTRY
REFACTOR: src/lib/permissions.ts — async, prisma.expert.findMany au lieu de EXPERTS_REGISTRY
FIX: src/app/api/dossiers/[id]/permissions/route.ts — await computePermissions()
FIX: src/lib/claude.ts — réduire max_tokens à 1024, timeout 28s, truncation fichiers à 8000 chars
FIX: src/app/dossiers/[id]/onboarding/page.tsx — timeout 30s, AbortSignal.timeout(15s) sur initOnboarding, try/catch
FIX: src/components/ui/markdown.tsx — null safety sur children

FEATURE: Initialize changelog system