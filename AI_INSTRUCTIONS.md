## Handoff Summary (End of Session - 2025-04-16)

*   **Goal Achieved:** Implemented the "Actions" tab feature, displaying pending actions grouped by META tag and sorted by count. Added functionality to mark actions complete. Implemented loading improvements (PAGE_SIZE=100, total count display).
*   **Key Changes:**
    *   Modified `page.tsx` extensively to introduce main tabs ("The Stream", "The List") and nested secondary tabs ("Work", "Finances", "Untagged", etc.) within "The List".
    *   Created `AllActionsList.tsx` component to display actions passed via props.
    *   Updated `journalStore.ts` with `PAGE_SIZE=100`, total entry count logic (`loadTotalCount`, state), and `markActionCompleted` action.
    *   Updated `StaticAnalysisColumn.tsx` to show "Loaded X of Y total".
    *   Added Supabase RPC function `get_total_entry_count`.
    *   Updated `entryService.ts` with `fetchTotalEntryCountService`.
    *   Fixed `journalStore.test.ts` to align with `PAGE_SIZE` change and mock total count fetch.
    *   Applied UI styling updates to both primary and secondary tabs.
    *   Updated `ai_instructions.md`.
*   **Last Action:** Pushed all changes to GitHub (`main` branch, commit `064a195`). Vercel build triggered.
*   **Next Steps (Likely):** Monitor Vercel deployment, verify functionality of the new "Actions" tab and loading changes. Potential follow-up on further UI polish or bug fixes related to the new features.

---

# AI Development Instructions for VibeKeep

**Document Purpose & AI Usage Guide:**

*   **Goal:** This document provides essential context for AI collaboration on the VibeKeep project.
*   **Structure:** It begins with the **"Latest State of the Product"** section, reflecting the most recent understanding based on codebase analysis. Below this, historical versions or notes may exist.
*   **AI Instruction:** Prioritize the information in the **"Latest State of the Product"** section for current development tasks. Use the subsequent historical sections for background context or if specific historical information is requested, but be aware that details may be outdated compared to the latest state description. Continuously analyze the codebase and propose updates to the "Latest State" section as the project evolves.

**Document Version:** 2.10.0 (Action List Tabs & Loading Improvements - 2025-04-16)
**Analysis Date:** 2025-04-16

---

## Recent Activities (Since v2.9.0)

*   **Entry Loading:**
    *   Increased entry fetch page size from 20 to 100.
    *   Implemented fetching of the total entry count via a Supabase RPC function.
    *   Updated the Analysis sidebar to display "Loaded X of Y total" entries.
*   **Action List Feature:**
    *   Added primary tabs ("The Stream", "The List") to the main view.
    *   Implemented a secondary, nested tab view within "The List".
    *   Grouped pending actions by their associated META tag within the secondary tabs.
    *   Ordered secondary tabs based on the count of pending actions per tag (most first).
    *   Added functionality to mark actions as complete directly from "The List" tab.
    *   Fixed a bug where completing an action would incorrectly reset the active secondary tab.
*   **UI Enhancements:**
    *   Renamed primary tabs and added icons (`Activity`, `ListTodo`).
    *   Applied distinct visual styles to primary and secondary tab sets for clarity.

---

## Latest State of the Product (as of 2025-04-16)

**Summary:** This section reflects the current understanding of the VibeKeep application based on codebase inspection.

**1. System Overview & Tech Stack:**

*   **Core:** Next.js 14 (App Router), React, TypeScript, Zustand, Supabase (Postgres + Auth), OpenAI API, Vercel deployment.
*   **UI:** Tailwind CSS, shadcn/ui, lucide-react, sonner (toasts).
*   **Functionality:** Uses Supabase client (`src/lib/supabaseClient.ts`) and a service layer (`src/lib/entryService.ts`) for DB interactions. State managed by Zustand (`src/stores/journalStore.ts`). Authentication via Supabase Auth UI (`@supabase/auth-ui-react`) on dedicated `/signin` and `/signup` pages.
*   **Key Libraries Confirmed:** `react-intersection-observer` (via `useInView` hook), `lodash.debounce`, `clsx`.

**2. Core Features Implemented:**

