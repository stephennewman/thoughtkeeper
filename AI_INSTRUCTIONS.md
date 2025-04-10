# AI Development Instructions for ThoughtKeeper

**Document Version:** 1.9
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
*   Full-Text Search (FTS) across `content`, `meta_tag`, `intent_tag`, and content `tags` using a `tsvector` column (`search_vector`) and Supabase `textSearch`.
*   Conditional tag display & filtering based on frequency for all tag types.
*   Filter state displayed as dismissible badge.
*   Integrated Header (Title, FTS Search Input).
*   Rich Text Editor (TipTap) for *new* entries w/ basic toolbar & styling.
*   Entry list display using styled cards with:
    *   Subtle hover effect.
    *   "More Options" (ellipsis) menu for Edit/Delete actions (replaces hover buttons).
    *   Metadata footer (Time, Tags).
*   Basic mobile responsiveness (collapsible sidebar via Sheet).

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
*   **Search:** Implemented using PostgreSQL Full-Text Search (`tsvector`) across multiple fields (`content`, `meta_tag`, `intent_tag`, `tags`) for performance and accuracy. Trigger automatically updates `search_vector` column.
*   **Entry Card Interactions:** Edit/Delete actions moved to a DropdownMenu (ellipsis icon) to avoid accidental triggers and improve mobile UX. Direct card click no longer triggers edit.
*   **Filtering UX:** Active tag filter displayed as a dismissible badge for better visibility. Filter persistence logic simplified.

## 3. Future Development Considerations & Improvements (Internal Risk/Value Priority)

1.  **Implement Authentication & Row Level Security (RLS):** **(Postponed)** Essential for security & multi-user.
2.  **Complete Rich Text Editing:** Refactor edit mode.
3.  **Refine AI Features:** Integrate summary saving, optimize costs.
4.  **Improve Mobile Responsiveness:** Polish header/content layout, test across sizes.
5.  **Robust Error Handling:** Improve user feedback.
6.  **Develop Journal Analytics.**
7.  **Tag Management Interface.**
8.  **Export Entries.**
9.  **Security Hardening (CSP).**
10. **Offline Strategy.**
11. **State Management.**

## 4. Critical Information & Risks (Internal Focus - Notify User if Score >= 70)

*   **Row Level Security (RLS): INTENTIONALLY DISABLED (Score: 90/100).** Top internal risk. Exposes all data via anon key. MUST BE ENABLED with Auth/policies before sharing or multi-user.
*   **AI Feature Dependency & Cost (Score: ~65/100):** Increased slightly due to more API calls per save.
*   **Runaway API Cost Vulnerability (Score: ~55/100):** Risk of excessive calls. Partially mitigated by client-side guards & external OpenAI limits.
*   **Error Handling Gaps (Score: ~40/100):** Slightly reduced due to clearer filter state.
*   **Responsiveness Gaps (Score: ~35/100):** Improved structure, but detailed polish still needed.
*   **`OPENAI_API_KEY` / Supabase Keys Security:** Keys MUST be kept secure. Rotate periodically.
*   **Supply Chain Attacks:** Risk reduced but present. Monitor Dependabot alerts.
*   **XSS Risk:** Low currently. Avoid `dangerouslySetInnerHTML`.
*   **CSP Maintenance:** Update if new external resources added.
*   **Search:** Performance greatly improved with FTS. Accuracy depends on FTS configuration ('english') and query type ('websearch').
*   **RTE Edit Mode:** Saving edits will currently strip formatting.