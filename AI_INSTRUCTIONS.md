# AI Development Instructions for ThoughtKeeper

**Document Version:** 1.6
**Date:** 2024-06-08

**AI Collaboration Note:** Continuously analyze for problems/risks. Notify the user if any internal/controllable risk score is assessed at 70/100 or higher.

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
*   Conditional tag display & filtering based on frequency.
*   Integrated Header (Title, Search).
*   Rich Text Editor (TipTap) for *new* entries w/ basic toolbar & spacing fixes.
*   Entry list display using styled cards w/ hover actions & metadata footer.
*   Basic mobile responsiveness (collapsible sidebar structure via Sheet).

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
*   **UI Layout:** Integrated header. Collapsible sidebar structure for mobile. Styled cards for entries. CSS overrides for RTE spacing.
*   **Rich Text Editor (RTE):** Implemented using TipTap `StarterKit` for new entries.

## 3. Future Development Considerations & Improvements (Internal Risk/Value Priority)

1.  **Implement Authentication & Row Level Security (RLS):** **(Postponed)** Essential for security & multi-user.
2.  **Complete Rich Text Editing:** Refactor edit mode. Add toolbar options.
3.  **Refine AI Features:** Integrate summary saving, optimize costs.
4.  **Robust Error Handling:** Improve user feedback.
5.  **Improve Mobile Responsiveness:** Polish header/content layout on small screens, ensure usability.
6.  **Implement Full-Text Search Properly:** Use `tsvector`.
7.  **Develop Journal Analytics:** Build data insights.
8.  **Tag Management Interface:** Add tag editing/browsing.
9.  **Export Entries:** Add data export.
10. **Security Hardening (CSP):** Remove `unsafe-eval`/`unsafe-inline`.
11. **Offline Strategy:** Define offline behavior.
12. **State Management:** Consider refactoring.

## 4. Critical Information & Risks (Internal Focus - Notify User if Score >= 70)

*   **Row Level Security (RLS): INTENTIONALLY DISABLED (Score: 90/100).** Top internal risk. Exposes all data via anon key. MUST BE ENABLED with Auth/policies before sharing or multi-user.
*   **AI Feature Dependency & Cost (Score: ~65/100):** Reliance on OpenAI introduces cost, reliability, latency factors.
*   **Runaway API Cost Vulnerability (Score: ~55/100):** Risk of excessive calls. Partially mitigated by client-side guards & external OpenAI limits.
*   **Error Handling Gaps (Score: ~45/100):** Potential for confusing UX on failures.
*   **Responsiveness Gaps (Score: ~40/100):** Basic structure exists, but needs refinement for mobile usability (header, content flow).
*   **`OPENAI_API_KEY` / Supabase Keys Security:** Keys MUST be kept secure. Rotate periodically.
*   **Supply Chain Attacks:** Risk reduced but present. Monitor Dependabot alerts.
*   **XSS Risk:** Low currently. Avoid `dangerouslySetInnerHTML`.
*   **CSP Maintenance:** Update if new external resources added.
*   **Search Performance/Accuracy:** Current search uses `ilike` + `contains`. Consider FTS.
*   **RTE Edit Mode:** Saving edits will currently strip formatting.