*   **Authentication:** Email/Password and Google SSO via Supabase Auth. RLS enabled on `entries`.
*   **Layout:** Two-column (Sidebar/Feed + Analysis). `Header.tsx`, `JournalSidebar.tsx`, `StaticAnalysisColumn.tsx`. Main layout in `src/app/page.tsx`.
*   **Journal Entry CRUD:** Full CRUD operations managed via `entryService.ts` and `journalStore.ts`.
    *   **Creation:** `addEntryService` handles text/voice entries. `addEntry` action in store triggers *asynchronous* background calls to `/api/classify-meta`, `/api/classify-intent`, `/api/tags`.
    *   **Editing (Content):** `updateEntryContentService` updates content.
    *   **Deletion:** `deleteEntryService`. Store handles optimistic updates and reverts.
*   **Filtering & Search:**
    *   **Hybrid Approach:**
        *   *Server-side:* `fetchEntriesPaginatedService` handles initial load and pagination, applying search OR tag filters directly in the Supabase query.
        *   *Client-side:* `journalStore` holds `loadedEntries` and `displayEntries`. Applying filters via the UI triggers client-side filtering (`filterLoadedEntries` function) on `loadedEntries` to update `displayEntries`.
*   **Infinite Scroll:** Implemented in `src/app/page.tsx` using `useInView` from `react-intersection-observer`. Loads more entries via `journalStore`'s `loadMoreEntries` action.
*   **Voice Notes:**
    *   `/api/transcribe` route exists.
    *   UI implemented in `src/app/page.tsx` for recording, timer, waveform.
    *   Transcription calls `addEntryWithTranscription` action in store.
*   **AI Tagging & Classification:** Background generation of Meta, Intent, Content tags via API routes (`/api/classify-meta`, `/api/classify-intent`, `/api/tags`).
    *   **API routes now correctly update the database** using the `SUPABASE_SERVICE_ROLE_KEY`.
    *   **Client-side Realtime listener added** (`src/app/page.tsx`) to subscribe to `entries` table updates.
    *   **Updates now populate automatically** via the Realtime listener calling `journalStore.updateEntryTags`.
*   **Inline Editing (JournalEntry Component - `JournalEntry.tsx`):**
    *   **Tabs:** Ordered: **Original, Summary, Actions**.
    *   **Summary/Actions:** Inline add/edit/delete/toggle fully implemented via local state and service calls.
*   **Static Analysis Column (`StaticAnalysisColumn.tsx`):**
    *   Implemented: Displays top tags based on visible `displayEntries`.
    *   Allows clicking tags to apply client-side filters.
*   **User Feedback:** `sonner` toasts used.
*   **Tag Highlighting:** Consistent tag colors applied.

**3. Key Decisions & Rationale:**

*   **State Management (Zustand):** Centralized state (`journalStore.ts`) for core data/status.
*   **Filtering (Hybrid):** Server-side for loading/pagination; Client-side for UI responsiveness.
*   **CRUD Refresh:** Add/Edit/Delete handled via store actions, with appropriate optimistic/server-confirmed updates.
*   **Asynchronous AI Processing:** Entry creation/update triggers background API tasks. **Updates now arrive via Realtime.**
*   **Security:** RLS policy added for `authenticated` role `SELECT` on `entries` to enable Realtime subscription. CSP updated to allow `wss://` connections.

**4. Testing Strategy & Workflow:**

*   **Goal:** Ensure code quality, prevent regressions, enable confident refactoring.
*   **Framework:** Vitest + React Testing Library.
*   **Current Status:**
    *   Store tests (`src/stores/journalStore.test.ts`) **fixed and passing**. Cover core store logic.
    *   No component tests exist currently.
*   **Workflow Integration:**
    *   **CI/CD (Vercel):** The `build` script in `package.json` updated to `npm run test && next build`. This ensures tests run automatically on Vercel deployments and **block deployment on failure**.
    *   **Pre-commit (Recommended):** Implement pre-commit hooks (e.g., `husky`) to run tests locally before committing.
*   **Priorities:**
    1.  Add component tests, starting with `StaticAnalysisColumn.tsx` and `JournalEntry.tsx`.
    2.  Implement pre-commit hooks.

**5. Potential Issues / Areas for Review:**

*   **(85) Lack of Component Testing:** High priority now that store tests are stable.
*   **(80) Complex `JournalEntry.tsx` Component:** Prime candidate for component testing/refactoring.
*   **(70) Hybrid Filtering Complexity & Potential Scalability Issue:** Client-side filtering logic needs specific tests.
*   **(65) Voice Note UI/UX Glitches:** Potential double processing indicator, visualizer stopping briefly (needs separate investigation).
*   **(60) Complex `journalStore.ts`:** Could benefit from ongoing refactoring, guided by tests.


