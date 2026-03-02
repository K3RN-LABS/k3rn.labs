# TICKET — K3RN Onboarding UX Fix (No Modal/Blur) + Free First Contact + Progressive Questions (v1)

**Version:** 1.1
**Status:** DONE — 2026-03-02 (UX hotfix: voice input layout, textarea max-height, binary file Zod validation)
**Previous:** v1.0 DONE — 2026-03-01 (Reasoning fix: server-side auto-confirmation + richer LLM stateBlock)
**Owner:** Frontend Lead + Backend Lead  
**Priority:** CRITICAL  
**Scope:** Onboarding (KAEL) UX + State machine integrity (authoritative server state)  
**Non-goals:** Canvas/Cards/Memory Graph (out of scope for this ticket)

---

## 1) Diagnostic

### Problèmes observés (actuels)
1. **Double UX “chat + modal”** : un modal de Q/R apparaît au-dessus d’un chat flouté → impression de “deux chats”, casse l’immersion.
2. **Premier contact trop fermé** : l’utilisateur est forcé dans des catégories (chips) avant de pouvoir s’exprimer librement.
3. **Incohérences de complétion** : signaux “prêt à démarrer” alors qu’il reste des questions / input visible simultanément.
4. **Dérive / hallucinations** : questions et recommandations basées sur heuristiques fragiles (ex: suffixe “VR”), car l’IA “devine” au lieu d’analyser l’input brut.
5. **État non persistant / non fiable** : si l’état de progression est calculé à la volée par LLM et non persisté, un refresh détruit la progression et rend la logique non déterministe.

### Objectif UX (cible)
Reproduire **exactement** le pattern Claude :
- **Aucun floutage, aucun modal.**
- Les suggestions (chips) sont **dans le fil de discussion**, comme des “quick replies” **non contraignantes**.
- **First contact = input libre** (texte + fichiers) avant toute question structurante.
- Les questions suivent une **progression** (niveau 1 → niveau 2), basée sur **une analyse préalable** de l’input utilisateur.

---

## 2) Faits / Hypothèses / Inférences / Recommandations en bref

### Faits
- L’UX actuelle affiche un modal avec Q/R au-dessus du chat.
- L’utilisateur peut fermer le modal en cliquant dans la zone floutée.
- Le premier contact impose des réponses suggérées avant de laisser l’utilisateur s’exprimer.
- Incohérences possibles entre “isComplete” et l’UI encore interactive.

### Hypothèses (à vérifier vite)
- H1 : l’onboarding est géré par un “state machine” côté serveur/LLM mais **pas authoritative** (ou partiellement).
- H2 : la progression (“confirmedAspects”) n’est pas persistée, ou est recalculée par LLM.
- H3 : les “chips” sont traitées comme un choix fermé, pas comme suggestion optionnelle.

### Inférences
- Tant que l’état n’est pas authoritative + persisté, l’UX restera incohérente (complétion, gating, recommendedLab).
- Le modal introduit une friction et casse la cohérence du “chat-first product”.

### Recommandations (résumé)
- **Supprimer** modal + blur.
- **First contact** : message libre + pièces jointes, puis seulement questions.
- Transformer les “chips” en **quick replies inline** (facultatives).
- Rendre l’onboarding **authoritative** via un `OnboardingState` persisté (ou équivalent) + règles déterministes côté serveur.

---

## 3) Angles morts
- Accessibilité : focus management et navigation clavier (Enter, Tab) après suppression du modal.
- Mobile : quick replies inline doivent rester lisibles sans “envahir” l’écran.
- Multi-session : si plusieurs onglets, il faut éviter les états divergents.
- Compatibilité future : l’onboarding devra alimenter le Memory Graph (hors scope, mais ne pas casser).

---

## 4) Levier prioritaire (1 seul)

**Supprimer le modal/blur et rendre l’onboarding “chat-native” + authoritative (persisté).**  
C’est le plus gros gain UX + robustesse système à coût raisonnable.

---

## 5) Plan d’exécution (étapes, dépendances, “done”, métriques)

### Étape A — UX: supprimer le modal + blur (Front)
**Description**
- Retirer toute UI overlay/floutage.
- Injecter les questions et quick replies **dans le fil de conversation** (comme un message KAEL).
- La fermeture “en cliquant à l’extérieur” disparaît (plus de modal).

**Dépendances**
- Aucune

**Done**
- Zéro modal, zéro blur.
- Les quick replies apparaissent comme options sous le message de KAEL dans le chat.
- Le chat reste scrollable et utilisable en continu.

**Métriques**
- Drop-off onboarding ↓ (à instrumenter ensuite)
- Temps au premier message utilisateur ↓

---

### Étape B — First contact libre (Front + Back)
**Description**
- Première interaction : afficher un message KAEL type :
  - “Décris ton projet en 1–10 phrases. Tu peux coller du texte ou joindre des fichiers.”
