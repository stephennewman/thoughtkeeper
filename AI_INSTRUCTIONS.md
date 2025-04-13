# AI Development Instructions for ThoughtKeeper

**Document Version:** 2.4.0 (Updated post-coloring/bugfix cycle)
**Date:** 2024-07-25

**AI Collaboration Note:** Continuously analyze for problems/risks. Notify the user if any internal/controllable risk score is assessed at 70/100 or higher.
**MAINTENANCE NOTE:** This document is critical for context but requires frequent updates to stay synchronized with the codebase. Please update it after significant feature changes, refactors, or bug fixes.

## 1. Project Overview & Current State

**Goal:** ThoughtKeeper is a modern journaling application designed to help users preserve and organize their thoughts and reflections, enhanced with AI-powered insights.

**Tech Stack:**
*   Framework: Next.js 14 (App Router)
*   Language: TypeScript
*   State Management: **Zustand**
*   Styling: Tailwind CSS
*   UI Components: shadcn/ui, **react-intersection-observer**
*   Icons: lucide-react
*   Database: Supabase (PostgreSQL)
*   AI Backend: OpenAI API (via `openai` npm package)
*   Testing: **Vitest** (Unit tests for Zustand store)
*   Deployment: Netlify (via GitHub integration)
*   Code Storage: GitHub

**Core Features Implemented:**
*   **Layout:** Three-column layout on large screens (Sidebar Navigation, Main Content, Static Analysis). Sidebar component (`<JournalSidebar />`) is rendered, displaying tag filters, but full navigation features (e.g., date jump) are future work.
*   **Journal Entry CRUD:** Creation, viewing, editing, and deletion via Dialog Modal.
    *   Fixed bug preventing text note creation due to incorrect argument order in `addEntry` store action.
*   **Continuous Feed & Infinite Scroll:** Main content area displays a chronologically descending feed of entries.
    *   Fetches entries page-by-page from backend (`fetchEntriesPaginatedService`).
    *   Uses `react-intersection-observer` to trigger loading more entries on scroll.
    *   Groups entries by date with sticky date headers.
    *   Fixed React key error caused by duplicate entries during pagination (`loadMoreEntries` store action).
*   Multiple entries allowed per day.
*   **Centralized State:** Application state managed by **Zustand store** (`src/stores/journalStore.ts`), including **paginated entries**, filters, UI state, and actions.
    *   State structure updated for pagination (`loadedEntries`, `displayEntries`, `currentPage`, `hasMoreEntries`, loading flags).
    *   Actions added/modified for pagination (`loadInitialEntries`, `loadMoreEntries`).
*   **Data Service Layer:** Supabase CRUD operations abstracted into `src/lib/entryService.ts`.
    *   Added `fetchEntriesPaginatedService` for basic chronological pagination.
    *   **Note:** Contains a separate `fetchEntriesService` function with server-side filtering logic (tags/search) that is currently **not used** by the main feed pagination.
*   **Centralized Types:** Core types defined in `src/types/index.ts`.
*   **Unit Tested Store:** Key store actions covered by Vitest unit tests. **Verification needed to confirm tests cover recent pagination/state logic.**
*   **Main Entry Feed:** Displays continuous feed (see above).
*   Data persistence using **Supabase** database.
*   **Dual Tagging System (Meta, Intent, Content):** Auto-generated on new entry save via API routes.
    *   Meta/Intent tags stored with original case.
    *   Content tags stored lowercase.
    *   Fixed issues with API response parsing and camelCase/snake_case mismatches during tag updates.
    *   **Resolved** issue where tags didn't appear without refresh after adding entry.
*   **Client-Side Filtering & Search:**
    *   Filtering by Meta, Intent, and Content tags, and search query.
    *   Filtering is applied **client-side** to the *currently loaded set of entries* (`loadedEntries`) via `filterLoadedEntries` function in store, updating the `displayEntries`.
    *   Provides instant filtering **only on visible data**. **(KNOWN LIMITATION)**
    *   UI includes a banner indicating filter scope limitation.
*   **Consistent Tag Colors:** Calculated based on tag type (Meta, Intent, Content) for **all unique tags** within `loadedEntries`. Uses distinct palettes with stronger colors (e.g., `bg-*-600` series) for better visibility. Applied consistently to Analysis column, Active Filter badges, and Entry cards (via Zustand state `highlightedTagColors`).
*   **Improved Filter UX:** Active filters displayed as dismissible badges.
    *   Fixed inconsistency: Clicking tags on entry cards now correctly toggles filters (including multiple content tags) like the sidebar, instead of replacing all active filters.
*   **Main Content Controls:** Consolidated top bar with Logo (left), Error/Status, Search, Add Entry button (right).
    *   Improved mobile responsiveness: Buttons use icon-only display on small screens, header layout adjusted to prevent overflow.
