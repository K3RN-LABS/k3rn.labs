# K3RN — Memory Graph System Implementation Plan

Version: 1.0  
Status: EXECUTION READY  
Owner: Backend Lead / System Architect  
Priority: CRITICAL  

---

## SECTION 1 — CONTEXTE

### Situation actuelle

K3RN possède actuellement :

- orchestrateur KAEL fonctionnel
- système multi-pôles
- base PostgreSQL structurée via Prisma
- intégration n8n fonctionnelle via router
- chat persistant fonctionnel
- Canvas UI existant mais non connecté à une mémoire exploitable

Mais il manque le composant fondamental :

> le moteur de mémoire neuronale structuré

### Conséquences actuelles

- perte d’information structurelle  
- Canvas vide ou incohérent  
- incohérence identité experts  
- absence de mémoire exploitable par les pôles  
- impossibilité de naviguer cognitivement dans un projet  

---

## SECTION 2 — OBJECTIF GLOBAL

Implémenter le **Memory Graph System**, qui devient la source de vérité cognitive du système.

Ce système permettra :

- persistance structurée de toutes les décisions  
- navigation graphe  
- injection mémoire dans les pôles  
- projection Canvas  
- recherche globale  
- scalabilité long terme  

---

## SECTION 3 — ARCHITECTURE CIBLE

### Architecture cible stricte

~~~text
PostgreSQL (Supabase)
│
├── Card (mémoire atomique)
├── CardRelation (graph)
├── Expert (source identité)
└── PoleSession

NextJS Backend
│
├── Memory API
├── Graph API
├── Expert API
└── n8n router client

n8n
│
└── execution authority unique

Frontend
│
├── Chat
├── Canvas
└── Navigation Dock
~~~

---

## SECTION 4 — RÈGLES D’ARCHITECTURE (NON NÉGOCIABLES)

### Règle 1 — Source de vérité mémoire

Uniquement PostgreSQL.

Jamais :
- frontend state  
- registry hardcodé  
- n8n  

### Règle 2 — Source d’exécution IA

Uniquement n8n.

Jamais :
- appel direct OpenAI depuis NextJS backend  

### Règle 3 — Canvas est une projection

Canvas ne stocke aucune donnée.  
Uniquement lecture DB.

### Règle 4 — Expert identity authority

Table `Expert` = source unique.  
Jamais registry hardcodé.

---

## SECTION 5 — ROADMAP D’EXÉCUTION

Ordre strict :

1. Ticket 1 — Expert Identity Authority Fix  
2. Ticket 2 — n8n Execution Authority Fix  
3. Ticket 3 — Memory Graph Schema  
4. Ticket 4 — Memory Graph API  
5. Ticket 5 — Chat → Card Pipeline  
6. Ticket 6 — Graph Retrieval API  
7. Ticket 7 — Canvas Projection  
8. Ticket 8 — Navigation Dock Backend  

Ne pas inverser l’ordre.

---

## SECTION 6 — TICKET 1 — Expert Identity Authority Fix

### Objectif
Faire de la table `Expert` la source unique d’identité.

### Problème actuel
Présence probable de `EXPERTS_REGISTRY` créant des incohérences UI/IA.

### Actions Backend
- Supprimer toute utilisation de `EXPERTS_REGISTRY`.
- Remplacer par accès DB :
  - `prisma.expert.findUnique()` / `findMany()` selon les cas.

Zones impactées (minimum) :
- `/api/experts/*`
- `/api/poles/*`
- `/api/kael/*`
- Toute logique de “prompt/identity resolution”.

### Actions Frontend
- À la sélection d’un expert/pôle :
  - récupérer l’identité depuis l’API (DB-backed), pas depuis un registry local.

Endpoints attendus :
- `GET /api/experts/:id`
- ou `GET /api/poles` + mapping vers `Expert`/`Pole` DB

### Done Criteria
- Changer d’expert (AXEL → MAYA → ELENA) :
  - le header UI change
  - le message système et le message de bienvenue correspondent TOUJOURS à l’expert sélectionné
  - plus aucun “Bonjour je suis AXEL” quand MAYA est active.

---

## SECTION 7 — TICKET 2 — n8n Execution Authority Fix

### Objectif
Faire de n8n l’autorité unique d’exécution IA (routing + exécution).

### Actions Backend
- Dans `invokePole()` (ou équivalent), supprimer tout fallback direct OpenAI.
- Toute exécution IA doit passer par le routeur n8n unique :
  - `callN8nPoleRouter()` (webhook `k3rn-pole-router`).

### Validation
Chaque `PoleSession` doit stocker :
- `n8nExecutionId` non null
- `n8nStatus` cohérent
- logs/audit alignés

### Done Criteria
- 100% des appels pôles passent par n8n.
- Plus aucun call OpenAI direct depuis NextJS backend pour les pôles.

