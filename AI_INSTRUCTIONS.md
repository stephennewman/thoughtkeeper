# AI Development Instructions for ThoughtKeeper

**Document Version:** 1.5
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
*   Basic text search across entry content and tags.
*   Conditional tag display: Tags appearing on multiple currently loaded entries are highlighted and clickable for filtering.
*   Integrated Header with Title and Search Input.
*   Rich Text Editor (TipTap) for new entries with basic toolbar (Bold, Italic, Strike, Lists).
*   Entry list display using subtle cards with hover actions (Edit/Delete) and metadata footer (Time, Tags).

**AI Features Implemented / Status:**
*   **Automatic Tag Generation:** Backend API (`/api/tags`) exists. Frontend generates tags on save and updates the Supabase entry. Includes loading state.
*   **Macro Summary:** On-demand generation via `/api/macro-summarize`. **Result is not saved to database.**
*   **Individual Entry Summary:** Backend API (`/api/summarize`) and frontend function (`handleGenerateSummary`) exist but are currently commented out/disabled.

**Deployment Status:**
*   Deployed to Netlify at `https://thoughtkeeper.netlify.app` (URL assumed from `netlify.toml`).
*   Continuous deployment from the `main` branch on GitHub.
*   Requires `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables set in Netlify.
*   Uses Node.js 20.x build environment on Netlify. Build command uses `npm ci`.

## 2. Key Decisions & Rationale

*   **Storage (Supabase):** Migrated from `localStorage`. **RLS is intentionally DISABLED** (postponed, see Risks).
*   **AI Integration (OpenAI):** Using `gpt-3.5-turbo` via API routes. Tag generation updates Supabase entry.
*   **Deployment (Netlify):** Using CI/CD from `main` branch with `npm ci`.
*   **Security Headers (CSP):** Implemented via `next.config.js`. Includes Supabase URL. `unsafe-eval`/`unsafe-inline` still present.
*   **Dependency Security:** Updated `next` to patch critical vulns. Using `npm ci` in builds. Dependabot alerts enabled on GitHub repo.
*   **Tag Interaction:** Tags are displayed conditionally. Only tags appearing >1 time in the current result set are highlighted (blue) and clickable. Clicking filters entries by that tag using `supabase.contains()`. Search clears tag filters and vice-versa.
*   **UI Layout:** Integrated header for search/global actions. Main view uses sidebar + content area. Entry list uses subtle bordered cards with hover actions and footer metadata. CSS overrides applied to `prose` for tighter list/paragraph spacing.
*   **Rich Text Editor (RTE):** Implemented using TipTap `StarterKit` for new entries. Basic toolbar added. Edit mode still uses plain text (needs refactor).

## 3. Future Development Considerations & Improvements (Internal Risk Priority)

1.  **Implement Authentication & Row Level Security (RLS):** **(Postponed)** Essential for multi-user support and proper data security.
2.  **Complete Rich Text Editing:** Refactor edit mode to fully support RTE. Add more toolbar options (headings, links?).
3.  **Refine AI Features (Cost/UX/Completion):** Integrate individual summary saving, consider cost optimization.
4.  **Robust Error Handling:** Improve user feedback for Supabase and AI API operations.
5.  **Implement Full-Text Search Properly:** Set up `tsvector` column/triggers.
6.  **Develop Journal Analytics:** Build analytics features.
7.  **Tag Management Interface:** Allow viewing all tags, editing/deleting tags.
8.  **Export Entries:** Add data export functionality.
9.  **Security Hardening (CSP):** Work towards removing `unsafe-eval`/`unsafe-inline`.
10. **Offline Strategy:** Define offline behavior.
11. **State Management:** Consider refactoring.

## 4. Critical Information & Risks (Internal Focus)

*   **Row Level Security (RLS): INTENTIONALLY DISABLED.** Top internal risk. Acceptable temporarily for personal use, but **MUST BE ENABLED** with Auth/policies before sharing or multi-user. Exposes all data via anon key.
*   **API Costs / Runaway Calls (OpenAI):** Monitor usage, ensure OpenAI limits/alerts set. Client-side guards partially mitigate runaway calls; consider server-side rate limiting for more robustness.
*   **Error Handling Gaps:** Potential for confusing user experience if Supabase or AI calls fail silently or with poor feedback.
*   **`OPENAI_API_KEY` / Supabase Keys Security:** Keys MUST be kept secure (Netlify env vars / `.env.local`). **NEVER commit keys.** Rotate periodically.
*   **Supply Chain Attacks:** Risk reduced by patching `next`, using `npm ci`, and enabling Dependabot alerts. Continue monitoring alerts and vetting dependencies.
*   **XSS Risk:** Low currently due to React defaults + CSP. Avoid `dangerouslySetInnerHTML`.
*   **CSP Maintenance:** Update CSP if new external resources are added.
*   **Search Performance/Accuracy:** Current search uses `ilike` + `contains`. Consider implementing proper FTS with `tsvector` for better performance and relevance, especially as data grows.
*   **RTE Edit Mode:** Editing existing entries currently doesn't use the rich text editor; saving edits might strip formatting.