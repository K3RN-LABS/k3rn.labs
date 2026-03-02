# Onboarding UX — Règles & Patterns (KAEL)

## Principe fondamental
L'onboarding est un chat-first conversationnel. Pas de modal, pas de blur, pas de UI overlay.

## State machine — Règles non négociables

### Authoritative server state
- `OnboardingState` est la source de vérité — toujours côté serveur, persisté en DB
- `isComplete` ne peut jamais être dérivé uniquement côté client
- Le client **reçoit** `step: "COMPLETE"` — il ne le calcule pas
- Guard : ne jamais afficher le banner "Workspace prêt" si des `choices` sont encore en attente

### Idempotency
- Si `status === "COMPLETE"` en DB → retourner l'état existant sans re-invoquer le LLM

## Fichiers gestion onboarding

| Fichier | Rôle |
|---------|------|
| `src/app/dossiers/[id]/onboarding/page.tsx` | UI chat onboarding |
| `src/app/api/dossiers/[id]/onboarding/route.ts` | GET (historique) + POST (message) |
| `src/lib/onboarding-state.ts` | State machine : deserializeState, applyLLMResponse, toDTO |
| `src/lib/claude.ts` | invokeChefDeProjet |

## Schéma Zod (route POST) — fileContextSchema
```ts
kind: z.enum(["text", "image", "binary"])  // toujours les 3 valeurs
```
Ne jamais réduire à `["text", "image"]` — les fichiers non reconnus ont `kind: "binary"`.

## Gestion fichiers côté client
- Filtrer `kind === "binary"` avant de construire `fileContexts` envoyés au LLM
- Les binaires n'ont ni `content` ni `dataUrl` utiles pour le LLM
- Ils restent dans `attachments` pour l'affichage dans la bulle utilisateur

## Textarea auto-resize
- `useAutoResize` (src/hooks/use-auto-resize.ts) lit `getComputedStyle(el).maxHeight`
- La Textarea doit avoir `max-h-[200px] overflow-y-auto` pour capper la croissance
- Le hook ne doit jamais setter `style.height` au-delà du `maxHeight` CSS

## Input zone layout
- La zone input est `shrink-0` — ne jamais la laisser pousser la zone de chat
- `interim` (transcription vocale) : positionner **au-dessus** du flex row des boutons, pas à l'intérieur
- Structure correcte :
  ```
  [interim vocal — au-dessus si actif]
  [flex row: textarea | boutons paperclip/mic/send]
  [hint ⌘+Entrée]
  ```

## Completion pattern
- Le bouton "Entrer dans le workspace" n'apparaît que si `isComplete === true` (dérivé du serveur)
- Safety guard : `isComplete = onboardingState?.step === "COMPLETE" && !hasPendingChoices`
- Choices inline : n'afficher que sur le **dernier** message KAEL qui les contient

## Bugs connus et fixés (2026-03-02)
- ✅ `interim` vocal hors du conteneur flex → pushait les boutons hors écran
- ✅ Textarea sans `max-h` → s'étendait infiniment, cachait les boutons
- ✅ `fileContextSchema` sans `"binary"` → Zod rejetait les fichiers non reconnus avec 400
- ✅ KAEL re-posait des questions sur aspects confirmés → double fix dans `invokeChefDeProjet` :
  1. `stateReminder` ajouté en **fin de prompt** (poids recency) avec liste explicite des aspects à ne pas reposer
  2. Exemple JSON `confirmedAspects` remplacé par la liste réelle confirmée (plus `["problem"]` hardcodé)
  3. Règle "ne les repose JAMAIS" renforcée avec "même si l'historique montre une ancienne question"
