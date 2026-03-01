# K3RN — Ticket: Workspace Unified Cognitive Surface (WCS)
Version: 1.0  
Status: EXECUTION READY  
Priority: CRITICAL  
Date: 2026-03-01  

---

# SECTION 1 — OBJECTIF

Unifier définitivement le Workspace en une surface cognitive unique qui combine :

- Canvas (graph neuronal)
- Experts (multi‑chat simultané)
- Orchestrateur KAEL
- Dock de navigation intelligent

Le Workspace devient la seule surface d’interaction du projet.

---

# SECTION 2 — PROBLÈME ACTUEL

Le système est fragmenté en plusieurs surfaces :

- Workspace (liste subfolders + experts)
- Subfolder pages (canvas isolé)
- Expert chat panels isolés
- KAEL séparé du graphe réel

Conséquences :

- perte de continuité cognitive
- experts sans contexte complet
- graph sous‑exploité
- UX incohérente

---

# SECTION 3 — ARCHITECTURE CIBLE

Workspace devient la racine unique :

Workspace
│
├── Canvas (Graph projection)
├── Floating Dock
├── Expert Panels Manager
└── KAEL Orchestrator Panel

Toutes les données proviennent exclusivement de :

GET /api/dossiers/[id]/graph

---

# SECTION 4 — RÈGLES D’ARCHITECTURE

Règle 1 — Workspace = surface unique  
Supprimer les pages subfolder séparées.

Règle 2 — Canvas toujours monté  
Canvas visible en permanence.

Règle 3 — Experts = panels indépendants  
Chaque expert a sa session isolée.

Règle 4 — KAEL toujours présent  
KAEL accessible en permanence.

---

# SECTION 5 — IMPLÉMENTATION

Étape 1 — Créer la page Workspace

src/app/workspace/[dossierId]/page.tsx

Structure :

WorkspaceLayout
 ├── CanvasView
 ├── Dock
 ├── ExpertPanelManager
 └── KaelPanel

---

Étape 2 — Canvas global

Canvas charge toujours :

GET /api/dossiers/[id]/graph

---

Étape 3 — Expert Panel Manager

Créer composant :

src/components/workspace/ExpertPanelManager.tsx

Fonctions :

openExpert(expertId)  
closeExpert(expertId)  
focusExpert(expertId)

---

Étape 4 — KAEL Panel

Créer :

src/components/workspace/KaelPanel.tsx

---

Étape 5 — Floating Dock

Créer :

src/components/workspace/Dock.tsx

Fonctions :

- search graph
- filter by type
- layout switch

---

# SECTION 6 — STATE MANAGEMENT

Créer store global :

src/lib/workspace-store.ts

Utiliser Zustand.

---

# SECTION 7 — REALTIME

Utiliser Supabase Realtime channel "graph"

Sur GRAPH_UPDATED :

invalidateQuery(["graph", dossierId])

---

# SECTION 8 — DEFINITION OF DONE

Terminé lorsque :

- Workspace affiche graph immédiatement
- Experts peuvent être ouverts simultanément
- KAEL toujours accessible
- Canvas toujours visible

---

# SECTION 9 — RÉSULTAT FINAL

Workspace devient un système cognitif temps réel.

Graph, experts et orchestrateur partagent la même mémoire.

