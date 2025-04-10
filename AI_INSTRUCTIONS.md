# AI Development Instructions for ThoughtKeeper

**Document Version:** 2.0
**Date:** 2024-06-09

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
*   Date-based journal entry creation, viewing, editing, and deletion via **Dialog Modal**.
*   Multiple entries allowed per day.
*   Basic sidebar navigation showing dates with entries (sorted chronologically).
*   Data persistence using **Supabase** database.
*   Dual Tagging System:
    *   **Meta Tags:** Topic/life domain (e.g., Work, Health), auto-generated, stored in `meta_tag` (case preserved).
    *   **Intent Tags:** Entry purpose (e.g., Action Item, Log), auto-generated, stored in `intent_tag` (case preserved).
    *   **Content Tags:** Keyword tags based on content, auto-generated, stored **lowercase** in `tags` (jsonb array).
*   Full-Text Search (FTS) across `content`, `meta_tag`, `intent_tag`, and content `tags` using a `tsvector` column (`search_vector`) and Supabase `textSearch`.
*   Conditional tag display & filtering based on frequency (case-insensitive counting).
*   **Unique color highlighting** for frequently occurring tags within each type (Meta, Intent, Content).
*   Filter state displayed as dismissible badge.
*   Integrated Header (Title, FTS Search Input, **Add Entry Button**).
*   Rich Text Editor (TipTap) used within the entry editor dialog (for both Add and Edit).
*   Entry list display using styled cards with:
    *   Subtle hover effect.
    *   "More Options" (ellipsis) menu for Edit/Delete actions.
    *   Metadata footer (Time, Tags).
    *   **Loading indicator** on new entries while tags are generated.
*   Basic mobile responsiveness (collapsible sidebar via Sheet).

**AI Features Implemented / Status:**
*   **Meta Tag Classification:** API route (`/api/classify-meta`) exists. Generated on *new* entry save and stored.
*   **Intent Tag Classification:** API route (`/api/classify-intent`) exists. Generated on *new* entry save and stored.
*   **Content Tag Generation:** API route (`/api/tags`) exists. Generated on *new* entry save and stored (lowercase).
*   **Macro Summary:** On-demand generation via `/api/macro-summarize`. Result is not saved to database.
*   **Individual Entry Summary:** Backend API (`/api/summarize`) and frontend function exist but disabled.
*   **NOTE:** Tag re-generation on *edit* is currently **not** implemented.

**Deployment Status:**
*   Deployed to Netlify at `https://thoughtkeeper.netlify.app` (URL assumed from `netlify.toml`).
*   Continuous deployment from the `main` branch on GitHub.
*   Requires `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables set in Netlify.
*   Uses Node.js 20.x build environment on Netlify. Build command uses `npm ci`.

## 2. Key Decisions & Rationale

*   **Storage (Supabase):** Migrated from `localStorage`. **RLS is intentionally DISABLED** (postponed, see Risks).
*   **AI Integration (OpenAI):** Using `gpt-3.5-turbo` via API routes for tag generation on *new* saves.
*   **Deployment (Netlify):** Using CI/CD from `main` branch with `npm ci`.
*   **Security Headers (CSP):** Implemented via `next.config.js`. Includes Supabase URL. `unsafe-eval`/`unsafe-inline` still present.
*   **Dependency Security:** Updated `next` to patch critical vulns. Using `npm ci` in builds. Dependabot alerts enabled on GitHub repo.
*   **Tag Interaction:** Meta/Intent/Content tags rendered distinctly. Tags appearing >1 time highlighted with unique, persistent colors per tag value *within* each type (based on case-insensitive count). Clicking filters entries. Search clears tag filters and vice-versa.
*   **Tag Storage:** Meta/Intent tags stored with original casing. Content tags stored as **lowercase**.
*   **UI Layout:** Integrated header with Add(+) button. Collapsible sidebar structure for mobile. Styled cards for entries. CSS overrides for RTE spacing.
*   **Rich Text Editor (RTE):** Implemented using TipTap `StarterKit` within a shared **`EntryEditorDialog`** component for both adding and editing entries.
*   **Search:** PostgreSQL FTS (`tsvector`) across multiple fields.
*   **Entry Card Interactions:** Edit/Delete actions in DropdownMenu. Edit now opens the `EntryEditorDialog`.
*   **Filtering UX:** Active tag filter displayed as dismissible badge.
*   **Entry Input UX:** Moved from always-visible input to a **Header Button (`+`) triggering a Dialog Modal** for better mobile UX and cleaner main view.

## 3. Future Development Considerations & Improvements (Internal Risk/Value Priority)

1.  **Implement Authentication & Row Level Security (RLS):** **(Postponed)** Essential for security & multi-user.
2.  **Complete Rich Text Editing:** Ensure formatting is preserved correctly when *saving edits* (currently uses basic HTML save).
3.  **Refine AI Features:** Integrate summary saving, consider tag re-generation on edit, optimize costs.
4.  **Improve Mobile Responsiveness:** Polish header/content layout, test across sizes.
5.  **Robust Error Handling:** Improve user feedback, especially for API errors.
6.  **Develop Journal Analytics.**
7.  **Tag Management Interface.**
8.  **Export Entries.**
9.  **Security Hardening (CSP).**
10. **Offline Strategy.**
11. **State Management.**

## 4. Critical Information & Risks (Internal Focus - Notify User if Score >= 70)

*   **Row Level Security (RLS): INTENTIONALLY DISABLED (Score: 90/100).** Top internal risk. Exposes all data via anon key. MUST BE ENABLED with Auth/policies before sharing or multi-user.
*   **AI Feature Dependency & Cost (Score: ~60/100):** Slightly reduced as tag gen only happens on new saves now.
*   **Runaway API Cost Vulnerability (Score: ~50/100):** Risk remains but slightly lower frequency.
*   **Error Handling Gaps (Score: ~40/100):** No major change.
*   **Responsiveness Gaps (Score: ~35/100):** Editor now in dialog, potentially better but needs testing.
*   **`OPENAI_API_KEY` / Supabase Keys Security:** Keys MUST be kept secure. Rotate periodically.
*   **Supply Chain Attacks:** Risk reduced but present. Monitor Dependabot alerts.
*   **XSS Risk:** Low currently. Avoid `dangerouslySetInnerHTML`.
*   **CSP Maintenance:** Update if new external resources added.
*   **Search:** Performance relies on FTS config.
*   **RTE Edit Mode:** Formatting preservation on *save* needs verification/implementation.