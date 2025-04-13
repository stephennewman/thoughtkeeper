# AI Development Instructions for ThoughtKeeper

**Document Version:** 2.5.2 (Server-Side Filtering Implemented)
**Date:** 2024-07-26

**AI Collaboration Note:** Continuously analyze for problems/risks. Notify the user if any internal/controllable risk score is assessed at 70/100 or higher.
**Development Environment Note:** User is developing within the Cursor editor.
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
*   Database: Supabase (PostgreSQL) - **Includes DB Migrations via Supabase CLI**
*   AI Backend: OpenAI API (via `openai` npm package)
*   Testing: **Vitest** (Unit tests for Zustand store)
*   Deployment: Netlify (via GitHub integration)
*   Code Storage: GitHub

**Core Features Implemented:**
*   **Layout:** Three-column layout on large screens (Sidebar Navigation, Main Content, Static Analysis).
*   **Journal Entry CRUD:** Creation, viewing, editing, and deletion via Dialog Modal.
*   **Continuous Feed & Infinite Scroll:** Main content area displays a chronologically descending feed of entries.
    *   Fetches entries page-by-page from backend (`fetchEntriesPaginatedService`).
    *   Uses `react-intersection-observer` to trigger loading more entries on scroll.
    *   Groups entries by date with sticky date headers.
*   Multiple entries allowed per day.
*   **Centralized State:** Application state managed by **Zustand store** (`src/stores/journalStore.ts`), including **paginated entries**, filters, UI state, and actions.
    *   Actions handle optimistic updates and background tagging processes.
    *   Processing state (`isProcessingEntry`) optimized for better UI feedback.
*   **Data Service Layer:** Supabase CRUD operations abstracted into `src/lib/entryService.ts`.
    *   Added `fetchEntriesPaginatedService` for basic chronological pagination.
    *   **Note:** Contains a separate `fetchEntriesService` function with server-side filtering logic (tags/search) that is currently **not used** by the main feed pagination.
*   **Centralized Types:** Core types defined in `src/types/index.ts`.
*   **Unit Tested Store:** Key store actions covered by Vitest unit tests. **Verification needed to confirm tests cover recent pagination/state logic.**
*   **Entry Type Tracking:**
    *   Added `entry_type` column ('voice' or 'text') to `entries` table via Supabase migration (`supabase/migrations`).
    *   `addEntryService`, `addEntry`, and `addEntryWithTranscription` updated to set and save the correct `entry_type`.
*   **Entry Card Redesign:**
    *   `JournalEntry` component layout updated.
    *   Content area is primary focus.
    *   Metadata (Entry Type Icon/Text, Time, Tags, Spinner) consolidated into a footer area below the content.
    *   Options menu positioned top-right.
*   Data persistence using **Supabase** database.
*   **Dual Tagging System (Meta, Intent, Content):** Auto-generated on new entry save via API routes.
    *   Meta/Intent tags stored with original case.
    *   Content tags stored lowercase.
    *   Tags are applied in the background after initial entry creation.
*   **Server-Side Filtering & Search: COMPLETE**
    *   Filtering by Meta, Intent, Content tags, and search query is now performed **server-side** via `fetchEntriesPaginatedService`.
    *   Fixes the previous client-side scope limitation.
    *   Search uses Supabase `textSearch` on `search_vector` column.
    *   Search input is **debounced** in the UI for better performance.
*   **Consistent Tag Colors:** Calculated based on tag type for **all unique tags** within `loadedEntries`.
*   **Improved Filter UX:** Active filters displayed as dismissible badges.
*   **Main Content Controls:** Consolidated top bar with Logo, Status/Error, Search, Add Entry buttons.
    *   Improved mobile responsiveness.
*   Rich Text Editor (TipTap) used within the entry editor dialog.
*   Static Analysis Column: Displays top tags based on **all currently loaded entries** (`loadedEntries` state).
*   **Voice Recording & Transcription: COMPLETE**
    *   Frontend UI for recording audio notes.
    *   Backend API route (`/api/transcribe`) uses **real OpenAI Whisper API** for transcription.
    *   Transcribed text is used to create a new entry directly (bypassing editor), marked with `entry_type: 'voice'`. 

**AI Features Implemented / Status:**
*   Tag generation (Meta, Intent, Content) via API routes on *new* entry save.
*   **Voice Transcription** via Whisper API on *new* voice note save.
*   **NOTE:** Tag re-generation on *edit* is **not** implemented.