---

## SECTION 8 — TICKET 3 — Memory Graph Schema

### Objectif
Introduire le graphe de mémoire comme source unique de structuration cognitive.

> NOTE IMPORTANTE : Le repo a déjà un modèle `Card` existant.  
> Ce ticket doit **étendre** le modèle existant ou créer `MemoryCard` / `GraphCard` si conflit, mais **sans casser** l’existant.

### Prisma (proposition de schéma)

~~~prisma
model Card {
  id String @id @default(cuid())

  dossierId String

  title String
  content Json

  type CardType
  state CardState
  source CardSource

  poleCode PoleCode?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  outgoingRelations CardRelation[] @relation("fromCard")
  incomingRelations CardRelation[] @relation("toCard")
}

model CardRelation {
  id String @id @default(cuid())

  fromCardId String
  toCardId String

  fromCard Card @relation("fromCard", fields: [fromCardId], references: [id])
  toCard Card @relation("toCard", fields: [toCardId], references: [id])

  type RelationType

  createdAt DateTime @default(now())
}

enum CardType {
  IDEA
  DECISION
  TASK
  ANALYSIS
  HYPOTHESIS
  PROBLEM
  VISION
}

enum CardSource {
  USER
  EXPERT
  SYSTEM
}

enum RelationType {
  DERIVED_FROM
  SUPPORTS
  IMPLEMENTS
  REFINES
}
~~~

### Done Criteria
- Migration exécutée sans erreur (Supabase Postgres).
- Seed / upsert non destructif.
- Aucune régression sur les APIs Cards existantes.

---

## SECTION 9 — TICKET 4 — Memory Graph API

### Objectif
Exposer CRUD + relations de manière stable.

Routes (si déjà existantes, compléter / standardiser) :
- `POST /api/cards`
- `GET /api/cards?dossierId=`
- `GET /api/cards/:id`
- `PATCH /api/cards/:id`
- `DELETE /api/cards/:id`

Relations :
- `POST /api/card-relations`
- `GET /api/cards/:id/relations`
- `DELETE /api/card-relations/:id`

### Done Criteria
- Les cards + relations sont persistées et relisibles.
- Validation Zod + auth SSR respectées.

---

## SECTION 10 — TICKET 5 — Chat → Card Pipeline

### Objectif
Créer des Cards depuis le chat (capture structurée).

Flow minimal :
1. user/expert message
2. action “Create Card” (UI)
3. `POST /api/cards`
4. card persistée, visible dans “Cartes” et sur “Toile” (projection)

### Done Criteria
- Un message chat peut être transformé en card sans copier-coller.
- Card créée est attachée au `dossierId` + `poleCode` + metadata.

---

## SECTION 11 — TICKET 6 — Graph Retrieval API

### Objectif
Récupérer le graphe complet d’un dossier (projection).

Endpoint :
- `GET /api/dossiers/:id/graph`

Retour :
- `cards[]`
- `relations[]`

### Done Criteria
- Latence acceptable (pagination/limits si besoin).
- Utilisable directement par ReactFlow.

---

## SECTION 12 — TICKET 7 — Canvas Projection

### Objectif
Canvas = projection du graphe DB (pas un stockage primaire).

Front :
- charge `GET /api/dossiers/:id/graph`
- rend nodes/edges ReactFlow
- interactions UI (zoom/pan/filters) non destructives

Règle :
- pas de persistance “CanvasNode/CanvasEdge” comme vérité primaire
- si ces tables existent, elles deviennent cache/projection optionnelle (à cadrer)

### Done Criteria
- Canvas affiche des nodes réels dès qu’il existe des cards.
- Zéro canvas “vide” après création de cards.

---

## SECTION 13 — TICKET 8 — Navigation Dock Backend (Search + Filters)

### Objectif
Permettre navigation “cognitive” : recherche + filtres.

Endpoint :
- `GET /api/cards/search?q=&dossierId=&type=&state=&poleCode=`

Index recommandé :

~~~sql
CREATE INDEX idx_cards_search
ON "Card"
USING GIN (to_tsvector('english', (title || ' ' || coalesce(cast(content as text), ''))));
~~~

### Done Criteria
- Recherche full-text OK
- tri/filtre OK
- prêt à brancher sur “dock” flottant côté UI

---

## SECTION 14 — VALIDATION FINALE

Le système est valide lorsque :

- identité expert toujours correcte (UI + système prompt)
- 100% execution via n8n (pôles)
- cards persistées
- relations persistées
- graph récupérable
- canvas affiche un graph réel
- recherche globale fonctionnelle

---

## SECTION 15 — CONTRAINTES FUTURES

Préparer compatibilité :

- vector embeddings (plus tard)
- graph > 100k nodes (pagination + batching)
- multi-user collaboration (permissions, audit)

Ne pas casser extensibilité.