**6. Naming Conventions & Other Details:** Seem generally consistent. Voice transcription limit (`maxDuration: 60`) confirmed.


---

## Historical Instructions & Notes (May Contain Outdated Information)

**AI Collaboration Note:** Continuously analyze for problems/risks. Notify the user if any internal/controllable risk score is assessed at 70/100 or higher.
**Development Environment Note:** User is developing within the Cursor editor.
**MAINTENANCE NOTE:** This document is critical for context but requires frequent updates to stay synchronized with the codebase. Please update it after significant feature changes, refactors, or bug fixes.

## 1. Project Overview

**Goal:** VibeKeep is a modern journaling application designed to help users preserve and organize their thoughts and reflections, enhanced with AI-powered insights.

## 2. System Overview

*   **Frontend:** Next.js (App Router) single-page application using React, TypeScript, Tailwind CSS, and Shadcn UI components. Handles user interface, state management (Zustand), and client-side interactions.
*   **Backend API:** Next.js API Routes (e.g., `/api/transcribe`, `/api/classify-meta`, etc.) hosted as serverless functions (on Vercel). These handle tasks requiring server-side logic or external service integration (like OpenAI).
*   **Database:** Supabase Postgres database stores user entries and related data.
*   **Authentication:** Supabase Auth handles user sign-up, sign-in (Email/Password, Google SSO), session management, and user metadata.
*   **Security:** Row Level Security (RLS) is enforced in Supabase to ensure users only access their own data.
*   **AI Services:** OpenAI API is used via backend API routes for features like voice transcription and tag generation.
*   **Deployment:** Hosted on **Vercel**, automatically deployed from the `main` branch on GitHub.

## 3. Tech Stack

*   Framework: Next.js 14 (App Router)
*   Language: TypeScript
*   State Management: Zustand
*   Styling: Tailwind CSS
*   UI Components: shadcn/ui, react-intersection-observer, @supabase/auth-ui-react, **sonner**
*   Icons: lucide-react
*   Database: Supabase (PostgreSQL)
*   Authentication: Supabase Auth (Email/Password, Google SSO)
*   Deployment: **Vercel** (via GitHub integration)
*   AI Backend: OpenAI API (via `openai` npm package)
*   Code Storage: GitHub
*   Testing: Vitest (Unit tests for Zustand store - currently need review)

## 4. Setup & Deployment

1.  **Clone Repository:** `git clone ...`
2.  **Install Dependencies:** `npm install`
3.  **Supabase Project:** Set up a Supabase project. Enable Email and Google Auth providers.
4.  **Environment Variables:** Create a `.env.local` file with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, and **`SUPABASE_SERVICE_ROLE_KEY`**.
5.  **Google Cloud Project:** Set up OAuth credentials for Google Sign-In, obtaining a Client ID and Secret.
6.  **Supabase Config:**
    *   Enter Google Client ID/Secret in Supabase Auth Provider settings.
    *   Configure Site URL and Redirect URIs in Supabase Auth settings.
    *   Apply database migrations (`supabase/migrations`) using `supabase db push` (if using Supabase CLI locally) or via the Supabase dashboard SQL editor.
    *   Enable **Realtime** for the `entries` table (Database > Replication).
    *   Ensure **RLS policy** exists allowing `SELECT` for `authenticated` role on `entries` table.
7.  **Vercel Project:** Create a Vercel project linked to the GitHub repository. Configure the same environment variables as in `.env.local` in the Vercel project settings.
8.  **Run Locally:** `npm run dev`
9.  **Deploy:** Push to `main` branch triggers automatic Vercel deployment (tests run first).

## 5. Core Features Implemented

