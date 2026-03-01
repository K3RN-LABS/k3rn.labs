# K3rn.labs Project Memory

## Project Structure
- Platform code lives in `k3rn-platform/` subdirectory (NOT at repo root)
- Next.js 16.1.6 with Turbopack, React 19, TypeScript strict
- Anthropic SDK `@anthropic-ai/sdk` v0.74.0 for Claude API
- Dark theme: bg `#22242B`, secondary `#2F323A`, border `#3A3D45`, accent `#F75105`

## Key Patterns
- **localStorage keys**: `k3rn_projects` (array), `k3rn_active_project` (single), `k3rn_current_idea` (text)
- **StoredProject** interface in `src/hooks/use-project.ts` — canonical shape for project data
- **AnalysisOutput** types in `src/lib/analysis/types.ts`
- **6 axes**: problem, market, differentiation, feasibility, business, founder_fit
- **Decisions**: GO (≥70), EXPLORE (50-70), PARK (30-50), KILL (<30)
- **Score normalization**: Some mock projects use 0-10 scale, multiply by 10 for 0-100

## Lab Architecture (Implemented)
- Lab 1 (Discovery): DiscoveryPanel + DiscoveryWorkspace + ExpertChat(Ava)
- Lab 2 (Structuration): StructurationPanel + StructurationWorkspace + ExpertChat(Marcus)
- Expert chat streams via `/api/expert-chat` SSE endpoint
- Chat persistence: `k3rn_chat_{labType}_{projectId}`
- Hypotheses: `k3rn_lab1_hypotheses_{projectId}`
- BMC/Actions/Milestones: `k3rn_lab2_bmc_`, `k3rn_lab2_actions_`, `k3rn_lab2_milestones_`

## Environment
- `ANTHROPIC_API_KEY` in `.env.local`
- `EXPERT_CHAT_MODEL` defaults to `claude-sonnet-4-20250514`
- `AI_MODEL` for analysis defaults to `claude-opus-4-20250918`
