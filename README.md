# VibeKeep

A modern journaling application built with Next.js that helps you preserve and organize your thoughts and reflections.

## Tech Stack

- Next.js 13+ with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase (Auth, Database with RLS, Edge Functions potentially for transcription)
- Zustand (State Management)
- OpenAI API (via /api/transcribe endpoint for voice notes)

## Features Implemented

- User Authentication (Supabase Auth with Email/Password)
  - Separate `/signin` and `/signup` pages (minimalist UI: logo, form, link).
  - Sign-up page styled with dark gradient background and white card for visual distinction.
  - Redirects handled via `src/app/page.tsx`.
- Database: Supabase Postgres
  - `entries` table with `user_id`.
  - **Row Level Security (RLS)** configured and enabled for `entries` table.
- Text Entry Management:
  - Add, view, edit, delete entries.
  - Infinite scroll for loading entries.
  - Basic client-side search/filter (for loaded entries).
- Voice Note Recording:
  - Record audio using Web Audio API.
  - Real-time waveform visualization.
  - Transcription via `/api/transcribe` backend endpoint (calls OpenAI).
  - Transcribed text added as a new entry.
- UI:
  - Main feed layout with static analysis placeholder column.
  - Shadcn UI components with dark/light mode support.
  - Custom styling for date headers, tags.

## Current Status (As of last session)

- **Core functionality is stable.** RLS ensures data privacy.
- Authentication flow uses separate pages (`/signin`, `/signup`) with distinct styling.
- Google SSO is implemented and verified.
- Voice note recording and transcription are functional.
- Layout uses a two-column structure with header controls in the left column.
- Logout button functionality confirmed working in fixed position.
- Basic UI refinements (end-of-feed message) are done.
- Recent dependency updates addressed build warnings.

## Known Issues / Next Steps

This list prioritizes items based on estimated impact/urgency/value (score > 70/100).

**Current Problems (Priority > 70):**

1.  **Filtering/Search Scalability (Score: 85):** Current client-side filtering/search is not scalable for large datasets. Needs backend implementation.
2.  **Double "Processing..." Indicator (Score: 75):** Voice note submission can briefly show duplicate loading indicators due to local vs. global state overlap.
3.  **Error Handling Robustness (Score: 70):** User feedback for errors (data loading, saving, API calls) could be improved beyond console logs.

**Potential Opportunities / Incomplete Features (Value > 70):**

1.  **Implement Static Analysis Column (Score: 90):** The right-hand column UI exists but lacks the backend logic to calculate and display actual entry analysis (tags, trends, etc.).
2.  **Urgent/Important Matrix Classification (Score: 80):** Add functionality to classify entries (Urgent/Important) and display them in a 2x2 matrix view.
3.  **Data Export/Import (Score: 70):** Allow users to export their data for backup/portability.
4.  **AI-Generated Entry Score (0-99) (Score: 70):** Explore using AI to automatically score entries based on significance/actionability (more complex alternative to manual classification).

**Lower Priority / Future Considerations:**

-   Further UI/UX polishing (loading states, empty states, filter interactions).
-   Comprehensive automated testing (unit, integration, e2e).
-   Dedicated accessibility (a11y) review and improvements.

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/stephennewman/VibeKeep.git
```

2. Install dependencies:
```bash
cd VibeKeep
npm install
```

3. Create a `.env.local` file with your Supabase and OpenAI credentials:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional: If using Supabase locally or needing admin access on backend
# SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key 

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

4. Ensure your Supabase project has:
    - An `entries` table matching the structure used in the app (including `user_id`).
    - RLS enabled and policies created for the `entries` table (see `supabase/migrations`).
    - Email provider enabled in Auth settings.

5. Run Supabase migrations (if applicable, using Supabase CLI):
```bash
supabase db push
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

MIT 