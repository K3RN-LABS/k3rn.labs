# Social Story Factory (Instagram Stories)

## Overview
The Social Story Factory is a deterministic tool for generating Instagram Stories (1080x1920) using `k3rn.labs` branding. It uses Satori and `@vercel/og` for server-side image generation.

## Features
- **AI Concept Generator (v2)**: Creative intent-to-story pipeline using LLM concept generation.
- **3 Templates**: Quote, Announcement, Checklist.
- **Safe Zones**: Automatic enforcement of Instagram UI safe zones (top/bottom 250px).
- **Deterministic Rendering**: Same JSON input results in the exact same image.
- **Internal Builder**: Live preview and editor at `/stories`.

## Structure
- `src/social-factory/ai`: AI Concept Generation module.
- `src/social-factory/schema`: Zod schemas and types.
- `src/social-factory/templates`: Satori-compatible React templates.
- `src/social-factory/brand`: Extraction of brand tokens and assets.
- `src/app/api/stories/render`: API endpoint for PNG rendering.
- `src/app/api/stories/generate`: API endpoint for AI concept generation.
- `src/app/(internal)/stories`: Builder UI.

## Usage

### 1. AI Generation (Recommended)
1. Navigate to `/stories`.
2. Enter your creative intent in the **AI Concept Generator** panel (e.g., "Announce the launch of K3RN Labs beta").
3. Click **Generate Visual Concepts**.
4. Select one of the 5 generated previews to load it into the editor.

### 2. Manual Editing
1. Select a template and fill in the fields manually.
2. Check the safe-zone overlay (red dashed areas) to ensure content is visible.
3. Click **Export Story** to download the PNG.

## API Endpoints

### `POST /api/stories/generate`
- Input: `prompt`, `tone` (optional), `variants` (optional).
- Returns: `{ concepts: StoryPayload[] }`.

### `POST /api/stories/render`
- Payload: `StoryPayload` (see `src/social-factory/schema/types.ts`).
- Returns: `image/png`.
