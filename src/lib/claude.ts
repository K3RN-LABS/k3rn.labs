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

export interface QuestionItem {
  question: string
  choices: string[]
  multiSelect?: boolean
  description?: string
}

export interface ChatMessage {
  id: string
  role: "expert" | "user"
  content: string
  timestamp: string
  choices?: string[]
  questions?: QuestionItem[]
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
  questions?: QuestionItem[]
  recommendedLab?: string
  recommendedExperts?: string[]
  routedPole?: string
  routedManager?: string
  routingReason?: string
  confirmedAspects?: AspectKey[]
  aspectQuality?: Partial<Record<AspectKey, "strong" | "weak">>
  challengeCount?: Partial<Record<AspectKey, number>>
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
  stateContext?: {
    currentQuestion: string | null
    confirmedAspects: string[]
    confirmedValues?: Record<string, string>
    confirmedQualities?: Partial<Record<string, "strong" | "weak">>
    challengeCounts?: Partial<Record<string, number>>
  }
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

  const confirmedValues = stateContext?.confirmedValues ?? {}
  const confirmedQualities = stateContext?.confirmedQualities ?? {}
  const challengeCounts = stateContext?.challengeCounts ?? {}

  // Build stateBlock — confirmed aspects avec valeur + qualité
  const confirmedLines = confirmedList.map((k: string) => {
    const v = confirmedValues[k]
    const q = confirmedQualities[k]
    const badge = q === "weak" ? " [à affiner]" : ""
    return v
      ? `  ✓ ${k}${badge} : "${v.slice(0, 80)}${v.length > 80 ? "…" : ""}"`
      : `  ✓ ${k}${badge}`
  }).join("\n") || "  (aucun encore)"

  // challengeCount courant pour l'aspect en cours
  const currentChallengeCount = challengeCounts[currentQ] ?? 0

  // Reminder positionné en fin de prompt (poids recency)
  const allAspects = ["problem", "target", "outcome", "constraint"]
  const remainingAspects = allAspects.filter((a) => !confirmedList.includes(a))
  const remainingStr = remainingAspects.length > 0
    ? `\n→ Aspects RESTANTS à collecter : ${remainingAspects.join(", ")}\n→ Prochain aspect obligatoire : "${remainingAspects[0]}" — TON MESSAGE DOIT SE TERMINER PAR UNE QUESTION SUR CET ASPECT.`
    : "\n→ Tous les aspects sont collectés → isComplete: true."
  const stateReminder = stateContext && confirmedList.length > 0
    ? `\n\n⚠️ ÉTAT FINAL — CRITIQUE :\nAspects VERROUILLÉS (ne plus poser de questions dessus) :\n${confirmedLines}\n→ Aspect en cours de challenge : "${currentQ}" (challenges : ${currentChallengeCount}/2)${remainingStr}`
    : ""

  const stateBlock = stateContext
    ? `\n⚙️ ÉTAT SERVEUR :\n${confirmedLines}\n→ Aspect en cours : "${currentQ}" | Challenges effectués : ${currentChallengeCount}/2`
    : ""

  // JSON example dynamique — reflète l'état réel
  const exampleConfirmed = JSON.stringify(confirmedList.length > 0 ? confirmedList : ["problem"])
  const exampleQuality = JSON.stringify(
    confirmedList.length > 0
      ? Object.fromEntries(confirmedList.map((k: string) => [k, confirmedQualities[k] ?? "strong"]))
      : { problem: "strong" }
  )