- Les quick replies ne sont **que** des suggestions (ex: “ex: une phrase sur le problème”, “ex: pour qui”, etc.), pas des catégories fermées.
- L’utilisateur peut ignorer et répondre librement.

**Done**
- À la création d’un dossier, l’utilisateur peut envoyer texte/fichiers immédiatement.
- Les suggestions ne bloquent jamais le champ de saisie.
- Aucun “forced choice” en étape 0.

**Métriques**
- % utilisateurs envoyant un message libre en premier ↑
- % clics sur quick replies (optionnel) — mesure d’utilité, pas un gating

---

### Étape C — OnboardingState authoritative (Back)
**Description**
Créer un état serveur persisté **par dossier** (et idéalement par user) :
- `step` (enum)
- `problem`, `target`, `outcome`, `constraint` (champs text)
- `confirmedAspects` (booléens ou enum)
- `isComplete` (dérivé côté serveur uniquement)
- `recommendedLab` (déterminé côté serveur selon règles strictes)

**Important**
- **Jamais** laisser le client dire `isComplete=true`.
- **Jamais** recalculer l’état “à la volée” uniquement par LLM sans persistance.

**Done**
- Refresh : l’onboarding reprend au bon endroit.
- L’UI ne peut pas afficher “prêt” si les aspects requis ne sont pas présents.

**Métriques**
- Incohérences “prêt à démarrer” → 0
- Erreurs de progression (step regress) → 0

---

### Étape D — Analyse préalable de l’input utilisateur (Back + n8n)
**Description**
Après le premier message libre (texte + fichiers) :
1. Le backend envoie l’input à n8n (source d’exécution IA) pour :
   - extraire un **résumé**,
   - détecter si les 4 aspects sont déjà renseignés (problem/target/outcome/constraint),
   - proposer la **meilleure prochaine question** (niveau 1) si des trous existent,
   - générer 3–6 quick replies **non contraignantes**.
2. Persist : écrire dans `OnboardingState` :
   - champs extraits (si confiance suffisante),
   - flags de confirmation (mais **pas** “auto-confirm” sans garde, voir étape E).

**Done**
- Les questions suivantes sont basées sur l’input réel, pas sur heuristique du nom du projet.
- Plus d’hallucination “VR” basée sur “STRYVR”.

---

### Étape E — Confirmation explicite (UX) des aspects (Front + Back)
**Description**
- Un aspect ne doit pas être “confirmé” uniquement par extraction LLM.
- Pattern recommandé :
  - KAEL propose : “J’ai compris : Problème = X. Confirme ?” (Oui / Modifier)
  - Quick replies : “✅ Confirmer”, “✏️ Corriger”, “🧩 Ajouter un détail”
- Une fois confirmé, l’aspect passe `confirmed=true` côté serveur.

**Done**
- Aucun aspect critique n’est confirmé sans action utilisateur.
- Le système reste robuste aux mauvaises extractions.

---

### Étape F — Progress indicator (inline, non intrusif) (Front)
**Description**
Afficher dans l’onboarding (dans le chat, ou sticky header léger) :
- 4 indicateurs : **Problème / Cible / Résultat / Contrainte**
- État : vide / en cours / confirmé
- L’indicateur doit refléter **OnboardingState** (source unique serveur).

**Done**
- L’utilisateur voit pourquoi ça avance / ce qui manque.
- Impossible d’afficher “prêt” si un indicateur n’est pas vert.

---

### Étape G — Gating “Entrer dans le workspace” (Front + Back)
**Description**
- Le bouton “Entrer dans le workspace” n’apparaît (ou n’est activable) **que** si `isComplete=true` côté serveur.
- Pas de “prêt à démarrer” tant que la dernière question n’est pas confirmée.
- Retirer tout “skip” ambigu (si “Passer cette étape” existe, il doit être explicitement “Ignorer pour l’instant” et ne doit pas mettre `isComplete`).

**Done**
- Jamais “prêt à démarrer” + question restante.
- `isComplete` est une conséquence, pas une intention.

---

## 6) Spécification API (proposée)

> Adapter aux conventions actuelles du repo (routes NextJS). L’essentiel : état authoritative persisté.

### Modèle (Prisma ou SQL)
Créer une table `OnboardingState` (ou équivalent) :

- `id` (cuid/uuid)
- `dossierId` (FK)
- `step` (enum: `FREE_INPUT`, `CONFIRM_PROBLEM`, `CONFIRM_TARGET`, `CONFIRM_OUTCOME`, `CONFIRM_CONSTRAINT`, `COMPLETE`)
- `problemText` (text, nullable)
- `targetText` (text, nullable)
- `outcomeText` (text, nullable)
- `constraintText` (text, nullable)
- `problemConfirmed` (bool default false)
- `targetConfirmed` (bool default false)
- `outcomeConfirmed` (bool default false)
- `constraintConfirmed` (bool default false)
- `recommendedLab` (string/enum nullable)
- `createdAt`, `updatedAt`

