# AI Development Instructions for ThoughtKeeper

**Document Version:** 2.5.4 (Basic Auth/RLS Implemented)
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
*   UI Components: shadcn/ui, **react-intersection-observer**, `@supabase/auth-ui-react`
*   Icons: lucide-react
*   Database: Supabase (PostgreSQL) - Includes DB Migrations via Supabase CLI
*   Authentication: **Supabase Auth** (Email/Password enabled)
*   AI Backend: OpenAI API (via `openai` npm package)
*   Testing: **Vitest** (Unit tests for Zustand store)
*   Deployment: Netlify (via GitHub integration)
*   Code Storage: GitHub

**Core Features Implemented:**
*   **Authentication:** Basic email/password signup and login implemented using Supabase Auth and `@supabase/auth-ui-react`. App conditionally renders Auth UI or Journal UI.
*   **Row Level Security (RLS):** RLS is **ENABLED** on the `entries` table. Basic policies are in place ensuring users can only access/modify their own entries (based on `user_id` matching `auth.uid()`).
*   **Layout:** Three-column layout on large screens.
*   **Journal Entry CRUD:** Creation, viewing, editing, and deletion via Dialog Modal (now respects RLS).
    *   New entries are correctly associated with the logged-in user's ID.
*   **Continuous Feed & Infinite Scroll:** Displays entries chronologically, grouped by date.
    *   Uses `react-intersection-observer` for infinite scroll.
*   Multiple entries allowed per day.
*   **Centralized State:** Application state managed by **Zustand store** (`src/stores/journalStore.ts`).
*   **Data Service Layer:** Supabase CRUD operations abstracted into `src/lib/entryService.ts`.
    *   `fetchEntriesPaginatedService` handles fetching entries with **server-side filtering and pagination**, respecting RLS.
    *   `addEntryService` now includes `user_id`.
*   **Centralized Types:** Core types defined in `src/types/index.ts`.
*   **Unit Tested Store:** Basic store tests exist. **Verification needed.**
*   **Entry Type Tracking:** DB column and logic implemented.
*   **Entry Card Redesign:** Footer metadata layout, unified tag shape.
*   Data persistence using **Supabase**.
*   **Dual Tagging System (Meta, Intent, Content):** Auto-generated on new entry save (background process).
*   **Server-Side Filtering & Search: COMPLETE**.
*   **Consistent Tag Colors:** Calculated based on loaded entries.
*   **Improved Filter UX:** Active filters displayed.
*   **Main Content Controls:** Consolidated top bar, responsive buttons.
*   Rich Text Editor (TipTap) used.
*   Static Analysis Column: Displays top tags based on loaded entries.
*   **Voice Recording & Transcription: COMPLETE**.

**AI Features Implemented / Status:**
*   Tag generation on new entry save.
*   Voice Transcription on new voice note save.
*   **NOTE:** Tag re-generation on *edit* is **not** implemented.

**Deployment Status:** Deployed to Netlify, CI from `main`.

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

## 4. Key Decisions & Rationale (Updated)
*   **State Management (Zustand):** Centralized state.
*   **Data Access Layer (`entryService.ts`):** Centralized DB interactions.
*   **Continuous Feed & Filtering:** Uses server-side filtering and pagination for scalability and correctness.
*   **CRUD Refresh:** Add ops optimistically update UI; Edit/Delete modify client state directly (potential refinement needed).
*   **Centralized Tag Color Logic:** Consistent tag appearance.
*   **Voice Note Creation Flow:** Direct creation without editor.
*   **Authentication/RLS:** Implemented basic Supabase Auth (Email) and RLS on `entries` table for essential security.

## 5. Future Development Considerations & Improvements (Updated)
1.  **Refine Auth UX:** Improve error handling, redirects, password reset flow, add providers (Google etc.).
2.  **Handle Existing Data:** Assign `user_id` to pre-RLS entries if needed for User 1.
3.  **Make `user_id` Non-Nullable:** Alter `entries` table column constraint once existing data is handled.
4.  **Verify/Update Unit Tests:** Crucial after recent changes.
5.  **Improve CRUD UX:** Refine updates after Edit/Delete/Add.
6.  **Refine Sidebar:** Implement date navigation or other tools.
7.  **Populate Static Analysis Column:** Implement meaningful analysis.
8.  **Complete Rich Text Editing:** Ensure formatting preservation.
9.  **Refine AI Features:** Tag re-gen on edit, summaries, cost optimization.
10. **Improve Mobile Responsiveness & Test Thoroughly.**
11. **Robust Error Handling & User Feedback.**
12. **Address Console Warnings/Errors.**

## 6. Critical Information & Risks (UPDATED CONTENT)

Stack-ranked list of known problems and risks based on assessed score:

1.  **AI Feature Dependency & Cost (Score: ~60/100)**
    *   **Problem:** Relies on external AI APIs (OpenAI). Introduces dependency risks (downtime, changes) and operational costs.
2.  **Auth UX / Features Incomplete (Score: ~40/100) [NEW]**
    *   **Problem:** Current Auth is basic (Email only, minimal UX). Missing features like password reset, robust error handling, other providers.
3.  **State Management Complexity (Score: ~20/100)**
    *   **Problem:** Inherent complexity in managing application state. Mostly mitigated by Zustand refactor.
4.  **Prop Drilling (Score: ~15/100)**
    *   **Problem:** Significantly reduced by Zustand. Minimal risk.

*(Removed "RLS Disabled" risk as basic RLS is now implemented)*

## 7. Current Branch Status 
*   `main`: Contains latest updates including basic Auth/RLS implementation.

## 8. Next Steps / Priorities (Revised)
1.  **(Optional but Recommended) Assign `user_id` to existing entries for User 1.**
2.  **Refine Auth UX / Add Features:** Password reset, error handling, etc. (See Future Dev #1)
3.  **Verify/Update Unit Tests:** (See Future Dev #4).
4.  **(Remaining priorities shift down)**

## 9. Voice Recording Limits (IMPORTANT) (Renumbered, previously 8)

*   **Serverless Timeout:** The `/api/transcribe` route has a `maxDuration` of 60 seconds (set in the file). This is the primary constraint.
*   **Practical Limit:** Due to the server timeout covering upload + Whisper processing + response, users should be advised to keep recordings around **1-2 minutes** for reliability.
*   **Hard Limit:** Recordings longer than **~3-4 minutes** are very likely to hit the 60-second timeout and fail.
*   **Whisper Limit:** The OpenAI Whisper API has a 25MB file size limit, which is usually much longer than the serverless timeout allows.