# AI Development Instructions for ThoughtKeeper

**Document Purpose & AI Usage Guide:**

*   **Goal:** This document provides essential context for AI collaboration on the ThoughtKeeper project.
*   **Structure:** It begins with the **"Latest State of the Product"** section, reflecting the most recent understanding based on codebase analysis. Below this, historical versions or notes may exist.
*   **AI Instruction:** Prioritize the information in the **"Latest State of the Product"** section for current development tasks. Use the subsequent historical sections for background context or if specific historical information is requested, but be aware that details may be outdated compared to the latest state description. Continuously analyze the codebase and propose updates to the "Latest State" section as the project evolves.

**Document Version:** 2.8.1 (Testing Strategy - 2025-04-16)
**Analysis Date:** 2025-04-16

---

## Latest State of the Product (as of 2025-04-16)

**Summary:** This section reflects the current understanding of the ThoughtKeeper application based on codebase inspection.

**1. System Overview & Tech Stack:**

*   **Core:** Next.js 14 (App Router), React, TypeScript, Zustand, Supabase (Postgres + Auth), OpenAI API, Vercel deployment.
*   **UI:** Tailwind CSS, shadcn/ui, lucide-react, sonner (toasts).
*   **Functionality:** Uses Supabase client (`src/lib/supabaseClient.ts`) and a service layer (`src/lib/entryService.ts`) for DB interactions. State managed by Zustand (`src/stores/journalStore.ts`). Authentication via Supabase Auth UI (`@supabase/auth-ui-react`) on dedicated `/signin` and `/signup` pages.
*   **Key Libraries Confirmed:** `react-intersection-observer` (via `useInView` hook), `lodash.debounce`, `clsx`.

**2. Core Features Implemented:**

*   **Authentication:** Email/Password and Google SSO via Supabase Auth. RLS enabled on `entries`.
*   **Layout:** Two-column (Sidebar/Feed + Analysis). `Header.tsx`, `JournalSidebar.tsx`, `StaticAnalysisColumn.tsx`. Main layout in `src/app/page.tsx`.
*   **Journal Entry CRUD:** Full CRUD operations managed via `entryService.ts` and `journalStore.ts`.
    *   **Creation:** `addEntryService` handles text/voice entries, triggers *asynchronous* background calls to `/api/extract-actions` and `/api/extract-summary`. Store uses optimistic updates for UI.
    *   **Editing (Content):** `updateEntryContentService` updates content, also triggers background action/summary extraction. Store updates UI *after* server confirmation.
    *   **Deletion:** `deleteEntryService`. Store updates UI *after* server confirmation.
*   **Filtering & Search:**
    *   **Hybrid Approach:**
        *   *Server-side:* `fetchEntriesPaginatedService` handles initial load and pagination, applying search (`textSearch` on `search_vector`) OR tag filters (Meta, Intent, Content) directly in the Supabase query. Search overrides tag filters.
        *   *Client-side:* `journalStore` holds `loadedEntries` and `displayEntries`. Applying filters via the UI (`StaticAnalysisColumn` or search input) triggers client-side filtering (`filterLoadedEntries` function) on `loadedEntries` to update `displayEntries` *without* immediate refetching.
*   **Infinite Scroll:** Implemented in `src/app/page.tsx` using `useInView` from `react-intersection-observer`. Loads more entries via `journalStore`'s `loadMoreEntries` action.
*   **Voice Notes:**
    *   `/api/transcribe` route exists (`maxDuration: 60`). Handles transcription via OpenAI.
    *   **UI Location unclear:** Voice note creation UI (record button, etc.) is **NOT** currently in `Header.tsx`. Needs verification in the current UI.
*   **AI Tagging:** Background generation of Meta, Intent, Content tags via API routes (`/api/classify-meta`, `/api/classify-intent`, `/api/tags`). Updates pushed to client via Supabase Realtime and handled by `journalStore` (`updateEntryTags`).
*   **Inline Editing (JournalEntry Component - `JournalEntry.tsx`):**
    *   **Tabs:** Ordered: **Original, Summary, Actions**. Summary tab always visible.
    *   **Summary Points:** Inline add/edit/delete fully implemented. Uses local component state, calls `updateEntrySummaryService`, shows `sonner` toasts, updates `journalStore` on success via `updateEntryTagsInStore`.
    *   **Action Items:** Inline add/edit/delete/toggle fully implemented. Uses local component state, calls `updateEntryActionsService`, shows `sonner` toasts, updates `journalStore` on success via `updateEntryTagsInStore`.
*   **Static Analysis Column (`StaticAnalysisColumn.tsx`):**
    *   **Implemented:** Displays top Meta, Intent, and Content tags based on *currently visible* `displayEntries` from `journalStore`.
    *   Shows count of visible entries.
    *   Allows clicking tags to apply client-side filters via `journalStore.setFilters` (clears search query).
