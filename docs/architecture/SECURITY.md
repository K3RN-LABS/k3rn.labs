# Security Design & Practices — K3RN Labs

## 1. Environment & Secrets
All sensitive configuration is managed via environment variables and validated at runtime using Zod in `src/lib/env.ts`.

- **Supabase**: `SERVICE_ROLE_KEY` is restricted to server-side environments.
- **n8n Connectivity**: 
    - URLs are configured via `N8N_GUICHET_URL` and `N8N_LLM_PROXY_URL`.
    - Internal webhook calls are authenticated using `X-N8N-Secret`.

## 2. API Security
- **Ingestion Route**: `/api/dossiers/[id]/ingest` implements mandatory header validation for `X-N8N-Secret` to prevent unauthorized data injection.
- **Idempotency**: All ingestion operations use SHA-256 based idempotency keys (dossierId + messageId) to prevent duplicate processing.

## 3. Data Integrity
- **Zod Validation**: All incoming API requests and environment variables are strictly typed and validated.
- **Supabase RLS**: Row Level Security is enforced at the database level to ensure data isolation between dossiers.

## 4. Media & Storage
- **Public Avatars**: The `avatars` bucket in Supabase is configured for public read access to allow optimized delivery via Next.js `Image`. 
- **Upload Integrity**: All user-provided images are processed client-side via `Canvas` to strip metadata (EXIF) and normalize formats before server-side storage.

## 5. Referral & Affiliate Security
- **OG Generation**: Dynamic OpenGraph images are generated server-side using a sandboxed Edge Runtime to prevent SSRF vulnerabilities.
- **Referral Cookies**: Attribution is handled via signed cookies (`k3rn_referral`) to ensure integrity throughout the application journey.

## 6. Exclusion Policy
- **.gitignore**: Strictly excludes `.env`, `.claude/`, `.gemini/`, and other local/AI artifacts from version control.
