# Implementation: FINALE Workspace Design Mockup → Production

## Reference
- **Mockup**: `K3RN.LABS CONCEPTION/maquette_workspace/FINALE_workspace_design.html`
- **Design system**: Dark 900 Canvas (#22242B) with cool blue undertone depth architecture

---

## Step 1 — Update `globals.css` with Dark 900 Canvas color system

**File**: `src/app/globals.css`

Replace the current canonical color tokens with the FINALE mockup's Dark 900 Canvas system:

```
--color-bg-primary: #22242B       (was #000000)
--color-bg-secondary: #1A1C22     (was #0F0F0F)
--color-bg-card: #2C2F38          (was #1A1A1A)
--color-bg-card-hover: #363940    (was #22242B)
--color-surface-1: #464950        (was #2F323A)
--color-surface-2: #62656D        (was #5D5C5B)
--color-border-subtle: rgba(255,255,255,0.06)   (was 0.05)
--color-border-strong: rgba(255,255,255,0.18)    (was 0.2)
--color-text-primary: #F5F5F7     (was #FFFFFF)
--color-text-secondary: #A0A3AB   (was #D2D3D4)
--color-text-muted: #6C6F78       (was #5D5C5B)
```

Add shadow tokens:
```
--shadow-soft: 0 0 15px rgba(247,81,5,0.12)
--shadow-elevation: 0 8px 32px rgba(0,0,0,0.35)
```

Add canvas dot-grid pattern via `body::before` pseudo-element in `@layer base`.

Update header background to match: `rgba(34,36,43,0.88)` with blur(24px).

---

## Step 2 — Update SiteHeader with new background color

**File**: `src/components/layout/site-header.tsx`

- Change `bg-black/90` / `bg-black/70` to use the new canvas-based background: `bg-[#22242B]/90` + `backdrop-blur-xl` (matching mockup's `rgba(34,36,43,0.88)`)
- Navigation links are already correct (Capture/Dossiers with active orange underline)

---

## Step 3 — Create Detail Overlay component

**New file**: `src/components/workspace/project-detail-overlay.tsx`

This is the largest new component. From the FINALE mockup, it includes:

### Props
```ts
interface ProjectDetailOverlayProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onSave: (updates: { title?: string; description?: string }) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}
```

### Layout (2-column grid)
**Left column**: Radar chart (SVG) with:
- 4 concentric circles (150, 112, 75, 37 radius)
- 6 axis lines (Probleme, Marche, Diff., Faisab., Business, Founder)
- Data polygon filled with `rgba(247,81,5,0.08)` stroke `#F75105`
- Center score display (large number + /100)
- Decision badge at bottom-left

**Right column**:
- Section label "Dossier" (orange uppercase)
- Title (h2, 1.5rem, semibold)
- Description (text-secondary, font-light)
- Metrics grid: Score Global + Confiance
- CTA buttons: "Envoyer au Laboratoire" (primary, with arrow animation) + "Re-analyser" (secondary)

### Below the grid
- Separator
- "Axes d'Analyse" section: 6 axis rows with progress bars
- Separator
- "Synthese" section: italic blockquote
- Separator
- "Risques Identifies" section: bullet list with red dots
- Separator
- "Parametres du Dossier": editable title input + description textarea
- Actions row: Archiver (ghost) + Supprimer (ghost-danger) + spacer + Sauvegarder (primary)

### Overlay shell
- Fixed backdrop with `bg-[rgba(15,16,20,0.70)]` + `backdrop-blur-[12px]`
- Card: `bg-[--color-bg-card]` with platinum borders (top brighter, bottom darker)
- Close button: round, `bg-[--color-surface-1]`, top-right
- Escape key to close
- Click backdrop to close

### Arrow animation on "Envoyer au Laboratoire"
- Arrow SVG rotated 180deg by default (points ↙)
- On button hover: rotates to 0deg (points ↗)
- Transition: `cubic-bezier(0.34, 1.56, 0.64, 1)` 0.3s

---

## Step 4 — Rewrite ProCard with Platinum styling

**File**: `src/components/workspace/pro-card.tsx`

Key changes from current code:
1. **Platinum gradient**: `background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)` over `bg-card`
2. **Differentiated borders**: brighter top, subtle sides, dark bottom (matching mockup `.p-card`)
3. **Hover**: gradient intensifies, Y-3px lift, stronger shadow
4. **Remove settings gear** completely — clicking card opens detail overlay
5. **Folder icon background**: `bg-[--color-bg-primary]` (canvas #22242B) instead of card-hover
6. **Remove onSettings prop** — simplify to just `onClick`
7. **Low-score opacity**: KILL cards at 0.75 opacity, PARK cards at 0.6 opacity
8. **Box-shadow**: `0 2px 8px rgba(0,0,0,0.15)`, hover: `0 16px 48px rgba(0,0,0,0.35)`
9. **New card**: `bg-card` with dashed border, plus-circle bg `bg-primary` (canvas)

---

## Step 5 — Rewrite FloatingDock with platinum styling

**File**: `src/components/workspace/floating-dock.tsx`

Key changes:
1. **Background**: platinum gradient `linear-gradient(180deg, rgba(26,28,34,0.94), rgba(18,19,24,0.97))` with `backdrop-blur-[32px]`
2. **Differentiated borders**: top brighter, sides subtle, bottom dark
3. **Box-shadow**: heavy `0 20px 60px rgba(0,0,0,0.45)` + inset highlight
4. **Dock groups**: `bg-[rgba(0,0,0,0.25)]` with `rounded-[--radius-lg]` (12px) + subtle border
5. **Dock buttons**: 36x36px, `rounded-[--radius-lg]` (12px)
6. **Active button**: `bg-[rgba(255,255,255,0.1)]` with inset shadow
7. **Filter pills**: 9px font (0.5625rem), `rounded-lg`, active styles with `/15` opacity borders
8. **Search input**: `bg-[rgba(0,0,0,0.20)]` with 6% border
9. **CTA button**: 40x40px, `rounded-lg` (not xl), inset highlight
10. **Separator**: `rgba(255,255,255,0.08)` (not border-default)

---

## Step 6 — Rewrite Workspace Page

**File**: `src/app/workspace/page.tsx`

Key changes:
1. **Welcome hero section** (NEW): Recessed container with `bg-[--color-bg-secondary]`, inset shadows, rounded-2xl
   - "Bonjour, Thomas." (2.5rem, font-light, text-primary) + "{n} dossiers actifs." (text-muted)
   - Subtitle: "{n} projets valides GO · {n} necessite votre attention"
   - Calculate counts from projects array

2. **Remove old header section** ("Dossiers" h1 + count)

3. **Replace settings dialog** with detail overlay:
   - Click on card → open detail overlay (not navigate to `/workspace/${id}`)
   - Remove `DossierSettingsDialog` import and usage
   - Add `ProjectDetailOverlay` with state for selected project
   - Add handlers for onSave, onArchive, onDelete

4. **Grid**: use `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))` matching mockup

5. **Add canvas dot-grid**: Already handled in globals.css (Step 1)

6. **Max-width**: 1400px (matching mockup) instead of 1600px

---

## Step 7 — Cleanup

- `src/components/workspace/dossier-settings-dialog.tsx`: Keep file but it's no longer used by workspace page. Leave intact for potential future use.
- `src/app/capture/page.tsx`: No changes needed — already uses `SiteHeader variant="app"` without contextLabel.

---

## Files Modified

| # | File | Action |
|---|------|--------|
| 1 | `src/app/globals.css` | UPDATE — Dark 900 Canvas tokens + dot-grid |
| 2 | `src/components/layout/site-header.tsx` | UPDATE — Header bg color |
| 3 | `src/components/workspace/project-detail-overlay.tsx` | NEW — Full detail overlay |
| 4 | `src/components/workspace/pro-card.tsx` | REWRITE — Platinum cards |
| 5 | `src/components/workspace/floating-dock.tsx` | REWRITE — Platinum dock |
| 6 | `src/app/workspace/page.tsx` | REWRITE — Welcome hero + overlay integration |

## Execution Order
1. globals.css (foundation tokens)
2. site-header.tsx (header bg)
3. project-detail-overlay.tsx (new component)
4. pro-card.tsx (platinum cards)
5. floating-dock.tsx (platinum dock)
6. workspace/page.tsx (integrate everything)

## Verification
1. `npm run build` — zero errors
2. Canvas dot-grid visible on all pages
3. Header: backdrop matches Dark 900 Canvas (no more pure black)
4. Workspace: Welcome hero visible with project stats
5. Cards: platinum gradient, differentiated borders, lift on hover, KILL/PARK reduced opacity
6. Click card → detail overlay opens with radar chart, axes, synthesis, risks, editable params
7. "Envoyer au Laboratoire" button: arrow rotates ↙→↗ on hover with elastic easing
8. Floating dock: platinum gradient, radius-lg internals, heavy shadow
9. Filters: subtle active states with decision colors
10. Escape key closes overlay, backdrop click closes overlay