*   **User Feedback:** `sonner` toasts used for inline editing success/errors and potentially other actions. `Toaster` set up in `src/app/layout.tsx`.
*   **Tag Highlighting:** Consistent tag colors applied in `JournalEntry` and `StaticAnalysisColumn` using `highlightedTagColors` state calculated in `journalStore`.

**3. Key Decisions & Rationale:**

*   **State Management (Zustand):** Centralized state (`journalStore.ts`) for entries, filters, loading status, but inline editing state managed locally in `JournalEntry.tsx`.
*   **Filtering (Hybrid):** Server-side for efficient loading/pagination/deep search; Client-side for responsive UI updates when changing filters on already loaded data.
*   **CRUD Refresh:** Add is optimistic. Edit/Delete update after server confirmation. Inline edits are optimistic locally, persist via services, then update global store.
*   **Static Analysis:** Provides insights based on visible data; filtering via tags uses client-side mechanism for responsiveness.
*   **Asynchronous AI Processing:** Entry creation/update triggers background AI tasks (tags, actions, summary) without blocking the UI. Updates arrive via Realtime.

**4. Testing Strategy & Workflow:**

*   **Goal:** To ensure code quality, prevent regressions, and enable confident refactoring through automated testing.
*   **Framework:** Vitest (configured via `vitest.config.mts`, `vitest.setup.ts`) and React Testing Library (`@testing-library/react`).
*   **Current Status:**
    *   Store tests (`src/stores/journalStore.test.ts`) exist but are outdated and need fixing (*current priority*).
    *   No component tests exist currently.
*   **Workflow Integration (Goal):**
    *   **During Development:** Use watch mode (e.g., `npm test -- --watch`) for instant feedback while coding.
    *   **Pre-commit:** Implement pre-commit hooks (e.g., using `husky`) to run tests automatically before committing, preventing broken code entry.
    *   **Continuous Integration (CI):** Configure CI (e.g., GitHub Actions or Vercel CI) to run linters and the full test suite on every Pull Request. Block merges if checks fail.
*   **Priorities:**
    1.  Fix existing store tests (`journalStore.test.ts`).
    2.  Add component tests, starting with `StaticAnalysisColumn.tsx` and then `JournalEntry.tsx`.
    3.  Implement CI checks.
    4.  Implement pre-commit hooks.

**5. Potential Issues / Areas for Review:**

*   **(95) Outdated/Failing Zustand Store Tests:** See Section 4. *Actively being addressed.*
*   **(90) Lack of Component Testing:** See Section 4. High priority after store tests are fixed.
*   **(85) Complex `JournalEntry.tsx` Component:** High complexity makes it a prime candidate for component testing and potential refactoring.
*   **(75) Hybrid Filtering Complexity & Potential Scalability Issue:** The client-side filtering logic (`filterLoadedEntries`) needs specific tests once store tests are updated.
*   **(70) Voice Note UI/UX Uncertainty:** Location/behavior needs verification.
*   **(60) Complex `journalStore.ts`:** Could benefit from ongoing refactoring, guided by tests.


**6. Naming Conventions & Other Details:** Seem generally consistent with historical instructions. Voice transcription limit (`maxDuration: 60`) confirmed.


---

## Historical Instructions & Notes (May Contain Outdated Information)

**AI Collaboration Note:** Continuously analyze for problems/risks. Notify the user if any internal/controllable risk score is assessed at 70/100 or higher.
**Development Environment Note:** User is developing within the Cursor editor.
**MAINTENANCE NOTE:** This document is critical for context but requires frequent updates to stay synchronized with the codebase. Please update it after significant feature changes, refactors, or bug fixes.

## 1. Project Overview

**Goal:** ThoughtKeeper is a modern journaling application designed to help users preserve and organize their thoughts and reflections, enhanced with AI-powered insights.

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
4.  **Environment Variables:** Create a `.env.local` file with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `OPENAI_API_KEY`.
5.  **Google Cloud Project:** Set up OAuth credentials for Google Sign-In, obtaining a Client ID and Secret.
6.  **Supabase Config:**
    *   Enter Google Client ID/Secret in Supabase Auth Provider settings.
    *   Configure Site URL and Redirect URIs in Supabase Auth settings.
    *   Apply database migrations (`supabase/migrations`) using `supabase db push` (if using Supabase CLI locally) or via the Supabase dashboard SQL editor.
7.  **Vercel Project:** Create a Vercel project linked to the GitHub repository. Configure the same environment variables as in `.env.local` in the Vercel project settings.
8.  **Run Locally:** `npm run dev`
9.  **Deploy:** Push to `main` branch triggers automatic Vercel deployment.

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