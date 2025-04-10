# AI Development Instructions for ThoughtKeeper

**Document Version:** 1.1
**Date:** 2024-06-08

## 1. Project Overview & Current State

**Goal:** ThoughtKeeper is a modern journaling application designed to help users preserve and organize their thoughts and reflections, enhanced with AI-powered insights.

**Tech Stack:**
*   Framework: Next.js 14 (App Router)
*   Language: TypeScript
*   Styling: Tailwind CSS
*   UI Components: shadcn/ui
*   Icons: lucide-react
*   Database: Supabase (PostgreSQL)
*   AI Backend: OpenAI API (via `openai` npm package)
*   Deployment: Netlify (via GitHub integration)
*   Code Storage: GitHub

**Core Features Implemented:**
*   Date-based journal entry creation, viewing, editing, and deletion.
*   Multiple entries allowed per day.
*   Basic sidebar navigation showing dates with entries (sorted chronologically).
*   Data persistence using **Supabase** database (replaces previous `localStorage` implementation).

**AI Features Implemented / Status:**
*   **Automatic Tag Generation:** Backend API (`/api/tags`) exists. Frontend integration is **currently disabled** following Supabase migration. Needs refactoring to call API and update Supabase entry after save.
*   **Macro Summary:** On-demand generation of a daily overview (mood, emoji, focus areas, key takeaway) via `/api/macro-summarize` (OpenAI backend) for the selected date's entries. Displayed in the sidebar when available. **Result is not saved to database.**
*   **Individual Entry Summary:** Backend API (`/api/summarize`) and frontend function (`handleGenerateSummary`) exist but are currently commented out/disabled. UI integration might be pending/incomplete.

**Deployment Status:**
*   Deployed to Netlify at `https://thoughtkeeper.netlify.app` (URL assumed from `netlify.toml`).
*   Continuous deployment from the `main` branch on GitHub.
*   Requires `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables set in Netlify.
*   Uses Node.js 20.x build environment on Netlify.

## 2. Key Decisions & Rationale

*   **Storage (Supabase):** Migrated from `localStorage` to Supabase (PostgreSQL) to provide persistent, reliable storage, address data loss risk, and enable future features (syncing, search, analytics). **Row Level Security (RLS) is currently DISABLED on the `entries` table** for initial setup and must be enabled with policies after authentication is implemented.
*   **AI Integration (OpenAI):** Leveraged OpenAI (`gpt-3.5-turbo`) for NLP tasks. API calls via Next.js API routes.
*   **Deployment (Netlify):** Selected for seamless integration.
*   **Security Headers (CSP):** Implemented via `next.config.js`. Includes Supabase URL (`connect-src`). `unsafe-eval` and `unsafe-inline` are still present and should be reviewed.

## 3. Future Development Considerations & Improvements (Ranked by Priority)

1.  **Implement Authentication & Row Level Security (RLS):** **HIGHEST PRIORITY.** Add user login (e.g., Supabase Auth) and enable/configure RLS policies on the `entries` table so users can only access their own data.
2.  **Refactor & Re-enable AI Features:** Update AI generation logic (`/api/tags`, `/api/summarize`) to interact with Supabase (update the `tags` and `summary` columns after generation). Re-enable frontend triggers.
3.  **Implement Search Functionality:** Add search capability leveraging the Supabase database.
4.  **Develop Journal Analytics:** Build analytics features (requires database).
5.  **Robust Error Handling:** Improve error handling for Supabase operations and API calls, providing better user feedback.
6.  **Refine AI Features (Cost/UX):** Consider cost optimization, caching, and UI improvements for AI features.
7.  **State Management:** Consider refactoring state management as app grows.
8.  **Offline Strategy:** Define offline behavior (Supabase has offline support options to explore, or simple read-only/caching).
9.  **Security Hardening (CSP):** Work towards removing `unsafe-eval`/`unsafe-inline` from CSP.

## 4. Critical Information & Risks

*   **Row Level Security (RLS): CURRENTLY DISABLED.** Enabling RLS with proper policies after implementing authentication is **CRITICAL** for data privacy and security. Without it, all entries are potentially publicly accessible via the anon key.
*   **`OPENAI_API_KEY` / Supabase Keys Security:** Keys MUST be kept secure (handled via Netlify env vars and `.env.local`, excluded from Git). **NEVER commit keys to Git.** Rotate keys periodically.
*   **API Costs (OpenAI):** Monitor usage, ensure OpenAI account limits/alerts are set. Risk of runaway calls partially mitigated by client-side button disabling; consider server-side rate limiting.
*   **Supply Chain Attacks:** Continue dependency auditing and use `npm ci`.
*   **Platform Security:** Use MFA/least privilege on GitHub/Netlify.
*   **CSP Maintenance:** Update CSP if new external resources are added.
*   **XSS Risk:** Rendering via React's default escaping is current mitigation. Avoid `dangerouslySetInnerHTML`. 