### Routes
- `GET /api/dossiers/:id/onboarding` → retourne l’état authoritative
- `POST /api/dossiers/:id/onboarding/message` → envoie un message utilisateur (texte + fichiers refs) et renvoie :
  - `assistantMessage` (KAEL)
  - `quickReplies[]`
  - `onboardingState`
- `POST /api/dossiers/:id/onboarding/confirm` → payload `{ aspect: 'problem'|'target'|'outcome'|'constraint', value?, action: 'confirm'|'edit' }`

**Règles**
- `isComplete` est calculé : `problemConfirmed && targetConfirmed && outcomeConfirmed && constraintConfirmed`
- `recommendedLab` doit être déterministe côté serveur :
  - si `!isComplete` → pas de lab
  - si `isComplete` → mapping simple (ex: `DISCOVERY` par défaut, ou règles explicites)

---

## 7) Règles d’architecture (non négociables pour ce ticket)
1. **Pas de modal + blur** : onboarding = chat-first.
2. **First contact libre** : aucune question fermée tant que l’utilisateur n’a pas pu déposer son input brut.
3. **OnboardingState authoritative** : source unique serveur, persistée.
4. **Aucun auto-confirm** silencieux : confirmation par user action.
5. **IA via n8n** : si une analyse LLM est faite, elle passe par l’exécution n8n (pas d’appel direct modèle côté NextJS).

---

## 8) Top 3 risques + mitigations
1. **Risque : complexité state machine / bugs de transition**
   - Mitigation : transitions explicites `step -> step+1` only, tests unitaires sur reducer serveur.
2. **Risque : UX trop verbeuse**
   - Mitigation : questions courtes, quick replies utiles, indicateur de progression minimal.
3. **Risque : extraction LLM mauvaise**
   - Mitigation : confirmation utilisateur systématique + “edit” facile + pas d’auto-confirm.

---

## 9) Questions minimales (≤3)
1. Le repo a-t-il déjà un modèle/table pour l’onboarding (ou on crée `OnboardingState`) ?  
2. Les fichiers uploadés lors du premier message : quel stockage/référence actuelle (S3, Supabase storage, autre) ?  
3. Le bouton “Passer cette étape” doit-il rester (mode “skip”), ou être retiré complètement en v1 ?

---

## 10) Acceptance checklist (QA)
- [ ] À la création d’un dossier : aucun modal, aucun blur.
- [ ] L’utilisateur peut envoyer du texte/fichier immédiatement.
- [ ] KAEL répond ensuite avec une question + quick replies inline.
- [ ] Refresh : la progression est conservée.
- [ ] Aucun “prêt à démarrer” tant que les 4 aspects ne sont pas confirmés.
- [ ] Quick replies non contraignantes (on peut toujours répondre librement).
- [ ] “Entrer dans le workspace” n’apparaît/active que quand `isComplete=true` (serveur).

---

## Next step unique
Créer une branche `feat/onboarding-chat-native` et implémenter **Étape A (supprimer modal/blur)** + **Étape B (first contact libre)** en premier, puis enchaîner sur l’état authoritative.

---

## Hotfix v1.1 — 2026-03-02

### Bugs UX identifiés et corrigés

#### BUG-01 : Saisie vocale (interim) hors layout flex
**Symptôme :** Le texte `interim` de transcription vocale apparaissait à l’intérieur du `<div className="flex-1 relative">` après la Textarea, poussant la rangée de boutons (paperclip, mic, send) hors de l’écran.
**Fix :** Déplacer le `<p interim>` au-dessus du flex row, hors du conteneur relatif.
**Fichier :** `src/app/dossiers/[id]/onboarding/page.tsx`

#### BUG-02 : Textarea sans hauteur maximale
**Symptôme :** Avec un long texte, la Textarea s’étendait infiniment, repoussant les boutons d’envoi hors du viewport.
**Fix :**
- Ajouter `max-h-[200px] overflow-y-auto` à la Textarea (CSS)
- Mettre à jour `useAutoResize` pour respecter `getComputedStyle(el).maxHeight` et capper `style.height`
**Fichiers :** `src/app/dossiers/[id]/onboarding/page.tsx`, `src/hooks/use-auto-resize.ts`

#### BUG-03 : Zod "Validation error" sur fichiers binaires
**Symptôme :** Quand un fichier non reconnu (kind: `"binary"`) était joint, le POST retournait HTTP 400 "Validation error" car le schéma Zod n’acceptait que `["text", "image"]`.
**Fix :**
- Ajouter `"binary"` à `z.enum(["text", "image", "binary"])` dans `fileContextSchema` (route)
- Filtrer `kind === "binary"` côté client avant construction de `fileContexts` (pas de content/dataUrl utile pour le LLM)
**Fichiers :** `src/app/api/dossiers/[id]/onboarding/route.ts`, `src/app/dossiers/[id]/onboarding/page.tsx`
