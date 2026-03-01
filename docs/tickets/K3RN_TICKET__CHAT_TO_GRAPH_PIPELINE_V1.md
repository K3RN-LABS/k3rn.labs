# K3RN_TICKET__CHAT_TO_GRAPH_PIPELINE_V1

Owner: Product/Tech  
Priority: P0  
Status: READY  
Target: Next.js 14 (App Router) + Prisma + Supabase Realtime  
Scope: SaaS Web (Workspace + Expert chats)  
Out of scope: n8n workflows (no changes), Telegram Gateway (no changes)

---

## Diagnostic

Nous avons un **endpoint d’ingestion** robuste et testé isolément : `POST /api/dossiers/[id]/ingest`.  
Aujourd’hui, **aucun chat** (orchestrateur KAEL, PoleManagerChat, Expert chat) ne déclenche cet endpoint, donc le **graph** (Cards/Relations) reste **passif** et le canvas reste souvent **vide**.

En parallèle, le projet utilise **Supabase Realtime (broadcast channels)** via `src/lib/realtime.ts`. Nous pouvons donc propager un event `GRAPH_UPDATED` pour déclencher un refetch client du graph après ingestion.

Objectif du ticket : **brancher automatiquement chaque message** (user + IA) sur l’ingestion **côté serveur**, puis **broadcast** un event de refresh, et enfin **rafraîchir le canvas** côté client.

---

## Faits / Hypothèses / Inférences / Recommandations en bref

### Faits
- Endpoint existant : `POST /api/dossiers/[id]/ingest` (idempotence `messageId + dossierId`, max 5 cards, confidence >= 0.72, déduplication, relationHints).
- `invokeExpertChat` **n’appelle pas** l’ingestion.
- Frontend chat **n’appelle pas** l’ingestion.
- Realtime: Supabase broadcast channels (`canvas`, `score`, `lab`) présents (pas de Redis pub/sub).

### Hypothèses
- H1: Le canvas récupère les cards via `GET /api/dossiers/[id]/graph` (déjà en place).  
  Impact si faux: il faudra ajouter ou corriger l’endpoint de lecture.
- H2: L’UI chat possède une couche commune d’envoi message (idéalement unique) pour KAEL + Experts.  
  Impact si faux: il faudra patcher plusieurs points d’entrée.
- H3: On peut générer un `messageId` stable par message user (UUID v4) côté serveur.  
  Impact si faux: risque de casser l’idempotence si généré côté client sans garantie.

### Inférences
- Sans **pipeline chat→ingestion**, le graph n’aura jamais une couverture suffisante pour devenir “système nerveux”.
- Sans **broadcast + refetch**, l’UX restera “canvas vide” et donnera l’impression que rien ne se passe.

### Recommandations (ordre strict)
1. Déclencher ingestion **côté serveur** après chaque message traité (user + AI), sans bloquer la réponse chat.
2. Émettre `GRAPH_UPDATED` via Supabase Realtime broadcast.
3. Écouter `GRAPH_UPDATED` côté client et refetch `/api/dossiers/[id]/graph` (debounce).

---

## Angles morts

- **Double comptage**: ingestion sur message user + message AI peut créer des duplicates si `messageId` mal géré.
- **Latence perçue**: ingestion ne doit pas retarder la réponse chat.
- **Concurrence multi-tabs**: plusieurs clients sur le même dossier → need broadcast + idempotence.
- **Observabilité**: sans AuditLog/Metrics, on ne sait pas si ingestion tourne réellement en prod.

---

## Levier prioritaire (1 seul)

**Brancher automatiquement `/api/dossiers/[id]/ingest` dans le pipeline serveur de chaque message chat, puis broadcast `GRAPH_UPDATED`.**

---

## Plan d’exécution (étapes, dépendances, “done”, métriques)

### Étape 0 — Prérequis (lecture rapide code)
- Identifier le(s) point(s) d’entrée où un message est envoyé/traité :
  - `invokeExpertChat` (server)
  - `invokeKAEL` / orchestrateur (server)
  - routes API liées au chat (si existantes)
- Identifier le flux actuel de refresh canvas (si existant).

**Done**
- Liste des fonctions/routes exactes à patcher + endroit unique si possible.

---

### Étape 1 — Introduire un “Ingestion Dispatcher” serveur (non bloquant)
Créer une fonction utilitaire **server-side** :

`src/lib/card-ingestion.ts`
- `queueCardIngestion(params)` (fire-and-forget)
- `ingestNow(params)` (await, réservé tests/CLI)

#### Contrat minimal
```ts
type CardIngestionParams = {
  dossierId: string
  messageId: string
  source: "USER" | "AI"
  actorType: "KAEL" | "EXPERT"
  actorId?: string // expertId si applicable
  content: string
  metadata?: Record<string, unknown>
}
```