*   Rich Text Editor (TipTap) used within the entry editor dialog.
*   Entry list display using styled cards with hover effect, options menu, metadata footer.
*   Static Analysis Column: Displays top tags based on **all currently loaded entries** (`loadedEntries` state).
*   **Voice Recording:** Frontend UI implemented for recording audio notes, including timer and waveform visualizer (`page.tsx`).

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
*   **Continuous Feed (Minimal):** Implemented pagination for data loading (`fetchEntriesPaginatedService`) and infinite scroll UI. **Filtering (search, tags) remains client-side**, operating only on loaded data for initial implementation speed. This introduces a **known limitation** where filters do not reflect the entire dataset. Server-side filtering is deferred.
*   **CRUD Refresh:**
    *   **Add:** Triggers a reload of the feed from the first page (`loadInitialEntries`) for simplicity and data consistency after AI tagging completes.
    *   **Update/Delete:** Modify the client-side state (`loadedEntries` and `displayEntries`) directly for a faster UX, without a full reload. (This avoids re-fetching all pages).
*   **Centralized Tag Color Logic:** Moved color calculation based on tag type (Meta, Intent, Content) into Zustand store. Assigns a distinct, strong color to *every unique tag* encountered in `loadedEntries` to ensure consistent UI representation and improve visibility (removed previous frequency threshold).

## 3. Future Development Considerations & Improvements
1.  **Implement Server-Side Filtering:** Refactor `fetchEntriesPaginatedService` and store actions to apply filters (search, tags) on the backend during paginated fetches. This will fix the filter scope limitation. **(High Priority Follow-up)**
2.  **Improve CRUD UX:** Implement more seamless updates after Add/Edit/Delete instead of reloading the entire feed (e.g., client-side insertion/update/removal if possible). **(Medium Priority)**
3.  **Implement Authentication & Row Level Security (RLS):** **(Postponed but High Priority Security Risk)**.
4.  **Refine Sidebar:** Implement date navigation (e.g., heatmap, date list with jump-to-offset logic) or other useful tools.
5.  **Populate Static Analysis Column:** Implement meaningful analysis (consider if it should analyze only loaded data or require full data fetch).
6.  **Complete Rich Text Editing:** Ensure formatting preservation on edit save.
7.  **Refine AI Features:** Consider tag re-gen on edit, integrate summary saving, optimize costs.
8.  **Improve Mobile Responsiveness & Test Thoroughly.**
9.  **Robust Error Handling & User Feedback.**
10. **Verify/Update Unit Tests:** Ensure store tests cover pagination, filtering, and new state logic.
11. **Address Console Warnings/Errors:** Review any remaining warnings (e.g., from TipTap or other dependencies).
    *   Resolved React duplicate key error by fixing pagination logic in store (`loadMoreEntries`).
    *   Resolved Zustand/React snapshot warning in `JournalEntry` component by selecting state slices individually.

## 4. Critical Information & Risks
*   **Row Level Security (RLS): INTENTIONALLY DISABLED (Score: 90/100).** Remains highest risk.
*   **Filter Scope Limitation (Score: 70/100 - NEW):** Filters/search only apply to loaded entries, not the entire dataset. This can be confusing or misleading for users expecting comprehensive filtering. Requires server-side filtering implementation to resolve.
*   **Client-Side Filtering Performance (Score: ~40/100 - REVISED):** While pagination reduces initial load, client-side filtering performance on `loadedEntries` can still degrade as many pages are loaded. Server-side filtering will mitigate this.
*   **AI Feature Dependency & Cost (Score: ~60/100):** No change.
*   **State Management Complexity:** Significantly reduced via Zustand refactor. Score lowered (~20/100).
*   **Prop Drilling:** Significantly reduced via Zustand refactor. Score lowered (~15/100).
*   **(Other previous risks remain relevant...)**

## Current Branch Status
*   `main`: Contains latest updates including tag color improvements, pagination fix, text entry fix, and header responsiveness adjustments.

## Next Steps / Priorities (Revised)
1.  **Implement Real Voice Transcription API Call** (See Future Development #2).
2.  **Implement Server-Side Filtering:** (See Future Development #1).
3.  **Implement Row Level Security (RLS):** REQUIRED FOR SECURITY.
4.  **Verify/Update Unit Tests:** (See Future Development #10).
5.  **(Optional) Merge `feat/continuous-feed-minimal` into `main` if stable enough after testing/fixes.**
6.  **(Remaining priorities shift down)**

## Voice Recording Limits (IMPORTANT)

*   **Serverless Timeout:** The `/api/transcribe` route has a `maxDuration` of 60 seconds (set in the file). This is the primary constraint.
*   **Practical Limit:** Due to the server timeout covering upload + Whisper processing + response, users should be advised to keep recordings around **1-2 minutes** for reliability.
*   **Hard Limit:** Recordings longer than **~3-4 minutes** are very likely to hit the 60-second timeout and fail.
*   **Whisper Limit:** The OpenAI Whisper API has a 25MB file size limit, which is usually much longer than the serverless timeout allows.