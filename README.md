# ThoughtKeeper

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
  - Separate `/signin` and `/signup` pages.
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
- Authentication flow uses separate pages (`/signin`, `/signup`).
- Voice note recording and transcription are functional.
- **Layout corrected:** Main app uses a two-column layout with header controls integrated into the left column.
- Basic UI refinements (logout button position, end-of-feed message) are done.
- Recent dependency updates addressed build warnings.

## Known Issues / Next Steps

- **Double "Processing..." Indicator:** Potential UI issue where two processing indicators might briefly show after sending a voice note for transcription (local state vs. store state).
- **Static Analysis Column:** The right-hand column is currently a placeholder and needs implementation.
- **Error Handling:** Could be enhanced, especially around API calls (transcription, data loading).
- **UI/UX Refinements:** Further polishing (loading states, empty states, filter UX) is possible.

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/stephennewman/thoughtkeeper.git
```

2. Install dependencies:
```bash
cd thoughtkeeper
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