# Plan : Déploiement des Laboratoires K3rn.labs

## Contexte

Les pages Lab 1 (Discovery) et Lab 2 (Structuration) existent comme stubs identiques avec des données hardcodées. L'objectif est de :
1. **Différencier Lab 1 / Lab 2** avec des expériences distinctes
2. **Connecter l'Expert Chat à Claude API** pour des réponses IA contextuelles en streaming

---

## Fichiers à créer (6)

### 1. `src/hooks/use-project.ts` — Hook de chargement projet
- Charge un projet par ID depuis `localStorage` (`k3rn_projects` puis fallback `k3rn_active_project`)
- Exporte l'interface `StoredProject` alignée sur ce que `analysis-results.tsx:saveProjectToStorage()` sauvegarde
- Retourne `{ project, isLoading }`

### 2. `src/app/api/expert-chat/route.ts` — API Claude pour le chat expert
- Endpoint `POST` avec streaming SSE
- Reçoit : `messages[]`, `projectContext`, `labType` ("discovery"|"structuration"), `language`
- Construit un system prompt distinct selon le lab :
  - **Ava (Discovery)** : questions socratiques, challenge des hypothèses, focus sur les axes faibles et risques
  - **Marcus (Structuration)** : pragmatique, frameworks (BMC/Lean Canvas), milestones et métriques, focus sur forces et leviers
- Le system prompt inclut le contexte complet du projet (scores, axes, risques, leviers, synthèse)
- Streaming via `anthropic.messages.stream()` → SSE (`data: {text}`)
- Modèle : `claude-sonnet-4-20250514` (configurable via env `EXPERT_CHAT_MODEL`)
- Pattern identique à `/api/analysis/route.ts` pour l'instanciation Anthropic SDK

### 3. `src/components/workspace/lab1/discovery-panel.tsx` — Panneau gauche Lab 1
- Reçoit `StoredProject` en prop
- Sections : Score global + DecisionBadge, 6 axes avec `AxisScoreBar` (axes faibles `<50` marqués visuellement), Risques avec sévérité, Confiance
- Graceful degradation si pas de `fullResult` (fallback sur `project.analysis.axes` avec normalisation score 0-10 → 0-100)

### 4. `src/components/workspace/lab1/discovery-workspace.tsx` — Zone centrale Lab 1
- PAS un canvas libre — un workspace structuré scrollable
- **Verdict** : DecisionBadge + score + synthèse en citation
- **"Questions à Explorer"** : générées côté client depuis les axes faibles (`score < 60`) et risques du `fullResult`. Chaque carte : tag axe, question, contexte (justification), indicateur de sévérité
- **"Hypothèses à Valider"** : section interactive avec bouton "Ajouter une hypothèse", chaque carte avec texte + statut (à valider/validée/invalidée). Persistence localStorage `k3rn_lab1_hypotheses_{projectId}`

### 5. `src/components/workspace/lab2/structuration-panel.tsx` — Panneau gauche Lab 2
- Reçoit `StoredProject` en prop
- Sections : Score + GO badge, Forces (axes ≥ 70 seulement), Leviers d'action (depuis `fullResult.levers` avec impact coloré), Synthèse

### 6. `src/components/workspace/lab2/structuration-workspace.tsx` — Zone centrale Lab 2
- **Business Model Canvas simplifié** : grille 2×2 (Proposition de Valeur, Cible, Modèle de Revenus, Ressources Clés). Chaque bloc = textarea éditable pré-remplie depuis les justifications des axes pertinents. Persistence localStorage `k3rn_lab2_bmc_{projectId}`
- **Plan d'Action** : pré-rempli depuis `fullResult.levers`, chaque étape avec description + priorité + statut (todo/fait). Ajout de nouvelles étapes possible
- **Jalons** : 4 milestones éditables (MVP, Premiers Users, Revenue, Scale) avec titre + date cible

---

## Fichiers à modifier (4)

### 7. `src/app/workspace/laboratoire-1-discovery/[id]/page.tsx`
- Intégrer `useProject(id)` pour charger les données réelles
- Remplacer `DossierPanel` → `DiscoveryPanel`, `CanvasBoard` → `DiscoveryWorkspace`
- Passer `project` et `labType="discovery"` à `ExpertChat`
- Passer `project`, `labName="Discovery"`, `labNumber={1}` au header
- États loading / not found

### 8. `src/app/workspace/laboratoire-2-structuration/[id]/page.tsx`
- Même pattern avec `StructurationPanel`, `StructurationWorkspace`, `labType="structuration"`

### 9. `src/components/workspace/header.tsx`
- Nouveaux props : `project?: StoredProject`, `labName?: string`, `labNumber?: number`
- Afficher le vrai titre du projet (au lieu de `Idée #xxxx`)
- Afficher `DecisionBadge` au lieu du badge statique "Analysing"
- Sous-titre : `Lab {n} — {labName}`
- Avatar expert conditionnel (Ava pour Lab 1, Marcus pour Lab 2)

### 10. `src/components/workspace/expert-chat.tsx`
- Nouveaux props : `project: StoredProject | null`, `labType: "discovery" | "structuration"`
- Remplacer messages statiques par state `messages[]` avec rendu dynamique
- Input contrôlé avec envoi via `POST /api/expert-chat` + parsing SSE streaming
- Message d'accueil initial contextuel (généré côté client selon lab + projet)
- Indicateur de streaming (typing indicator)
- Auto-scroll en bas sur nouveau message
- Support `Enter` pour envoyer, `Shift+Enter` pour newline
- Persistence chat dans localStorage `k3rn_chat_{labType}_{projectId}`
- Header : nom expert + rôle selon labType
- Avatar : "A" orange (Ava) ou "M" vert (Marcus)

---

## Ordre d'implémentation

1. `use-project.ts` (aucune dépendance)
2. `expert-chat route.ts` (aucune dépendance frontend)
3. `discovery-panel.tsx` + `structuration-panel.tsx` (dépendent de use-project)
4. `discovery-workspace.tsx` + `structuration-workspace.tsx` (dépendent de use-project)
5. `expert-chat.tsx` (modification, dépend de l'API route)
6. `header.tsx` (modification)
7. `page.tsx` Lab 1 + Lab 2 (modifications, assemblent tout)

---

## Edge cases à gérer

- **Projets sans `fullResult`** (mocks demo) : fallback sur `project.analysis.axes` avec normalisation score ×10
- **Projets KILL** accédés via URL directe : afficher un banner d'avertissement dans Lab 1
- **Chat rate-limit (429)** : message d'erreur + désactivation temporaire de l'input
- **Stream interrompu** : afficher le contenu partiel avec indicateur d'erreur

## Vérification

1. Créer un projet via `/capture` qui obtient EXPLORE → ouvrir depuis le workspace → vérifier Lab 1 avec données réelles + chat Ava fonctionnel
2. Créer un projet GO → vérifier Lab 2 avec BMC pré-rempli + chat Marcus fonctionnel
3. Tester avec un projet demo (sans fullResult) → vérifier le fallback graceful
4. Tester le streaming chat + persistence des messages au rechargement