*   **Authentication:** Email/Password and Google SSO via Supabase Auth. Separate `/signin` and `/signup` pages.
*   **Row Level Security (RLS):** Enabled and configured for `entries` table.
*   **Layout:** Two-column layout (Left: Header + Feed, Right: Analysis Placeholder).
*   **Journal Entry CRUD:** Creation, viewing, editing, deletion.
*   **Infinite Scroll:** For loading entries.
*   **Voice Notes:** Recording, transcription via OpenAI, saving as entry.
*   **Tagging:** Background AI generation of Meta, Intent, Content tags for new entries.
*   **Server-Side Filtering/Search:** Implemented for entries.
*   **State Management:** Zustand central store.
*   **UI:** Shadcn components, dark/light mode support.
*   **Inline Editing/Adding (JournalEntry Component):**
    *   Entry cards display content in tabs, now ordered: **Original, Summary, Actions**. 'Original' is the default tab.
    *   The **'Summary' tab is always visible**, even if no summary points exist (displays an 'Add' button if empty).
    *   Summary points (bullet list) are editable inline using `contentEditable`.
    *   Action items (checkbox list) are editable inline using `contentEditable`.
    *   Hovering over a summary or action item reveals Edit/Delete/Add buttons.
    *   Hovering also reveals a "+" button to add a new item *below* the hovered one.
    *   The add form appears inline below the relevant item.
    *   If a list is empty, an "+ Add" button appears to add the first item.
    *   Font weights and alignments are handled for a smooth editing experience.
    *   **Backend persistence implemented** for summary add/edit/delete via `updateEntrySummaryService`.
*   **User Feedback:** **Toast notifications (using `sonner`)** added for success/error on action/summary item CRUD operations.
*   **UI Alignment:** Add Voice/Text Note buttons in the header aligned using `items-baseline`.

## 6. Known Issues / Next Steps (Prioritized > 70/100)

**Current Problems:**
1.  **Filtering/Search Scalability (85):** Current client-side filtering is not truly scalable.
2.  **Double "Processing..." Indicator (75):** Voice note submission UI glitch.
3.  **Summary Generation Dependency:** Summary points only appear if `extracted_summary` is populated in the database via the backend AI processing pipeline. The frontend `JournalEntry` component now *always* displays the tab but relies on backend data population.

**Potential Opportunities / Incomplete Features:**
1.  **Implement Static Analysis Column (90):** UI exists, needs backend logic.
2.  **Urgent/Important Matrix Classification (80):** Add U/I flags and matrix view.
3.  **Data Export/Import (70):** Allow users to export data.
4.  **AI-Generated Entry Score (70):** Alternative classification (more complex).

**Lower Priority / Future Considerations:**
*   UI/UX polishing, automated testing, accessibility review.

## 7. Naming Conventions
*   **Components:** Use **PascalCase** (e.g., `JournalEntry`, `StaticAnalysisColumn`). Component filenames should match (e.g., `JournalEntry.tsx`).
*   **Hooks:** Use `use` prefix and **camelCase** (e.g., `useJournalStore`).
*   **Stores/State/Actions (Types):** Use **PascalCase** (e.g., `JournalState`, `JournalActions`).
*   **Services/Helper Functions/Variables:** Use **camelCase** (e.g., `entryService`, `calculateHighlightedTagColors`). Service filenames can use camelCase (e.g., `entryService.ts`).
*   **Types/Interfaces:** Use **PascalCase** (e.g., `Entry`, `TagType`).
*   **API Routes:** Use **lowercase-hyphenated** paths (e.g., `/api/classify-intent`).
*   **CSS Classes:** Use standard **Tailwind utility classes**. Avoid custom CSS.

## 8. Key Decisions & Rationale
*   **State Management (Zustand):** Centralized state.
*   **Data Access Layer (`entryService.ts`):** Centralized DB interactions.
*   **Continuous Feed & Filtering:** Uses server-side filtering and pagination for scalability and correctness.
*   **CRUD Refresh:** Add ops optimistically update UI; Edit/Delete modify client state directly (potential refinement needed).
*   **Centralized Tag Color Logic:** Consistent tag appearance.
*   **Journal Entry Tab Order:** Default order set to Original, Summary, Actions for logical flow. Summary tab always visible.
*   **Voice Note Creation Flow:** Direct creation without editor.
*   **Authentication/RLS:** Implemented basic Supabase Auth (Email) and RLS on `entries` table for essential security.

## 9. Voice Recording Limits
*   **Serverless Timeout:** The `/api/transcribe` route has a `maxDuration` of 60 seconds (set in the file). This is the primary constraint.
*   **Practical Limit:** Due to the server timeout covering upload + Whisper processing + response, users should be advised to keep recordings around **1-2 minutes** for reliability.
*   **Hard Limit:** Recordings longer than **~3-4 minutes** are very likely to hit the 60-second timeout and fail.
*   **Whisper Limit:** The OpenAI Whisper API has a 25MB file size limit, which is usually much longer than the serverless timeout allows.