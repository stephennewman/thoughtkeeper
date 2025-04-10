# AI Development Instructions for ThoughtKeeper

**Document Version:** 1.0
**Date:** 2024-06-08

## 1. Project Overview & Current State

**Goal:** ThoughtKeeper is a modern journaling application designed to help users preserve and organize their thoughts and reflections, enhanced with AI-powered insights.

**Tech Stack:**
*   Framework: Next.js 14 (App Router)
*   Language: TypeScript
*   Styling: Tailwind CSS
*   UI Components: shadcn/ui
*   Icons: lucide-react
*   AI Backend: OpenAI API (via `openai` npm package)
*   Deployment: Netlify (via GitHub integration)
*   Code Storage: GitHub

**Core Features Implemented:**
*   Date-based journal entry creation, viewing, editing, and deletion.
*   Multiple entries allowed per day.
*   Basic sidebar navigation showing dates with entries (sorted chronologically).
*   Persistence using browser `localStorage`.

**AI Features Implemented:**
*   **Automatic Tag Generation:** On saving *new* entries, content is sent to `/api/tags` (OpenAI backend) to generate 3-5 relevant tags, stored with the entry.
*   **Macro Summary:** On-demand generation of a daily overview (mood, emoji, focus areas, key takeaway) via `/api/macro-summarize` (OpenAI backend) for the selected date's entries. Displayed in the sidebar when available.
*   **Individual Entry Summary:** Backend API (`/api/summarize`) and frontend function (`handleGenerateSummary`) exist, but UI integration might be pending/incomplete.

**Deployment Status:**
*   Deployed to Netlify at `https://thoughtkeeper.netlify.app` (URL assumed from `netlify.toml`).
*   Continuous deployment from the `main` branch on GitHub.
*   Requires `OPENAI_API_KEY` environment variable set in Netlify build settings.
*   Uses Node.js 20.x build environment on Netlify (changed from 22.x due to build issues).

## 2. Key Decisions & Rationale

*   **Storage (`localStorage`):** Chosen initially, likely for simplicity and enabling a quick, offline-first prototype. **This is the most critical known limitation.** (See Risks).
*   **AI Integration (OpenAI):** Leveraged OpenAI (`gpt-3.5-turbo`) for its strong NLP capabilities for tagging and summarization tasks. API calls are made via dedicated Next.js API routes.
*   **Deployment (Netlify):** Selected for its seamless integration with Next.js, GitHub, and ease of environment variable management. Netlify's Next.js plugin (`@netlify/plugin-nextjs`) is used.
*   **Security Headers (CSP):** Basic Content Security Policy and other security headers were added via `next.config.js` to mitigate risks like XSS and limit potential damage from compromised dependencies. Includes `unsafe-eval` and `unsafe-inline` currently, which should be reviewed/removed if possible for production hardening.

## 3. Future Development Considerations & Improvements (Ranked by Priority)

1.  **Replace `localStorage`:** This is the **highest priority** architectural change needed. Implement a proper backend database (e.g., Supabase, Firebase Firestore, PostgreSQL with Prisma, MongoDB) to ensure data persistence, enable scalability, allow cross-device syncing, and prevent data loss.
2.  **Implement Search Functionality:** Add the ability for users to search through their journal entries (as mentioned in README). This likely requires the database backend mentioned above.
3.  **Develop Journal Analytics:** Build out the analytics features mentioned in the README (requires backend).
4.  **Robust Error Handling:** Improve error handling for API calls (OpenAI, future backend), `localStorage` operations (until replaced), and provide clearer feedback to the user.
5.  **Refine AI Features:**
    *   Consider strategies to reduce OpenAI API costs (e.g., caching summaries, user settings for frequency, less frequent tag generation).
    *   Improve error handling and fallback states for AI features.
    *   Integrate the individual entry summary feature into the UI if desired.
6.  **State Management:** As the app grows, consider refactoring state management (currently primarily in `page.tsx`) using tools like Zustand, Jotai, or React Context for better maintainability.
7.  **Offline Strategy (Post-`localStorage`):** Define how the app should behave offline once a backend database is implemented (e.g., read-only mode, local caching with eventual consistency).
8.  **Security Hardening:** Revisit the CSP to remove `'unsafe-eval'` and `'unsafe-inline'` if possible after thorough testing. Continue dependency auditing (`npm audit`).

## 4. Critical Information & Risks

*   **Data Loss Risk (`localStorage`): THE MOST CRITICAL USER-FACING FLAW.** All user data is vulnerable to browser cache clearing or device issues. This *must* be addressed for the app to be reliable.
*   **`OPENAI_API_KEY` Security:** The key MUST be kept secure. It is correctly handled via Netlify environment variables and excluded from Git via `.gitignore`. **NEVER commit the key to Git.** Regularly rotate the key.
*   **API Costs:** OpenAI API usage incurs costs. Monitor usage and consider cost-optimization strategies (see Future Considerations). Ensure OpenAI account has billing alerts and hard limits set as a safety net. The risk of runaway calls from rapid UI interaction during saving has been partially mitigated by adding a loading state (`isSavingEntry`) to disable the save button during processing. However, consider server-side rate limiting for further protection.
*   **Supply Chain Attacks:** Dependencies can be a vulnerability vector. Use `npm ci` for builds, keep dependencies updated cautiously, and regularly run `npm audit`. The CSP provides a defense layer.
*   **Platform Security:** Relying on GitHub/Netlify introduces platform risk. Use strong MFA and least privilege access on these accounts. Maintain independent code backups.
*   **CSP Maintenance:** Any changes involving new external resources (CDNs, APIs, inline scripts/styles) may require updating the CSP in `next.config.js`. Test thoroughly after deployments involving such changes.
*   **XSS Risk:** Rendering user content via React's default JSX escaping (`{entry.content}`) currently mitigates basic XSS. Avoid `dangerouslySetInnerHTML`. Consider DOM sanitization (e.g., DOMPurify) if allowing safe HTML formatting is required in the future. 