#### Implémentation
- `queueCardIngestion` appelle `POST /api/dossiers/[id]/ingest` **depuis le serveur** (URL interne) OU appelle directement la logique métier (préférable si l’endpoint partage le même code).
- Timeout court (ex: 8s) + try/catch silencieux mais loggé.
- Ne doit **jamais** throw vers le user.

**Done**
- Fonction utilitaire utilisable depuis toutes les fonctions chat.
- Tests unitaires basiques sur validation params.

**Métriques**
- `% ingestion_success` (via AuditLog)
- `ingestion_latency_ms` (si déjà émis par endpoint, sinon ajouter)

---

### Étape 2 — Brancher ingestion dans `invokeExpertChat`
Après réception de la réponse AI (et après persistance éventuelle du message), déclencher :

1) ingestion du message user (si pas déjà ingéré)  
2) ingestion du message AI

#### Règle d’idempotence
`messageId` doit être **stable** :
- pour le message user: généré au moment où le message est créé en DB (ou au moment où l’API chat est appelée).
- pour le message AI: `messageId = userMessageId + ":ai"` (ou UUID séparé stocké).

**Done**
- À chaque échange user→expert, ingestion est appelée deux fois (USER, AI) sans duplication.
- En cas de retry réseau, idempotence empêche les doubles insertions.

**Métriques**
- `cards_created_count`, `cards_merged_count`, `ignored_count`, `dedupe_rate`.

---

### Étape 3 — Broadcast Realtime `GRAPH_UPDATED`
Ajouter un channel dédié (recommandé) : `"graph"`  
Sinon réutiliser `"canvas"` (moins propre).

#### Event
- Name: `GRAPH_UPDATED`
- Payload minimal:
```json
{
  "dossierId": "<uuid>",
  "reason": "CARD_INGESTION",
  "messageId": "<id>",
  "ts": "<iso>"
}
```

#### Où émettre
- Dans l’endpoint ingestion **après** transaction DB réussie.
- Si ingestion retourne un résultat idempotent, on **peut** émettre quand même (safe), mais préférer n’émettre que si `cards_created_count + cards_merged_count > 0` pour réduire bruit.

**Done**
- Un client connecté reçoit l’event dans <1s après ingestion.

**Métriques**
- `graph_broadcast_count`
- `graph_broadcast_error_count`

---

### Étape 4 — Client: écouter `GRAPH_UPDATED` et refetch graph
Dans le canvas view / workspace (là où le graph est affiché):
- S’abonner à `realtime.channel("graph")` (ou "canvas")
- On `GRAPH_UPDATED` du dossier courant:
  - debounce 250–500ms
  - refetch `GET /api/dossiers/[id]/graph`
  - re-render ReactFlow

**Done**
- Une nouvelle carte apparaît sur le canvas automatiquement après un message.
- Aucun refresh manuel nécessaire.

**Métriques**
- `canvas_refetch_count`
- `canvas_time_to_update_ms` (optionnel)

---

### Étape 5 — Observabilité minimale
- Ajouter un `AuditLog` pour:
  - `CARD_INGESTION_TRIGGERED`
  - `CARD_INGESTION_FAILED`
  - `GRAPH_UPDATED_BROADCASTED`
- Ajouter un flag `INGESTION_ENABLED` (env) pour kill-switch.

**Done**
- On peut diagnostiquer ingestion en prod sans logs console.

---

## Top 3 risques + mitigations

1) **Explosion de coûts / tokens** (ingestion sur chaque message)  
   Mitigation: seuil confiance (déjà), max 5 cards (déjà), skip si message trop court (< N chars), kill-switch env.

2) **Dégradation UX (latence)**  
   Mitigation: ingestion fire-and-forget, timeout court, aucun blocage du rendu chat.

3) **Bruit dans graph** (cards inutiles)  
   Mitigation: règles de filtrage (déjà), + future amélioration: “cardType allowlist” par lab / par expert.

---

## Questions minimales (≤3)

1) Où est généré/stocker le `messageId` canonique aujourd’hui (DB message table, front state, autre) ?  
2) Le canvas lit-il déjà via `GET /api/dossiers/[id]/graph` (confirm) ?  
3) Souhaite-t-on créer un channel Realtime `graph` (propre) ou réutiliser `canvas` (rapide) ?

---

## Next step unique

Implémenter **Étape 1 + Étape 2** : créer `src/lib/card-ingestion.ts` (fire-and-forget) et brancher l’appel dans `invokeExpertChat` (USER + AI) avec une stratégie `messageId` stable.