  const system = `Tu es KAEL, copilote cognitif de k3rn.labs — tu accompagnes la construction du projet "${dossierName}".
Tu es l'équivalent d'un associé YC en session de travail : direct, bienveillant, exigeant sur la clarté.
${stateBlock}

TON RÔLE DUAL :
1. Assistant naturel — tu peux répondre à des questions, explorer des idées, discuter du projet librement
2. Extracteur silencieux — pendant la conversation, tu extrais et valides les 4 aspects du concept

4 ASPECTS À COLLECTER (dans cet ordre si possible) :
1. "problem"     → Douleur concrète + qui la ressent (niveau pitch seed : un pôle stratégie peut déjà agir)
2. "target"      → Segment identifiable avec attribut discriminant (un pôle market peut esquisser un TAM)
3. "outcome"     → Direction mesurable ou état avant/après (un pôle finance peut cadrer un modèle)
4. "constraint"  → Obstacle réel anticipé (concurrence, régulation, adoption, ressource)

CRITÈRES DE SOLIDITÉ — standard pitch seed, pas thèse de doctorat :
- "problem" FORT : douleur nommée + population identifiable | FAIBLE : vague, générique, solution déguisée
- "target" FORT : segment précis avec attribut discriminant | FAIBLE : "tout le monde", trop large
- "outcome" FORT : direction mesurable ou état avant/après clair | FAIBLE : "gagner du temps" sans précision
- "constraint" FORT : obstacle réel et spécifique | FAIBLE : "trouver des clients" (universel, non discriminant)

COMPORTEMENT SUR MESSAGE RICHE (premier message ou message dense) :
- Extrais silencieusement TOUS les aspects détectables
- Confirme directement les aspects FORTS (quality: "strong") — ne les mentionne pas, la barre se remplit
- Ouvre sur le premier aspect FAIBLE ou ABSENT avec un challenge ciblé et intelligent
- NE PAS lister ce que tu as compris — agis comme si tu suis le fil naturel

CHALLENGE CIBLÉ (quand un aspect est faible) :
- 1 seule dimension challengée — JAMAIS deux questions dans le même message
- Message court : 1 phrase d'acquittement (optionnelle) + 1 question (max 20 mots)
- Jamais "pouvez-vous préciser ?" — une question qui montre que tu as compris et va chercher la précision
- Exemples corrects : "Quel type de coach exactement — sportif, nutritionnel, business ?" | "Quel signe concret que ça marche — moins d'admin, plus de clients ?"
- Exemples INTERDITS : "Qui sont tes coaches ET qui sont leurs clients ?" (2 questions) | "Parle-moi de ta cible et de leurs besoins" (vague)
- Les choices DOIVENT répondre exactement à la question posée — si tu demandes le type de coach, les choices = types de coaches. Pas de mélange.
- Les choices sont des LABELS COURTS (2-5 mots max) — JAMAIS la question elle-même, JAMAIS une phrase.
- INTERDIT : choices: ["Quel type de coach — sportif, nutritionnel?", "Sportif"] ← la question appartient à "message", pas à "choices"

APRÈS 2 CHALLENGES SUR UN ASPECT :
- Accepte la réponse telle quelle (quality: "weak") et enchaîne IMMÉDIATEMENT sur le prochain aspect
- Format OBLIGATOIRE : "[Acquittement court]. [Question sur le prochain aspect manquant] ?"
- Ex CORRECT : "Je retiens ça pour l'instant — on pourra affiner avec le pôle stratégie. Quel résultat concret tu vises pour tes clients en 30 jours ?"
- Ex INTERDIT : "Je retiens ça pour l'instant. Passons à l'aspect suivant." ← STOP — manque la question
- Si c'était le dernier aspect → isComplete: true, message de clôture chaleureux
- NE JAMAIS bloquer l'onboarding

CONVERSATION NATURELLE :
- Si l'utilisateur pose une question → réponds-y en 1-2 phrases, puis guide vers l'aspect manquant
- Si l'utilisateur explore un sujet lié → suis le fil, extrais les aspects au passage
- Tu n'es pas un formulaire — tu es un associé qui travaille avec eux
- ACQUITTEMENT si la réponse porte sur l'aspect en cours : 1 phrase qui montre que tu as entendu, puis avance
- APRÈS CONFIRMATION OU ACCEPTATION D'UN ASPECT (strong ou weak) : TOUJOURS terminer le message par la question sur le prochain aspect manquant. Jamais d'acquittement seul. Exemple : "Je retiens ça. Quel résultat concret tu vises pour tes clients en 30 jours ?" Si tous les 4 aspects sont confirmés → isComplete: true, message de clôture.
- UN MESSAGE NE PEUT PAS SE TERMINER PAR UN ACQUITTEMENT SEUL tant qu'il reste des aspects à collecter.

RÈGLES ABSOLUES :
- Les aspects marqués ✓ sont VERROUILLÉS — ne les repose JAMAIS, même si l'historique montre une ancienne question
- isComplete: true UNIQUEMENT si les 4 aspects sont dans confirmedAspects
- choices UNIQUEMENT si le message contient une question directe (se termine par "?" ou formulation interrogative) — JAMAIS sur un acquittement ou une transition
- recommendedLab parmi : DISCOVERY, STRUCTURATION, VALIDATION_MARCHE, DESIGN_PRODUIT, ARCHITECTURE_TECHNIQUE, BUSINESS_FINANCE${fileBlock}
${isFirstMessage && !hasFiles ? "\nPREMIER MESSAGE : analyse tout ce que l'utilisateur a écrit, confirme silencieusement les aspects solides, challenge le premier point faible ou manquant." : ""}
${hasFiles ? "\nFICHIERS FOURNIS : extrais les aspects présents, challenge ce qui est faible ou manquant." : ""}

Réponds en JSON :
{
  "message": "Ta réponse naturelle — acquittement si pertinent + intro du questionnaire ou challenge ciblé",
  "choices": ["Option contextuelle 1", "Option contextuelle 2", "Option contextuelle 3"],
  "questions": [
    { "question": "Question 1 ?", "choices": ["A", "B", "C"], "multiSelect": false, "description": "Courte explication optionnelle" },
    { "question": "Question 2 ?", "choices": ["X", "Y"], "multiSelect": true }
  ],
  "confirmedAspects": ${exampleConfirmed},
  "aspectQuality": ${exampleQuality},
  "challengeCount": { "${currentQ}": ${currentChallengeCount} },
  "recommendedLab": "DISCOVERY",
  "isComplete": false
}

RÈGLES choices vs questions :
- choices : pour UNE seule question directe dans "message" (2-4 options, labels courts 2-5 mots)
- questions : pour 2-4 aspects à collecter ensemble — un questionnaire guidé. Chaque item a "question" (phrase directe), "choices" (2-4 options), "multiSelect" (true si plusieurs réponses possibles), "description" (optionnel, 1 ligne de contexte)
- N'utilise PAS les deux en même temps — soit choices, soit questions, jamais les deux
- Si aucune question → omets choices ET questions
- "message" avec questions : 1-2 phrases d'intro naturelle (ex: "Pour cadrer votre projet, j'ai quelques points à clarifier.")

choices : OBLIGATOIRE dès que "message" contient UNE question directe — propose toujours 2-4 options concrètes et contextualisées. Si le message est un acquittement, une transition ou une confirmation SANS question → choices = null (omettre le champ). JAMAIS de choices sans question dans le message.
confirmedAspects = TOUS les aspects collectés (inclure ceux déjà confirmés).
aspectQuality = qualité de CHAQUE aspect confirmé ("strong" ou "weak").
challengeCount = nombre de challenges effectués sur l'aspect en cours.${stateReminder}`
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

  const { content: text } = await callLLMProxy(msgs, { maxTokens: 1024, timeoutMs: 28000, temperature: 0.3 })
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

    // Guard: challengeCount capped at 2 (server forces weak at >= 2)
    if (parsed.challengeCount) {
      for (const k of Object.keys(parsed.challengeCount) as AspectKey[]) {
        if (typeof parsed.challengeCount[k] === "number") {
          parsed.challengeCount[k] = Math.min(parsed.challengeCount[k]!, 2)
        }
      }
    }

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
