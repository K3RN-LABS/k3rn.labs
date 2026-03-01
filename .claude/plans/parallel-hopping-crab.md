# Plan : Refonte Design System v0-Inspired pour k3rn.labs

## Objectif
Implémenter un design system complet inspiré de v0.app avec :
1. Design tokens CSS (couleurs, spacing, typography)
2. Tailwind config adapté
3. Composants UI core (Button, Input, Card)
4. Composants métier (ProjectCard, BrainDumpInput)
5. Homepage marketing avec hero section
6. Header navigation sticky
7. Animations Framer Motion
8. Responsive mobile-first

**Approche** : Remplacement complet de l'app shell actuel

## Phase 1 : Foundation (Design Tokens + Tailwind)

### 1.1 Design Tokens
**Créer** : `src/styles/tokens.css`
- Couleurs : fond noir pur (#000000), neutrals 50-950, orange brand 50-900
- Spacing : base 4px (space-1 à space-32)
- Typography : font-sans, font-mono, tailles xs-8xl
- Borders : radius sm-full, widths
- Shadows : sm-xl + shadow-orange
- Transitions : fast/base/slow
- Z-index : base/dropdown/sticky/modal/toast

### 1.2 Tailwind Config
**Modifier** : `tailwind.config.ts`
- Étendre colors avec tokens (bg-base, bg-elevated, bg-surface, fg-primary, etc.)
- Étendre spacing avec tokens
- Étendre fontSize, borderRadius, boxShadow
- Garder compatibilité Tailwind v4

### 1.3 Globals CSS
**Modifier** : `src/app/globals.css`
- Importer tokens.css
- Reset CSS minimal
- Font Geist intégration
- Background noir pur par défaut

## Phase 2 : Utilities & Helpers

### 2.1 CN Helper
**Créer** : `src/lib/utils.ts`
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 2.2 Animations Framer Motion
**Créer** : `src/lib/animations.ts`
- fadeInUp
- staggerContainer
- cardHover
- gradientBorder

### 2.3 Date Utilities
**Créer** : `src/lib/date.ts`
- formatRelativeTime (pour ProjectCard)

## Phase 3 : Composants UI Core

### 3.1 Button
**Créer** : `src/components/ui/Button.tsx`
- Variants : primary (gradient orange), secondary (border transparent), ghost
- Sizes : sm, md, lg
- States : hover, disabled, loading
- forwardRef + TypeScript

### 3.2 Input
**Créer** : `src/components/ui/Input.tsx`
- Style v0 : border-2, focus:ring-orange-500
- Variants : default, error
- forwardRef

### 3.3 Card
**Créer** : `src/components/ui/Card.tsx`
- bg-bg-base + border-neutral-800
- hover:border-neutral-700
- Composable : CardHeader, CardContent, CardFooter

## Phase 4 : Composants Métier

### 4.1 BrainDumpInput
**Créer** : `src/components/BrainDumpInput.tsx`
- Textarea large avec gradient border on focus
- Quick actions pills (exemples)
- Character count
- Submit button avec loading state
- Props : onSubmit, isLoading

### 4.2 ProjectCard
**Créer** : `src/components/ProjectCard.tsx`
- Image thumbnail (aspect-video)
- Status badge (package-ready vs draft)
- Title + description (line-clamp)
- Metrics : completion rate, features count, date
- Progress bar (gradient orange)
- Hover animation (translateY -4px)
- Link vers /project/[id]

### 4.3 FeatureCard
**Créer** : `src/components/FeatureCard.tsx`
- Icon + titre + description
- Stagger animation (pour grid BMAD)
- bg-neutral-900 + hover state

### 4.4 DeliverableCard
**Créer** : `src/components/DeliverableCard.tsx`
- Icon emoji large
- Title + description
- List items (context files, prompts, etc.)

## Phase 5 : Header Navigation

### 5.1 Header
**Créer** : `src/components/Header.tsx`
- Sticky top avec backdrop-blur
- Logo k3rn (gradient orange box + texte)
- Nav links : Templates, Features, Pricing, Docs
- CTA buttons : Connexion (ghost), Démarrer (primary)
- Responsive : hamburger menu mobile

## Phase 6 : Homepage Marketing

### 6.1 Hero Section
**Page** : `src/app/page.tsx`
- Titre géant (text-7xl/8xl) : "Idée. Structure. Code."
- Subtitle explaining value prop
- BrainDumpInput component
- Gradient background radial
- Animations fadeInUp stagger

### 6.2 Features BMAD Section
- Grid 3-col (2-col tablet, 1-col mobile)
- FeatureCard pour chaque étape BMAD
- Titre "Méthodologie BMAD"

### 6.3 Projects Gallery
- Grid 3-col ProjectCard
- "Voir tous les projets" button
- Données mock (3-6 projets exemples)

### 6.4 Livrables Showcase
- Grid 3-col DeliverableCard
- Context Files + Prompts Séquencés + Starter Kit

### 6.5 CTA Final
- Titre "Prêt à transformer ton idée ?"
- Large button "Commencer maintenant"

## Phase 7 : Responsive

### 7.1 Breakpoints
- Mobile : < 640px
- Tablet : 640px - 1024px
- Desktop : > 1024px

### 7.2 Adaptations
- Typography scale : H1 96px → 48px mobile
- Grid 3-col → 1-col mobile
- Padding 80px → 20px mobile
- Header : hamburger menu mobile

## Phase 8 : Dépendances

### À installer
```bash
npm install framer-motion clsx tailwind-merge
npm install -D @types/node
```

## Fichiers à créer/modifier

### Créer (nouveaux)
- src/styles/tokens.css
- src/lib/utils.ts
- src/lib/animations.ts
- src/lib/date.ts
- src/components/ui/Button.tsx
- src/components/ui/Input.tsx
- src/components/ui/Card.tsx
- src/components/BrainDumpInput.tsx
- src/components/ProjectCard.tsx
- src/components/FeatureCard.tsx
- src/components/DeliverableCard.tsx
- src/components/Header.tsx

### Modifier (existants)
- tailwind.config.ts (extend colors, spacing, etc.)
- src/app/globals.css (import tokens, reset)
- src/app/layout.tsx (import Header, mettre Header dans body)
- src/app/page.tsx (remplacer par homepage marketing)

### Supprimer (ancien app shell)
- src/components/shell/* (AppShell, SidebarNav, Topbar)
- src/app/(app)/* (toutes les routes app shell)

## Données Mock

### Projects (pour ProjectCard)
```typescript
const projects = [
  {
    id: '1',
    title: 'MediTrack Pro',
    description: 'App mobile santé connectée pour suivi patients',
    thumbnail: null,
    completionRate: 85,
    features: 12,
    status: 'package-ready',
    createdAt: new Date('2024-01-15')
  },
  // ... 2-5 autres projets
]
```

### BMAD Steps (pour FeatureCard)
```typescript
const bmadSteps = [
  {
    icon: '🎯',
    title: 'Business Model',
    description: 'Vision, marché cible, monétisation'
  },
  // ... 6 autres étapes
]
```

## Vérification

### 1. Visual QA
- [ ] Hero input ressemble à v0 (large, centré, gradient focus)
- [ ] ProjectCard hover = v0 template cards (-4px + shadow)
- [ ] Typography scale extrême (96px → 12px)
- [ ] Spacing cohérent (base 4px)
- [ ] Noir pur background (#000)

### 2. Responsive
- [ ] Mobile : hamburger menu fonctionne
- [ ] Tablet : grid 2-col projects
- [ ] Desktop : grid 3-col projects
- [ ] Typography scale down mobile

### 3. Performance
- [ ] npm run dev démarre sans erreur
- [ ] Pas de layout shift
- [ ] Animations 60fps
- [ ] Images lazy-load (Next Image)

### 4. Accessibilité
- [ ] Navigation clavier (Tab order)
- [ ] Focus states visibles (ring-orange-500)
- [ ] Contraste minimum 4.5:1
- [ ] Semantic HTML

## Ordre d'implémentation

1. **Jour 1** : Design Tokens + Tailwind config + utils
2. **Jour 2** : Composants UI core (Button, Input, Card)
3. **Jour 3** : BrainDumpInput + ProjectCard
4. **Jour 4** : Header + Homepage (hero + sections)
5. **Jour 5** : FeatureCard + DeliverableCard + données mock
6. **Jour 6** : Animations Framer Motion + polish
7. **Jour 7** : Responsive + tests + cleanup

## Notes Importantes

- **Dark mode only** : pas de toggle, noir pur uniquement
- **Langue** : français par défaut (lang="fr")
- **Capitalisation** : majuscules partout SAUF k3rn, k0, k1, etc.
- **Performance** : GPU acceleration sur animations
- **Gradients** : CSS gradients (pas images)
- **Fonts** : Geist (déjà installé)
