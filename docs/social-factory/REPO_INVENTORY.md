# Social Story Factory: Repo Inventory

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Shadcn UI
- **Rendering**: `@vercel/og` (Satori + resvg) already partially present/supported.
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Types**: TypeScript + Zod
- **Testing**: Vitest

## Brand Assets
- **Fonts**:
    - `Inter` (variable: `--font-sans`)
    - `Plus Jakarta Sans` (variable: `--font-jakarta`)
- **Colors (from `globals.css` / `tailwind.config.ts`)**:
    - Primary: HSL variables defined in root.
    - Theme: Dark mode by default (`<html lang="en" className="dark ...">`).
- **Logos**:
    - Found in `/public/logo-icon/`:
        - `logo.svg`
        - `logo_01.png`
        - `logo2.svg`
        - `favicon.ico`

## Folder Conventions
- UI Components: `src/components/ui`
- Business Logic: `src/lib`
- App Routes: `src/app`
- API Routes: `src/app/api`
