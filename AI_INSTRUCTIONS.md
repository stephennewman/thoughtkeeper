# AI Development Instructions for ThoughtKeeper

**Document Version:** 1.7
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
*   Dual Tagging System:
    *   **Meta Tags:** Topic/life domain (e.g., Work, Health), auto-generated, stored in `meta_tag`.
    *   **Intent Tags:** Entry purpose (e.g., Action Item, Log), auto-generated, stored in `intent_tag`.
    *   **Content Tags:** Keyword tags based on content, auto-generated, stored in `tags` (jsonb array).
*   Basic text search across entry `content` and content `tags`.
*   Conditional tag display & filtering: All tag types (Meta, Intent, Content) appearing >1 time in the current list are styled distinctly and clickable for filtering.
*   Integrated Header (Title, Search).
*   Rich Text Editor (TipTap) for *new* entries w/ basic toolbar & spacing fixes.
*   Entry list display using styled cards w/ hover actions & metadata footer (displays Meta, Intent, Content tags).
*   Basic mobile responsiveness (collapsible sidebar).

**AI Features Implemented / Status:**
*   **Meta Tag Classification:** API route (`/api/classify-meta`) exists. Generated on save and stored.
*   **Intent Tag Classification:** API route (`/api/classify-intent`) exists. Generated on save and stored.
*   **Content Tag Generation:** API route (`/api/tags`) exists. Generated on save and stored.
*   **Macro Summary:** On-demand generation via `/api/macro-summarize`. **Result is not saved to database.**
*   **Individual Entry Summary:** Backend API (`/api/summarize`) and frontend function (`handleGenerateSummary`) exist but are currently commented out/disabled.

**Deployment Status:**
*   Deployed to Netlify at `https://thoughtkeeper.netlify.app` (URL assumed from `netlify.toml`).
*   Continuous deployment from the `main` branch on GitHub.
*   Requires `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables set in Netlify.
*   Uses Node.js 20.x build environment on Netlify. Build command uses `npm ci`.

## 2. Key Decisions & Rationale

*   **Storage (Supabase):** Migrated from `localStorage`. **RLS is intentionally DISABLED** (postponed, see Risks).
*   **AI Integration (OpenAI):** Using `gpt-3.5-turbo` via API routes for Meta, Intent, and Content tag generation.
*   **Deployment (Netlify):** Using CI/CD from `main` branch with `npm ci`.
*   **Security Headers (CSP):** Implemented via `next.config.js`. Includes Supabase URL. `unsafe-eval`/`unsafe-inline` still present.
*   **Dependency Security:** Updated `next` to patch critical vulns. Using `npm ci` in builds. Dependabot alerts enabled on GitHub repo.
*   **Tag Interaction:** Meta, Intent, and Content tags rendered distinctly. Tags appearing >1 time in current list are highlighted (different colors per type) and clickable. Clicking filters entries by that specific tag and type using `supabase.eq()` (for Meta/Intent) or `supabase.contains()` (for Content). Search clears tag filters and vice-versa.
*   **UI Layout:** Integrated header. Collapsible sidebar structure for mobile. Styled cards for entries. CSS overrides for RTE spacing.
*   **Rich Text Editor (RTE):** Implemented using TipTap `StarterKit` for new entries.

## 3. Future Development Considerations & Improvements (Internal Risk/Value Priority)

1.  **Implement Authentication & Row Level Security (RLS):** **(Postponed)** Essential for security & multi-user.
2.  **Complete Rich Text Editing:** Refactor edit mode. Add toolbar options.
3.  **Refine AI Features:** Integrate summary saving, optimize costs, potentially allow manual tag editing.
4.  **Refine Filtering:** Allow combining filters (e.g., Meta + Intent)? Improve UI.
5.  **Robust Error Handling:** Improve user feedback.
6.  **Improve Mobile Responsiveness:** Polish layout.
7.  **Implement Full-Text Search Properly:** Use `tsvector`.
8.  **Develop Journal Analytics:** Build data insights (now richer with Meta/Intent tags).
9.  **Tag Management Interface:** Add tag editing/browsing.
10. **Export Entries:** Add data export.
11. **Security Hardening (CSP):** Remove `unsafe-eval`/`unsafe-inline`.
12. **Offline Strategy:** Define offline behavior.
13. **State Management:** Consider refactoring.

## 4. Critical Information & Risks (Internal Focus - Notify User if Score >= 70)

*   **Row Level Security (RLS): INTENTIONALLY DISABLED (Score: 90/100).** Top internal risk. Exposes all data via anon key. MUST BE ENABLED with Auth/policies before sharing or multi-user.
*   **AI Feature Dependency & Cost (Score: ~65/100):** Increased slightly due to more API calls per save.
*   **Runaway API Cost Vulnerability (Score: ~55/100):** Risk of excessive calls. Partially mitigated by client-side guards & external OpenAI limits.
*   **Error Handling Gaps (Score: ~45/100):** Potential for confusing UX on failures.
*   **Responsiveness Gaps (Score: ~40/100):** Basic structure exists, but needs refinement for mobile usability (header, content flow).
*   **`OPENAI_API_KEY` / Supabase Keys Security:** Keys MUST be kept secure. Rotate periodically.
*   **Supply Chain Attacks:** Risk reduced but present. Monitor Dependabot alerts.
*   **XSS Risk:** Low currently. Avoid `dangerouslySetInnerHTML`.
*   **CSP Maintenance:** Update if new external resources added.
*   **Search Performance/Accuracy:** Current search uses `ilike` + `contains`. Consider FTS.
*   **RTE Edit Mode:** Saving edits will currently strip formatting.