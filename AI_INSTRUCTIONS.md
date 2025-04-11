# AI Development Instructions for ThoughtKeeper

**Document Version:** 2.2.0
**Date:** 2024-07-18

**AI Collaboration Note:** Continuously analyze for problems/risks. Notify the user if any internal/controllable risk score is assessed at 70/100 or higher.

## 1. Project Overview & Current State

**Goal:** ThoughtKeeper is a modern journaling application designed to help users preserve and organize their thoughts and reflections, enhanced with AI-powered insights.

**Tech Stack:**
*   Framework: Next.js 14 (App Router)
*   Language: TypeScript
*   State Management: **Zustand**
*   Styling: Tailwind CSS
*   UI Components: shadcn/ui
*   Icons: lucide-react
*   Database: Supabase (PostgreSQL)
*   AI Backend: OpenAI API (via `openai` npm package)
*   Testing: **Vitest** (Unit tests for Zustand store)
*   Deployment: Netlify (via GitHub integration)
*   Code Storage: GitHub

**Core Features Implemented:**
*   **Layout:** Three-column layout on large screens (Sidebar Navigation, Main Content, Static Analysis).
*   Date-based journal entry creation, viewing, editing, and deletion via **Dialog Modal**.
*   Multiple entries allowed per day.
*   **Centralized State:** Application state managed by **Zustand store** (`src/stores/journalStore.ts`), including entries, filters, UI state, and actions.
*   **Data Service Layer:** Supabase CRUD operations abstracted into `src/lib/entryService.ts`.
*   **Centralized Types:** Core types defined in `src/types/index.ts`.
*   **Unit Tested Store:** Key store actions covered by Vitest unit tests.
*   **Sidebar Navigation:** Shows dates with entries (sorted chronologically). **Note:** Date counts currently reflect total entries, not filtered counts (fix deferred).
*   **Main Entry Feed:** Displays entries for the currently selected date. Initial load defaults to today.
*   Data persistence using **Supabase** database.
*   Dual Tagging System (Meta, Intent, Content): Auto-generated on new entry save via API routes.
    *   Meta/Intent tags stored with original case.
    *   Content tags stored lowercase.
    *   Fixed issues with API response parsing and camelCase/snake_case mismatches during tag updates.
*   **Client-Side Filtering & Search:**
    *   Filtering by Meta, Intent, and Content tags (multiple allowed).
    *   Search implemented client-side via Zustand store, filtering `allEntries` based on search query. Matches across content and all tag types (case-insensitive substring).
    *   Provides instant "search-as-you-type" experience.
*   **Consistent Tag Colors:** Unique color highlighting for frequently occurring tags (>= 2 instances across `allEntries`) is now calculated in the Zustand store and applied consistently across Analysis column, Active Filter badges, and Entry cards.
*   **Improved Filter UX:** Active filters are displayed as dismissible badges above the main entry list. Filter selection logic is consistent between sidebar and entry cards.
*   **Resolved State Bugs:** Fixed previous bugs related to incorrect filtering updates and sidebar date updates when adding entries.
*   **Main Content Controls:** Top row includes active filter display, search input, and "+ Add Entry" button.
*   Rich Text Editor (TipTap) used within the entry editor dialog.
*   Entry list display using styled cards with hover effect, options menu, metadata footer, and loading indicator.
*   Basic mobile responsiveness.
*   **Static Analysis Column:** Displays top tags based on filtered entries and total filtered entry count.
*   Resolved previous build/runtime errors.

**AI Features Implemented / Status:**
*   Tag generation (Meta, Intent, Content) via API routes on *new* entry save.
*   **NOTE:** Tag re-generation on *edit* is **not** implemented.

**Deployment Status:**
*   Deployed to Netlify at `https://thoughtkeeper.netlify.app`.
*   Continuous deployment from the `main` branch on GitHub.
*   Requires `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
*   Uses Node.js 20.x.

## 2. Key Decisions & Rationale
*   **State Management (Zustand):** Refactored from component-local state to address complexity, prop drilling, and state-related bugs. Improved maintainability and enabled consistent state access.
*   **Data Access Layer (`entryService.ts`):** Centralized Supabase interactions, simplifying components and store logic.
*   **Client-Side Search:** Switched from backend FTS to client-side filtering for improved "search-as-you-type" responsiveness. Fetches all entries initially. Scalability may need review with very large datasets.
*   **Centralized Tag Color Logic:** Moved color calculation based on global frequency into Zustand store to ensure consistent UI representation.
*   **(Other existing decisions remain relevant...)**

## 3. Future Development Considerations & Improvements
1.  **Implement Continuous Feed:** Refactor main content area to show a continuous, chronologically sorted feed with infinite scroll instead of single-date view. Includes sidebar interaction changes (scroll-spy, updated counts). **(Next Priority)**
2.  **Implement Authentication & Row Level Security (RLS):** **(Postponed but High Priority Security Risk)**.
3.  **Populate Static Analysis Column:** Implement meaningful analysis.
4.  **Complete Rich Text Editing:** Ensure formatting preservation on edit save.
5.  **Refine AI Features:** Consider tag re-gen on edit, integrate summary saving, optimize costs.
6.  **Improve Mobile Responsiveness:** Thorough testing.
7.  **Robust Error Handling:** User feedback, API errors.
8.  **(Other previous items remain relevant...)**

## 4. Critical Information & Risks
*   **Row Level Security (RLS): INTENTIONALLY DISABLED (Score: 90/100).** Remains highest risk.
*   **Client-Side Search Scalability (Score: ~40/100 - NEW):** Fetching all entries on initial load for client-side filtering might not scale well for users with thousands of entries. Monitor performance as data grows.
*   **AI Feature Dependency & Cost (Score: ~60/100):** No change.
*   **State Management Complexity:** Significantly reduced via Zustand refactor. Score lowered (~20/100).
*   **Prop Drilling:** Significantly reduced via Zustand refactor. Score lowered (~15/100).
*   **(Other previous risks remain relevant...)**

## Current Branch Status
*   `feat/state-refactor`: **Complete**. Contains Zustand integration, service layer, centralized types, unit tests, client-side search, consistent tag colors, and fixes for filtering/tagging bugs. Ready for review/merge into `main`.

## Next Steps / Priorities (Revised)
1.  **Merge `feat/state-refactor` into `main`.**
2.  **Implement Continuous Feed & Infinite Scroll:** (See Future Development #1).
3.  **Implement Row Level Security (RLS):** REQUIRED FOR SECURITY.
4.  **Populate Static Analysis Column.**
5.  **(Remaining priorities shift down)**