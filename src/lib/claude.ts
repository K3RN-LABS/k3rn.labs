import { callLLMProxy, type LLMMessage } from "./n8n"

export interface ExpertResponse {
  analysis: string
  proposedCard: {
    type: string
    title: string
    content: Record<string, unknown>
  }
  confidence: number
  blocksLabTransition: boolean
  requiredActions: string[]
}

export interface ExpertMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatMessage {
  id: string
  role: "expert" | "user"
  content: string
  timestamp: string
  choices?: string[]
  proposedCard?: { type: string; title: string; content: unknown }
  confidence?: number
  attachments?: { name: string; type: string; size?: number }[]
}

export interface ExpertChatResponse {
  message: string
  choices?: string[]
  proposedCard?: { type: string; title: string; content: Record<string, unknown> }
  confidence?: number
  isComplete?: boolean
}

export async function invokeExpert(
  systemPrompt: string,
  messages: ExpertMessage[],
  contextCards: Array<{ type: string; title: string; content: unknown }>
): Promise<ExpertResponse> {
  const contextBlock =
    contextCards.length > 0
      ? `\n\nCONTEXT CARDS:\n${JSON.stringify(contextCards, null, 2)}`
      : ""

  const fullSystemPrompt = `${systemPrompt}${contextBlock}

IMPORTANT: You MUST respond with a single valid JSON object matching exactly this schema:
{
  "analysis": "string - your analysis",
  "proposedCard": {
    "type": "string - the card type",
    "title": "string - card title",
    "content": {} - structured card content
  },
  "confidence": number between 0 and 1,
  "blocksLabTransition": boolean,
  "requiredActions": ["string array of required actions if any"]
}
Do not include any text outside the JSON object.`

  const { content: text } = await callLLMProxy(
    [
      { role: "system", content: fullSystemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    { maxTokens: 4096 }
  )

  try {
    const parsed = JSON.parse(text) as ExpertResponse
    return parsed
  } catch {
    throw new Error(`Expert returned invalid JSON: ${text.slice(0, 200)}`)
  }
}

export async function getExpertInitialMessage(
  expertName: string,
  expertRole: string,
  dossierName: string,
  validatedCards: Array<{ type: string; title: string }>
): Promise<ExpertChatResponse> {
  const context =
    validatedCards.length > 0
      ? `\nCartes déjà validées: ${validatedCards.map((c) => c.title).join(", ")}`
      : ""

  const systemPrompt = `Tu es ${expertName}, ${expertRole}. Tu travailles sur le projet "${dossierName}".${context}

Génère un message d'accueil engageant (2-3 phrases max) en français, puis pose UNE question clé pour mieux comprendre le projet.
Propose 3-4 options de réponse courtes et pertinentes.

Réponds en JSON:
{
  "message": "ton message d'accueil + question",
  "choices": ["option 1", "option 2", "option 3", "Autre (précisez)"]
}
Le message doit être naturel, direct, orienté action.`

  const { content: text } = await callLLMProxy(
    [{ role: "system", content: systemPrompt }],
    { maxTokens: 800 }
  )
  try {
    return JSON.parse(text) as ExpertChatResponse
  } catch {
    return {
      message: `Bonjour ! Je suis ${expertName}. Parlez-moi de votre projet "${dossierName}" — quel problème principal cherchez-vous à résoudre ?`,
      choices: ["Un problème de productivité", "Un problème d'accès", "Un problème de coût", "Autre (précisez)"],
    }
  }
}

export async function invokeExpertChat(
  systemPrompt: string,
  history: ChatMessage[],
  contextCards: Array<{ type: string; title: string; content: unknown }>,
  userInput: string,
  expertName: string
): Promise<ExpertChatResponse> {
  const contextBlock =
    contextCards.length > 0
      ? `\n\nCartes validées du projet:\n${JSON.stringify(contextCards, null, 2)}`
      : ""

  const fullSystem = `${systemPrompt}${contextBlock}

Tu es en conversation avec l'utilisateur. Réponds en JSON:
{
  "message": "ta réponse naturelle en français",
  "choices": ["option1", "option2", "option3"],  // OPTIONNEL: uniquement si une question fermée est pertinente
  "proposedCard": {  // OPTIONNEL: uniquement quand tu as assez d'info pour créer une carte
    "type": "le type de carte",
    "title": "titre clair",
    "content": {}
  },
  "confidence": 0.9,  // OPTIONNEL: avec proposedCard
  "isComplete": false  // true quand tu proposes une carte finale
}
Sois concis, direct, orienté décision. Max 3 phrases par réponse.`

  const msgs: LLMMessage[] = [
    { role: "system", content: fullSystem },
    ...history.map((m) => ({
      role: (m.role === "expert" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userInput },
  ]

  const { content: text } = await callLLMProxy(msgs, { maxTokens: 2048 })
  try {
    return JSON.parse(text) as ExpertChatResponse
  } catch {
    return { message: `Merci pour cette précision. Pouvez-vous développer davantage ?` }
  }
}

import type { AspectKey } from "./onboarding-state"
import { VALID_LABS, safeValidateLab } from "./onboarding-state"

export interface KAELResponse {
  message: string
  choices?: string[]
  recommendedLab?: string
  recommendedExperts?: string[]
  routedPole?: string
  routedManager?: string
  routingReason?: string
  confirmedAspects?: AspectKey[]
  isComplete?: boolean
}

const HASHTAG_POLE_MAP: Record<string, { poleCode: string; managerName: string }> = {
  brainstorming: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  challenge: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  strategie: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  pitch: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  vision: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  positionnement: { poleCode: "P01_STRATEGIE", managerName: "AXEL" },
  market: { poleCode: "P02_MARKET", managerName: "MAYA" },
  veille: { poleCode: "P02_MARKET", managerName: "MAYA" },
  concurrents: { poleCode: "P02_MARKET", managerName: "MAYA" },
  tendances: { poleCode: "P02_MARKET", managerName: "MAYA" },
  tam: { poleCode: "P02_MARKET", managerName: "MAYA" },
  opportunite: { poleCode: "P02_MARKET", managerName: "MAYA" },
  produit: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  tech: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  architecture: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  mvp: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  stack: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  features: { poleCode: "P03_PRODUIT_TECH", managerName: "KAI" },
  finance: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  budget: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  modele: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  investisseur: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  roi: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  cashflow: { poleCode: "P04_FINANCE", managerName: "ELENA" },
  marketing: { poleCode: "P05_MARKETING", managerName: "ZARA" },
  brand: { poleCode: "P05_MARKETING", managerName: "ZARA" },
  contenu: { poleCode: "P05_MARKETING", managerName: "ZARA" },
  seo: { poleCode: "P05_MARKETING", managerName: "ZARA" },
  growth: { poleCode: "P05_MARKETING", managerName: "ZARA" },
  copy: { poleCode: "P05_MARKETING", managerName: "ZARA" },
  legal: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  rgpd: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  contrat: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  compliance: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  gdpr: { poleCode: "P06_LEGAL", managerName: "MARCUS" },
  talent: { poleCode: "P07_TALENT_OPS", managerName: "NOVA" },
  recrutement: { poleCode: "P07_TALENT_OPS", managerName: "NOVA" },
  ops: { poleCode: "P07_TALENT_OPS", managerName: "NOVA" },
  coordination: { poleCode: "P07_TALENT_OPS", managerName: "NOVA" },
}

export function detectPoleRouting(input: string): { poleCode: string; managerName: string } | null {
  const matches = input.match(/#(\w+)/g)
  if (!matches) return null
  for (const match of matches) {
    const tag = match.slice(1).toLowerCase()
    if (HASHTAG_POLE_MAP[tag]) return HASHTAG_POLE_MAP[tag]
  }
  return null
}

export async function invokeKAEL(
  dossierName: string,
  history: ChatMessage[],
  userInput: string,
  projectMemory?: string
): Promise<KAELResponse> {
  const routing = detectPoleRouting(userInput)

  const memoryBlock = projectMemory
    ? `\n\n--- MÉMOIRE PROJET ---\n${projectMemory}\n--- FIN MÉMOIRE ---`
    : ""

  const system = `Tu es KAEL, l'orchestrateur central de k3rn.labs — copilote cognitif du projet "${dossierName}".
Tu combines mémoire totale du projet, routing intelligent vers les 7 pôles experts, et vision stratégique.${memoryBlock}

Ton rôle:
1. Comprendre et enrichir la vision du projet
2. Router vers le bon pôle expert quand le besoin est identifié
3. Maintenir la cohérence globale du projet
4. Recommander le bon LAB de départ et les experts à engager

Pôles disponibles (routing via #hashtag ou contexte):
- AXEL (P01) — Stratégie & Innovation → #brainstorming #strategie #pitch
- MAYA (P02) — Market & Intelligence → #market #veille #concurrents
- KAI (P03) — Produit & Tech → #produit #tech #mvp #stack
- ELENA (P04) — Finance → #finance #budget #investisseur
- ZARA (P05) — Marketing & Brand → #marketing #brand #seo
- MARCUS (P06) — Legal → #legal #rgpd #contrat
- NOVA (P07) — Talent & Ops → #talent #ops #recrutement

LABs: DISCOVERY, STRUCTURATION, VALIDATION_MARCHE, DESIGN_PRODUIT, ARCHITECTURE_TECHNIQUE, BUSINESS_FINANCE
Démarre TOUJOURS par DISCOVERY sauf cas exceptionnel justifié.

Réponds en JSON:
{
  "message": "réponse naturelle en français (2-3 phrases max)",
  "choices": ["option1", "option2"],
  "routedPole": "P01_STRATEGIE",
  "routedManager": "AXEL",
  "routingReason": "raison courte",
  "recommendedLab": "NOM_DU_LAB",
  "recommendedExperts": ["slug1"],
  "isComplete": false
}
Tous les champs sauf message sont OPTIONNELS. Inclus routedPole+routedManager uniquement si routing pertinent.`

  const msgs: LLMMessage[] = [
    { role: "system", content: system },
    ...history.map((m) => ({
      role: (m.role === "expert" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userInput },
  ]

  if (routing) {
    const directRouting: KAELResponse = {
      message: `Je te connecte directement à **${routing.managerName}** — ${getPoleDescription(routing.poleCode)}.`,
      routedPole: routing.poleCode,
      routedManager: routing.managerName,
      routingReason: `Hashtag détecté dans le message`,
    }
    return directRouting
  }

  const { content: text } = await callLLMProxy(msgs, { maxTokens: 1024 })
  try {
    return JSON.parse(text) as KAELResponse
  } catch {
    return { message: "Intéressant ! Parlez-moi du problème principal que vous souhaitez résoudre." }
  }
}

function getPoleDescription(poleCode: string): string {
  const descriptions: Record<string, string> = {
    P01_STRATEGIE: "Stratège & Innovation",
    P02_MARKET: "Market & Intelligence",
    P03_PRODUIT_TECH: "Produit & Tech",
    P04_FINANCE: "Finance & Modélisation",
    P05_MARKETING: "Marketing & Brand",
    P06_LEGAL: "Legal & Compliance",
    P07_TALENT_OPS: "Talent & Ops",
  }
  return descriptions[poleCode] ?? poleCode
}

export interface FileContext {
  name: string
  kind: "text" | "image"
  content?: string
  dataUrl?: string
}

export async function invokeChefDeProjet(
  dossierName: string,
  history: ChatMessage[],
  userInput: string,
  files?: FileContext[],
  currentStep?: "FREE_INPUT" | "IN_PROGRESS" | "COMPLETE",
  stateContext?: { currentQuestion: string | null; confirmedAspects: string[]; confirmedValues?: Record<string, string> }
): Promise<KAELResponse> {
  const isFirstMessage = currentStep === "FREE_INPUT" || history.length === 0
  const hasFiles = files && files.length > 0
  const textFiles = files?.filter((f) => f.kind === "text" && f.content) ?? []
  const imageFiles = files?.filter((f) => f.kind === "image" && f.dataUrl) ?? []

  // Truncate each file to 8000 chars max to keep context reasonable
  const fileBlock = textFiles.length > 0
    ? "\n\n--- FICHIERS FOURNIS ---\n" +
    textFiles.map((f) => {
      const content = (f.content ?? "").slice(0, 8000)
      const truncated = (f.content ?? "").length > 8000 ? "\n[… tronqué]" : ""
      return `### ${f.name}\n${content}${truncated}`
    }).join("\n\n---\n\n") +
    "\n--- FIN FICHIERS ---"
    : ""

  const confirmedList = stateContext?.confirmedAspects ?? []
  const currentQ = stateContext?.currentQuestion ?? "problem"

  // Build rich stateBlock showing confirmed VALUES so LLM never re-asks
  const confirmedValues = (stateContext as { confirmedValues?: Record<string, string> } | undefined)?.confirmedValues ?? {}
  const confirmedLines = confirmedList.map((k: string) => {
    const v = confirmedValues[k]
    return v
      ? `  ✓ ${k} : "${v.slice(0, 80)}${v.length > 80 ? "…" : ""}"`
      : `  ✓ ${k}`
  }).join("\n") || "  (aucun encore)"
  const stateBlock = stateContext
    ? `\nÉTAT SERVEUR — SOURCE DE VÉRITÉ (critique, ne jamais ignorer) :\n${confirmedLines}\n→ PROCHAINE ÉTAPE : collecter "${currentQ}" uniquement`
    : ""

  const system = `Tu es KAEL, orchestrateur cognitif de k3rn.labs — tu initialises le projet "${dossierName}".
${stateBlock}

STATE MACHINE D'ONBOARDING — PROGRESSION STRICTE :
Collecte ces 4 aspects dans cet ordre :
1. "problem"     → Quel problème CONCRET ce projet résout-il ? (1 phrase métier)
2. "target"      → Qui est l'utilisateur / client final ciblé ?
3. "outcome"     → Quel résultat MESURABLE est visé ? (métrique ou état observable)
4. "constraint"  → Quelle est la principale contrainte ou difficulté anticipée ?

RÈGLES ABSOLUES :
- Les aspects marqués ✓ sont CONFIRMÉS — ne les repose JAMAIS
- Pose UNE SEULE question, sur "${currentQ}" uniquement
- ACQUITTEMENT OBLIGATOIRE : commence par 1 phrase courte qui reconnaît ce que l'utilisateur vient de dire (ex: "Bien noté :", "J'ai compris :") — sauf si c'est le tout premier message
- N'évoque jamais de solutions avant que les 4 aspects soient collectés
- isComplete: true UNIQUEMENT si les 4 aspects sont dans confirmedAspects
- recommendedLab : parmi [DISCOVERY, STRUCTURATION, VALIDATION_MARCHE, DESIGN_PRODUIT, ARCHITECTURE_TECHNIQUE, BUSINESS_FINANCE] — DISCOVERY par défaut${fileBlock}
${isFirstMessage && !hasFiles ? "\nPREMIER MESSAGE : analyse UNIQUEMENT ce qu'a écrit l'utilisateur. Extrais les aspects présents, pose la question sur le premier manquant." : ""}
${hasFiles ? "\nFICHIERS FOURNIS : extrais les aspects présents, pose la prochaine question manquante." : ""}

GESTION DU "JE NE SAIS PAS" :
Si l'utilisateur ne sait pas :
- NE RÉPÈTE JAMAIS la même question
- 1 phrase : "Voici des exemples pour vous aider :"
- 3-4 choices très concrets et directs pour "${currentQ}"

EXTRACTION MULTI-ASPECT :
Si le message contient des infos sur plusieurs aspects, liste-les TOUS dans confirmedAspects.

CHOICES :
- Affirmations courtes, 4-10 mots, sans "?"
- Couvrir les cas fréquents pour "${currentQ}"

Réponds en JSON :
{
  "message": "1 phrase d'acquittement + 1 question sur ${currentQ}",
  "choices": ["Réponse 1", "Réponse 2", "Réponse 3"],
  "confirmedAspects": ["problem"],
  "recommendedLab": "DISCOVERY",
  "isComplete": false
}
choices OBLIGATOIRE (2-4). confirmedAspects = TOUS les aspects collectés jusqu'ici.`
  // Build messages — images go into content array for vision
  const userContent: Array<{ type: string;[key: string]: unknown }> = [
    { type: "text", text: userInput || (hasFiles ? "Voici les fichiers du projet." : "") },
    ...imageFiles.map((f) => ({
      type: "image_url",
      image_url: { url: f.dataUrl!, detail: "high" },
    })),
  ]

  const msgs: LLMMessage[] = [
    { role: "system", content: system },
    ...history.map((m) => ({
      role: (m.role === "expert" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userContent },
  ]

  const { content: text } = await callLLMProxy(msgs, { maxTokens: 1024, timeoutMs: 28000 })
  try {
    const parsed = JSON.parse(text) as KAELResponse

    if (!parsed.message || typeof parsed.message !== "string") {
      return {
        message: "J'ai analysé votre fichier. Quel problème concret ce projet cherche-t-il à résoudre ?",
        choices: parsed.choices ?? ["Résoudre un problème métier précis", "Saisir une opportunité de marché", "Améliorer un processus existant"],
        confirmedAspects: [],
      }
    }

    // Guard: recommendedLab must be a valid LAB — server enforces via safeValidateLab
    parsed.recommendedLab = safeValidateLab(parsed.recommendedLab)

    // Guard: isComplete requires all 4 aspects confirmed
    const aspects = parsed.confirmedAspects ?? []
    const allConfirmed = (["problem", "target", "outcome", "constraint"] as AspectKey[]).every((a) =>
      aspects.includes(a)
    )
    if (parsed.isComplete && !allConfirmed) {
      parsed.isComplete = false
    }

    return parsed
  } catch {
    return {
      message: "Intéressant ! Quel problème concret ce projet cherche-t-il à résoudre ?",
      choices: ["Résoudre un problème métier précis", "Saisir une opportunité de marché", "Améliorer un processus existant"],
      confirmedAspects: [],
    }
  }
}
