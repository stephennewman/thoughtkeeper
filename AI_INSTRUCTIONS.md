# AI Development Instructions for ThoughtKeeper

**Document Version:** 2.1
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
*   **Layout:** Three-column layout on large screens (Sidebar Navigation, Main Content, Static Analysis).
*   Date-based journal entry creation, viewing, editing, and deletion via **Dialog Modal**.
*   Multiple entries allowed per day.
*   Basic sidebar navigation showing dates with entries (sorted chronologically).
*   Data persistence using **Supabase** database.
*   Dual Tagging System:
    *   **Meta Tags:** Topic/life domain (e.g., Work, Health), auto-generated, stored in `meta_tag` (case preserved, rendered uppercase).
    *   **Intent Tags:** Entry purpose (e.g., Action Item, Log), auto-generated, stored in `intent_tag` (case preserved).
    *   **Content Tags:** Keyword tags based on content, auto-generated, stored **lowercase** in `tags` (jsonb array).
*   Full-Text Search (FTS) across `content`, `meta_tag`, `intent_tag`, and content `tags`.
*   Conditional tag display & filtering based on frequency (case-insensitive counting).
*   **Unique color highlighting** for frequently occurring tags within each type (Meta, Intent, Content).
*   **Main Content Controls:** Top row includes active filter display, search input, and "+ Add Entry" button.
*   Integrated Header (Title only).
*   Rich Text Editor (TipTap) used within the entry editor dialog (for both Add and Edit).
*   Entry list display using styled cards with:
    *   Subtle hover effect, standard border.
    *   "More Options" (ellipsis) menu for Edit/Delete actions.
    *   Metadata footer (Time, Tags).
    *   **Loading indicator** on new entries while tags are generated.
*   Basic mobile responsiveness (collapsible sidebar via Sheet, analysis column hidden).
*   **Static Analysis Column:** Displays placeholder content (Total Entries).

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
*   **UI Layout:** **Three-column layout** (Sidebar, Content, Analysis). Integrated header simplified (Title only). **Content controls (Filter status, Search, Add Button) moved to top of content column.**
*   **Rich Text Editor (RTE):** Implemented using TipTap `StarterKit` within a shared **`EntryEditorDialog`** component for both adding and editing entries.
*   **Search:** PostgreSQL FTS (`tsvector`) across multiple fields.
*   **Entry Card Interactions:** Edit/Delete actions in DropdownMenu. Edit now opens the `EntryEditorDialog`.
*   **Filtering UX:** Active tag filter displayed as dismissible badge.
*   **Entry Input UX:** Moved to "+ Add Entry" button in content column.

## 3. Future Development Considerations & Improvements (Internal Risk/Value Priority)

1.  **Implement Authentication & Row Level Security (RLS):** **(Postponed)** Essential for security & multi-user.
2.  **Populate Static Analysis Column:** Implement meaningful analysis (tag clouds, trends, etc.).
3.  **Complete Rich Text Editing:** Ensure formatting preservation on edit save.
4.  **Refine AI Features:** Integrate summary saving, consider tag re-gen on edit, optimize costs.
5.  **Improve Mobile Responsiveness:** Thorough testing, potential specific layouts.
6.  **Robust Error Handling:** User feedback, API errors.
7.  **Sidebar Navigation:** Implement calendar or date list for navigation.
8.  **Develop Journal Analytics.**
9.  **Tag Management Interface.**
10. **Export Entries.**
11. **Security Hardening (CSP).**
12. **Offline Strategy.**
13. **State Management.**

## 4. Critical Information & Risks (Internal Focus - Notify User if Score >= 70)

