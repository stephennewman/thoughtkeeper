# AI Development Instructions for ThoughtKeeper

**Document Version:** 2.5.5 (Vercel Deployment, Post-Onboarding Revert)
**Date:** 2024-07-26

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
*   UI Components: shadcn/ui, react-intersection-observer, @supabase/auth-ui-react
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

## 6. Known Issues / Next Steps (Prioritized > 70/100)

**Current Problems:**
1.  **Filtering/Search Scalability (85):** Current client-side filtering is not truly scalable.
2.  **Double "Processing..." Indicator (75):** Voice note submission UI glitch.
3.  **Error Handling Robustness (70):** Needs more user-facing feedback for errors.

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
*   **Voice Note Creation Flow:** Direct creation without editor.
*   **Authentication/RLS:** Implemented basic Supabase Auth (Email) and RLS on `entries` table for essential security.

## 9. Voice Recording Limits
*   **Serverless Timeout:** The `/api/transcribe` route has a `maxDuration` of 60 seconds (set in the file). This is the primary constraint.
*   **Practical Limit:** Due to the server timeout covering upload + Whisper processing + response, users should be advised to keep recordings around **1-2 minutes** for reliability.
*   **Hard Limit:** Recordings longer than **~3-4 minutes** are very likely to hit the 60-second timeout and fail.
*   **Whisper Limit:** The OpenAI Whisper API has a 25MB file size limit, which is usually much longer than the serverless timeout allows.