**Deployment Status:**
*   Deployed to Netlify at `https://thoughtkeeper.netlify.app`.
*   Continuous deployment from the `main` branch on GitHub.
*   Requires `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
*   Uses Node.js 20.x.

## 2. Scoring Rubrics (NEW SECTION)

This document uses scoring rubrics to help quantify and prioritize issues. 

### Problem / Risk Scoring (1-100 Scale)

Used in Section 6 to assess the severity and impact of identified problems or risks.

*   **0-20 (Low):** Minor issue, cosmetic, low impact, or already largely mitigated.
*   **21-50 (Medium):** Moderate impact on usability or development, potential for user confusion, needs attention but not urgent.
*   **51-80 (High):** Significant impact on usability, reliability, or security. Misleads users or blocks core functionality. High priority to address.
*   **81-100 (Critical):** Severe impact. Major security vulnerability, significant data integrity risk, application fundamentally unstable or unusable for core purposes. Must be addressed urgently.

## 3. Naming Conventions (Renumbered, previously 2)

To ensure consistency and clarity across the codebase, please adhere to the following naming conventions:

*   **Components:** Use **PascalCase** (e.g., `JournalEntry`, `StaticAnalysisColumn`). Component filenames should match (e.g., `JournalEntry.tsx`).
*   **Hooks:** Use `use` prefix and **camelCase** (e.g., `useJournalStore`).
*   **Stores/State/Actions (Types):** Use **PascalCase** (e.g., `JournalState`, `JournalActions`).
*   **Services/Helper Functions/Variables:** Use **camelCase** (e.g., `entryService`, `calculateHighlightedTagColors`). Service filenames can use camelCase (e.g., `entryService.ts`).
*   **Types/Interfaces:** Use **PascalCase** (e.g., `Entry`, `TagType`).
*   **API Routes:** Use **lowercase-hyphenated** paths (e.g., `/api/classify-intent`).
*   **CSS Classes:** Use standard **Tailwind utility classes**. Avoid custom CSS.

## 4. Key Decisions & Rationale (Renumbered, previously 3)
*   **State Management (Zustand):** Refactored from component-local state to address complexity, prop drilling, and state-related bugs. Improved maintainability and enabled consistent state access.
*   **Data Access Layer (`entryService.ts`):** Centralized Supabase interactions, simplifying components and store logic.
*   **Continuous Feed (Minimal):** Implemented pagination for data loading (`fetchEntriesPaginatedService`) and infinite scroll UI. **Filtering (search, tags) remains client-side**, operating only on loaded data for initial implementation speed. This introduces a **known limitation** where filters do not reflect the entire dataset. Server-side filtering is deferred.
*   **CRUD Refresh:**
    *   **Add (Text & Voice):** Creates entry, optimistically updates UI, then triggers background AI tagging. Processing indicator is brief.
    *   **Update/Delete:** Modify the client-side state (`loadedEntries` and `displayEntries`) directly for a faster UX, without a full reload. (This avoids re-fetching all pages).
*   **Centralized Tag Color Logic:** Moved color calculation based on tag type (Meta, Intent, Content) into Zustand store.
*   **Voice Note Creation Flow:** Transcribed text directly creates a new entry (type 'voice') without showing the editor, maintaining consistency with the background tagging flow of text entries.

## 5. Future Development Considerations & Improvements (Renumbered, previously 4)
1.  **Implement Row Level Security (RLS):** REQUIRED FOR SECURITY. **(High Priority Follow-up)**
2.  **Improve CRUD UX:** Refine updates after Edit/Delete/Add.
3.  **Refine Sidebar:** Implement date navigation or other tools.
4.  **Populate Static Analysis Column:** Implement meaningful analysis.
5.  **Complete Rich Text Editing:** Ensure formatting preservation.
6.  **Refine AI Features:** Tag re-gen on edit, summaries, cost optimization.
7.  **Improve Mobile Responsiveness & Test Thoroughly.**
8.  **Robust Error Handling & User Feedback.**
9.  **Verify/Update Unit Tests:** Ensure tests cover pagination, filtering, etc.
10. **Address Console Warnings/Errors.**

## 6. Critical Information & Risks (UPDATED CONTENT)

Stack-ranked list of known problems and risks based on assessed score:

1.  **Row Level Security (RLS): INTENTIONALLY DISABLED (Score: 90/100)**
    *   **Problem:** Highest security risk. Lack of RLS could allow unauthorized data access in a multi-user scenario. Critical for data privacy.
2.  **AI Feature Dependency & Cost (Score: ~60/100)**
    *   **Problem:** Relies on external AI APIs (OpenAI). Introduces dependency risks (downtime, changes) and operational costs.
3.  **State Management Complexity (Score: ~20/100)**
    *   **Problem:** Inherent complexity in managing application state. Mostly mitigated by Zustand refactor.
4.  **Prop Drilling (Score: ~15/100)**
    *   **Problem:** Significantly reduced by Zustand. Minimal risk.

*(Removed "Filter Scope Limitation" and related "Client-Side Filtering Performance" risks as they are resolved by server-side filtering)*

## 7. Current Branch Status (Renumbered, previously 6)
*   `main`: Contains latest updates including server-side filtering, debounced search, voice transcription, card redesign, and entry type tracking.

## 8. Next Steps / Priorities (Revised) (Renumbered, previously 7)
1.  **Implement Row Level Security (RLS):** REQUIRED FOR SECURITY. **(NEXT UP)**
2.  **Verify/Update Unit Tests:** (See Future Development #9).
3.  **(Remaining priorities shift down)**

## 9. Voice Recording Limits (IMPORTANT) (Renumbered, previously 8)

*   **Serverless Timeout:** The `/api/transcribe` route has a `maxDuration` of 60 seconds (set in the file). This is the primary constraint.
*   **Practical Limit:** Due to the server timeout covering upload + Whisper processing + response, users should be advised to keep recordings around **1-2 minutes** for reliability.
*   **Hard Limit:** Recordings longer than **~3-4 minutes** are very likely to hit the 60-second timeout and fail.
*   **Whisper Limit:** The OpenAI Whisper API has a 25MB file size limit, which is usually much longer than the serverless timeout allows.