*   **Row Level Security (RLS): INTENTIONALLY DISABLED (Score: 90/100).** Top internal risk. Exposes all data via anon key. MUST BE ENABLED with Auth/policies before sharing or multi-user.
*   **AI Feature Dependency & Cost (Score: ~60/100):** Slightly reduced as tag gen only happens on new saves now.
*   **Runaway API Cost Vulnerability (Score: ~50/100):** Risk remains but slightly lower frequency.
*   **Error Handling Gaps (Score: ~40/100):** No major change.
*   **Responsiveness Gaps (Score: ~35/100):** Added 3rd column, needs mobile testing.
*   **`OPENAI_API_KEY` / Supabase Keys Security:** Keys MUST be kept secure. Rotate periodically.
*   **Supply Chain Attacks:** Risk reduced but present. Monitor Dependabot alerts.
*   **XSS Risk:** Low currently. Avoid `dangerouslySetInnerHTML`.
*   **CSP Maintenance:** Update if new external resources added.
*   **Search:** Performance relies on FTS config.
*   **RTE Edit Mode:** Formatting preservation on *save* needs verification/implementation.

## Known Risks / Assumptions

*   **RLS Disabled (90/100 Risk):** Row Level Security is currently disabled in Supabase. This is the highest priority technical debt to address. Anyone with the anon key could potentially access or modify data.
*   **AI Cost/Latency:** Reliance on external AI APIs (Groq, potentially others) introduces potential costs and latency. Need monitoring and potential optimization (e.g., caching, selective generation).
*   **Scalability:** Current data fetching (all entries initially) might not scale well. Needs testing with larger datasets. Tsvector helps search, but filtering/sorting needs review.
*   **Editor Complexity:** TipTap is powerful but can be complex. Saving HTML is straightforward, but managing complex states or custom nodes might require more effort.
*   **API Key Security:** Ensure `NEXT_PUBLIC_` variables are appropriate and server-side keys are handled securely (e.g., in API routes, not exposed to the client).

## Codebase Analysis (Quantified) - As of [Current Date/Version - Assistant to Update]

This analysis was performed by the AI assistant based on a review of key files (`page.tsx`, `EntryEditorDialog.tsx`, `RichTextEditor.tsx`, `supabaseClient.ts`) on [Date].

1.  **Row Level Security (RLS) Not Implemented:**
    *   **Problem:** Critical security vulnerability. Any user could potentially access/modify other users' data via direct API interaction using the public anon key.
    *   **Score:** **90/100** (Critical risk, data privacy/integrity).

2.  **Missing/Incomplete Priority Features:**
    *   **Problem:** Key features identified as priorities are placeholders or incomplete: Static Analysis Column (placeholder), RTE saving for edits (text conversion missing), Tag re-generation on edit (skipped), Sidebar navigation enhancements (not started).
    *   **Score:** **70/100** (High impact on planned functionality).

3.  **State Management Complexity (`page.tsx`):**
    *   **Problem:** The main page component manages excessive state (entries, multiple loading states, multiple filter states, dialog state, editing state, derived tag counts/colors). High complexity (>500 lines) hinders maintainability and increases bug risk.
    *   **Score:** **60/100** (Significant complexity, slows future development).

4.  **Performance Considerations:**
    *   **Problem:** Potential bottlenecks: Initial load fetches all entries; tag calculations re-run on entire dataset with any change; some filtering might be better client-side post-load.
    *   **Score:** **55/100** (Moderate risk, potential scalability issues).

5.  **Prop Drilling:**
    *   **Problem:** State and numerous callbacks defined in `page.tsx` are passed down multiple levels, increasing coupling and refactoring difficulty.
    *   **Score:** **50/100** (Moderate complexity).

6.  **Code Duplication/Organization:**
    *   **Problem:** Types defined within `page.tsx`; Supabase calls duplicated in UI components instead of centralized data access layer.
    *   **Score:** **45/100** (Slight impact on maintainability).

7.  **Basic Error Handling:**
    *   **Problem:** Relies on `console.error` and `alert()`. Needs more user-friendly error feedback (e.g., toast notifications).
    *   **Score:** **40/100** (Low-to-moderate impact, affects UX).

## Next Steps / Priorities (From Highest to Lowest)

1.  **Implement Row Level Security (RLS):**