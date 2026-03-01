# WindBoost Project Memory

## Project Structure
- **Next.js 15.5.12** with App Router + React 19
- **SQLite** database (better-sqlite3) with FTS5 for search
- **Zustand** for state management with persist middleware
- Main pages: `/` (Skills), `/sources` (Skill Sources), `/ticketpack` (TicketPack Generator)

## Cache Management (CRITICAL)
**Problem**: Next.js cache corruption causes "Cannot find module" errors after commits/modifications

**Solution**: Always use `npm run dev:clean` instead of `npm run dev`
- Script location: `scripts/clean-next-cache.sh`
- Full docs: `CACHE_MANAGEMENT.md`
- Clean cache after: component changes, new pages, layout modifications, import restructuring

## Completed Features

### 1. Skill Sources Subsystem (4 blocks)
- External skill indexing from GitHub repositories
- Database: `skill_sources`, `external_skill_refs` tables
- GitHub sync with frontmatter parsing
- UI: `/sources` page for management
- Integration: Skills search includes external sources, TicketPack resolution protocol

### 2. Project Context Analyzer v1 (5 blocks + Refactor)
**Status**: ✅ PRODUCTION READY (Refactored to Structured Context)

**Purpose**: Transform WindBoost from generic to contextual generator by auto-analyzing GitHub repos

**Implementation**:
- `src/lib/project-context/` - Core analyzer (types, GitHub client, detectors, summarizer)
- `src/app/api/project-context/analyze/route.ts` - POST endpoint
- TicketPack page - "🔍 Analyser le repo" button (section 2)

**Constraints** (all enforced):
- NO LLM - deterministic detection only
- 5MB max tree metadata
- 10s timeout
- 24h in-memory cache
- Template-based notes generation

**Structured Context** (Refactor - Commit 3803800):
- **Source of truth**: `StructuredProjectContext` object
- **Confidence score**: 0-100 based on detection quality (high=20pts, medium=10pts, low=5pts)
- **Runtime enum**: "node" | "edge" | "browser"
- **Detection sources**: ["package.json", "file structure"]
- **Derived notes**: Markdown generated FROM structured data
- **Generator integration**: Uses detected stack if confidence >= 60%
- **Backward compatible**: Legacy fields maintained

**Detects**:
- Frameworks (16+): Next.js, React, Angular, Vue, Express, NestJS, etc.
- Languages: TypeScript, JavaScript
- Runtimes: Node.js, Bun, Deno
- Architecture patterns: DDD, Clean, Hexagonal, MVC, App Router, etc.
- ORMs, databases, state management, build tools, test frameworks

**API Response**:
```json
{
  "success": true,
  "context": {
    "structured": {
      "language": "JavaScript",
      "runtime": "node",
      "confidenceScore": 40,
      "detectionSources": ["package.json"]
    },
    "notes": "**Stack technique:** JavaScript + (node)\n*Score de confiance: 40%*"
  }
}
```

**Generator Workflow**:
- If `confidenceScore >= 60%`: Use detected stack, inject into prompt, enhance skill recommendations
- If `< 60%`: Use default stack based on deliverable type

**Docs**: `PROJECT_CONTEXT_ANALYZER.md`, `STRUCTURED_CONTEXT_REFACTOR.md`

## Development Workflow
1. Use `npm run dev:clean` to start (not `npm run dev`)
2. After major changes, run `npm run clean:next` if needed
3. Atomic commits - one business block per commit
4. TypeScript strict mode - always define types

## SSR Safety Pattern
Always add fallbacks for Zustand store values:
```typescript
const targetRepoContext = ticketDraft.targetRepoContext || {};
```

## Git Commits (Reference)
Recent atomic blocks:
- e2670ae - Context Analyzer Block 1 (Types + GitHub client)
- 81b839e - Context Analyzer Block 2 (Detectors)
- ca3762c - Context Analyzer Block 3 (Summarizer)
- 4bcb3fe - Context Analyzer Block 4 (API endpoint)
- 26e342f - Context Analyzer Block 5 (UI integration)
