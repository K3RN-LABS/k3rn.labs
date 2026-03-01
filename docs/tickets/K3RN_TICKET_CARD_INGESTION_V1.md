# TICKET — Card Ingestion API (Multi‑Card per Message, Server‑Authoritative)

## ID
K3RN‑TICKET‑CARD‑INGESTION‑V1

## Statut
READY_FOR_IMPLEMENTATION

## Priorité
CRITIQUE

## Objectif
Implémenter une API server‑authoritative unique permettant l’ingestion de 0..N Cards par message chat, avec extraction LLM structurée, déduplication, scoring, relations minimales obligatoires et idempotence stricte.

Ce système devient l’unique point d’entrée d’écriture dans le Memory Graph.

---

## Contexte

Actuellement :
- Une Card peut être créée manuellement depuis le chat
- Pas de pipeline global d’ingestion automatique robuste
- Risque de duplication, incohérence et bruit

Objectif :
- Permettre extraction multi‑cards fiable
- Garantir intégrité du graph
- Garantir idempotence
- Garantir déduplication
- Garantir relations minimales

---

## Invariants critiques (OBLIGATOIRES)

### Invariant 1 — Server authority

SEULE l’API `/api/dossiers/:id/ingest` peut :
- créer Card
- modifier Card
- créer relations

Aucun autre code ne peut écrire directement.

---

### Invariant 2 — Idempotence

Chaque ingestion possède :

```
idempotency_key = sha256(dossier_id + message_id)
```

Si déjà traité → retour sans duplication.

---

### Invariant 3 — Cap multi‑cards

Limiter à :

```
MAX_CARDS_PER_MESSAGE = 5
MIN_CONFIDENCE = 0.72
```

---

### Invariant 4 — Aucune Card orpheline

Chaque Card doit :

- soit avoir ≥ 1 relation
- soit être liée à DossierRoot

---

### Invariant 5 — Déduplication obligatoire

Stratégies :

1. Hash exact
2. Similarité titre
3. Similarité embedding (si pgvector actif)

Si match → MERGE, pas CREATE.

---

## Architecture cible

Chat Message
→ LLM Extraction JSON
→ POST /api/dossiers/:id/ingest
→ Validation
→ Déduplication
→ Create or Merge Cards
→ Create Relations
→ Retour résultat structuré

---

## API

### Endpoint

POST `/api/dossiers/:id/ingest`

### Input

```json
{
  "messageId": "uuid",
  "content": "string",
  "source": "USER | SYSTEM | POLE | ONBOARDING"
}
```

---

### LLM Extraction Contract

LLM DOIT retourner :

```json
{
  "candidates": [
    {
      "cardType": "VISION | PROBLEM | TARGET | CONSTRAINT | SOLUTION | NOTE",
      "title": "string",
      "content": "string",
      "confidence": 0.0,
      "relationHints": [
        {
          "type": "RELATES_TO",
          "targetHint": "string"
        }
      ]
    }
  ]
}
```

---

## Backend Logic

Pseudo‑flow :

```
if idempotency_key exists:
  return previous result

extract candidates via LLM

filter candidates:
  confidence >= MIN_CONFIDENCE

limit to MAX_CARDS_PER_MESSAGE

for each candidate:
  try exact match
  else try fuzzy match
  else try semantic match
  
  if match found:
    merge
  else:
    create card

ensure relation exists:
  if none:
    link to dossier root

store idempotency_key
return result
```

---

## DB requirements

Tables existantes utilisées :

- Card
- CardRelation
- CardTransitionLog

Nouvelle table requise :

```
CardIngestionLog
- id
- dossierId
- messageId
- idempotencyKey
- createdAt
```

---

## Response format

```json
{
  "created": [],
  "merged": [],
  "relationsCreated": [],
  "ignored": []
}
```

---

## UX requirement

Afficher dans chat :

"🧠 3 éléments enregistrés"

avec possibilité :

- voir
- éditer
- supprimer

---

## Done Definition

DONE si :

- Multi‑card ingestion fonctionne
- Idempotence fonctionne
- Déduplication fonctionne
- Aucune card orpheline possible
- API est l’unique point d’écriture

---

## Tests obligatoires

Cas 1 :
Même message envoyé 2x → aucune duplication

Cas 2 :
Message contient 5 concepts → max 5 cards

Cas 3 :
Message similaire → merge

Cas 4 :
Message vide → 0 card

---

## Métriques à logger

- cards_created_count
- cards_merged_count
- dedupe_rate
- ingestion_latency_ms

---

## Interdictions

INTERDIT :

- créer card côté client
- bypass API ingestion
- créer card sans relation

---

## Résultat attendu

Pipeline fiable :

Chat → Extraction → Ingestion API → Graph propre → Mémoire exploitable
