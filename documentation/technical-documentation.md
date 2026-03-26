# OdinPad Technical Documentation

## 1) System Overview

OdinPad is a React + TypeScript writing platform for authors. The current implementation combines:

- Supabase auth + profile + account security controls,
- Supabase-backed novel persistence with strict per-user ownership,
- Onboarding V2 (quiz + profile modals + extensive workspace tour + post-tour project creation),
- global Profile & Settings command center,
- hybrid stats and notification scaffolding.

## 2) Runtime Stack

- Frontend: React 18, TypeScript, Vite 5
- Routing: React Router DOM 6
- Backend: Supabase Auth + Postgres + RLS
- UI: Tailwind CSS, shadcn/ui, Radix
- Animations: Framer Motion
- Testing: Vitest

## 3) Routing and Gate Logic

Defined in `src/App.tsx`:

- `/`:
  - unauthenticated -> `Landing`
  - authenticated + onboarding pending -> redirect to `/onboarding`
  - authenticated + onboarding complete/deferred -> `Index` under `NovelProvider`
- `/onboarding`: authenticated onboarding flow page
- `/settings`: authenticated settings command center page
- `/inbox`: authenticated **Idea Web** hub (all ideas; `NovelProvider`)
- `/sandbox`: redirects to `/` (standalone Sandbox hub removed; expansion tools live in **Brainstorm** mode inside a book)
- `/sandbox/:novelId`: redirects to `/` and selects that novel in **Brainstorm** mode (bookmark recovery; see `src/pages/SandboxRedirect.tsx`)
- `/auth/callback`: OAuth callback handling
- `/auth/update-password`: password reset completion

Gate utility: `src/lib/onboarding-gate.ts`

## 4) Auth, Profile, and Preferences

`src/contexts/AuthContext.tsx` now manages:

- session lifecycle and auth operations,
- profile read/write (`public.profiles`),
- preferences read/write (`public.user_preferences`),
- onboarding state (`onboardingCompleted`, `onboardingDeferred`),
- account security actions:
  - sign out,
  - sign out all sessions,
  - delete account (RPC: `delete_my_account`).

## 5) Onboarding V2 Architecture

Onboarding page: `src/pages/Onboarding.tsx`

Flow steps:

1. Quiz
2. Profile completion modals (3-step sequence)
3. Launch extensive workspace tour
4. Create first project after tour completion

Persistence behavior:

- step state persisted in `user_preferences.onboarding_step`,
- skip from onboarding routes to dashboard fallback and sets `onboarding_deferred`,
- skip from workspace tour marks completion and keeps user on current page,
- completion sets `onboarding_completed_at`.

Personalization mapper: `src/lib/personalization.ts`

- maps style/genres/goal (+ optional stage) -> recommended framework + workspace mode + highlighted tools.

## 6) First Project Scaffolding

Novel factory enhancements in `src/lib/novel-store.ts`:

- `createNovelWithOptions(...)` supports:
  - framework selection,
  - genre/premise,
  - target word count,
  - status hint.

Novel context enhancement in `src/contexts/NovelContext.tsx`:

- `addNovelWithOptions(...)`
- preferred mode fallback from user preferences when opening novel.

Book creation contract and orchestration:

- Shared service: `src/lib/book-creation.ts`
  - field normalization and validation (`title`, `genre`, `frameworkId` required),
  - duplicate-title soft warning (non-blocking),
  - numeric bounds for target word count,
  - template recommendation ranking from personalization + selected genre,
  - per-user draft-session persistence for create-modal recovery.
- Dashboard and onboarding now use the same creation validation rules before submitting.
- Post-create destination supports write-first default with plan-mode option.

## 7) Brainstorm (in-book expansion workspace)

- **Brainstorm** is a workspace mode in `NovelWorkspace` (`mode === 'brainstorm'`) and renders `SandboxShell` with `lockedNovelId` set to the active novel. All Supabase-backed sandbox tools (braindump, lists, visual, prompts, expansion, conversation, harvest, insights, split scratch) are scoped to that novel; there is no global “All projects” scope in this context.
- Legacy quick card notes (`brainstormNotes` on the novel) remain available as the **Quick notes** sub-tab while users migrate content into Braindump or other tools.
- Idea Web entry cards with an assigned book expose **Open in Brainstorm** (`openBookBrainstorm` in `NovelContext`).

## 8) Guided Activation and Progressive Disclosure

`src/components/novel/NovelWorkspace.tsx`:

- guided activation banner and anchored overlay tour (`src/components/onboarding/GuidedTourOverlay.tsx`),
- expanded targets: brainstorm, plan, write mode, editor, codex, settings, review mode, dashboard return (Idea Web lives at `/inbox`),
- persisted checklist completion in preferences,
- progressive disclosure: `review` tab hidden until core onboarding checklist is complete (or guided tour disabled by flag).

## 9) Quick Wins and Motivation

`src/components/novel/WriteView.tsx`:

- detects first 100-word milestone,
- stores `first_100_words_at`,
- shows celebratory toast.

`src/components/novel/Dashboard.tsx`:

- personalized summary block from preferences,
- onboarding checklist progress + action buttons.

## 10) Settings Command Center

`src/pages/Settings.tsx` provides six tabs:

1. Account
2. Writing
3. Goals & Notifications
4. Stats
5. Projects
6. Security & Privacy

Behavior:

- debounced autosave to `profiles` + `user_preferences`,
- toast-based failure feedback,
- stats export via CSV and print-to-PDF path.

## 11) Stats and Notification Scaffolding

- Stats utility: `src/lib/writer-stats.ts`
  - computes total words, daily average, project totals.
  - syncs daily snapshot rows to `user_stats_daily`.
- Notification abstraction: `src/lib/notifications.ts`
  - in-app/email/push-ready channel contract.
  - local queue + flush dispatcher scaffold.

Current strategy is hybrid:

- client-computed stats now,
- server daily aggregation table available (`user_stats_daily`) for future pipeline.

## 12) Feature Flags and Instrumentation

Feature flags in `src/lib/feature-flags.ts`:

- `VITE_FF_ONBOARDING_V2`
- `VITE_FF_SETTINGS_COMMAND_CENTER`
- `VITE_FF_GUIDED_TOUR`

Analytics wrapper: `src/lib/analytics.ts`

- onboarding start/quiz completion/skip/complete events,
- first-project creation event,
- book-creation funnel events (`started`, `template_selected`, `submitted`, `succeeded`, `failed`, `time_ms`).

## 13) Database Migrations and Security

Applied migrations include:

- `20260225154742_ab068920-c5d6-4193-a957-69218d7c72e4.sql`
- `20260225213000_novel_storage_json.sql`
- `20260226091000_profiles_select_own_only.sql`
- `20260226094000_add_delete_my_account_function.sql`
- `20260226103000_onboarding_preferences_stats.sql`

New tables:

- `user_preferences`
- `user_stats_daily`

Security posture:

- RLS enabled for all user-owned tables,
- own-row access model (`auth.uid() = user_id`) for select/insert/update,
- account deletion RPC restricted to authenticated users.
- novel bootstrap now enforces strict account isolation (no legacy local-book auto-import into authenticated accounts).

Novel ownership behavior:

- Every novel row is user-owned via `novels.user_id`.
- Reads and writes are performed with the authenticated user context.
- On authenticated bootstrap, the app loads only remote novels for that user.
- If no remote novels exist, the app seeds a new starter novel for that same user.
- Legacy local cache is not imported into authenticated accounts.

## 14) Idea Web — applying Supabase migrations

The Idea Web feature uses tables defined in [`supabase/migrations/20260227120000_idea_web_tables.sql`](../supabase/migrations/20260227120000_idea_web_tables.sql) (`idea_web_entries`, `idea_web_links`).

**Option A — CLI (recommended after one-time link)**

1. Install Supabase CLI (or use `npx supabase`).
2. Log in: `npx supabase login`
3. Link this repo to your project: `npm run supabase:link` (or `npx supabase link --project-ref <YOUR_PROJECT_REF>`). The project ref is in the Supabase dashboard URL: `https://supabase.com/dashboard/project/<project_ref>`.
4. Push all pending migrations: `npm run supabase:push`

**Option B — SQL Editor (no CLI)**

1. Open Supabase Dashboard → **SQL Editor** → New query.
2. Paste the full contents of `supabase/migrations/20260227120000_idea_web_tables.sql` and run it once.

If `update_updated_at_column()` is missing in your project, ensure earlier migrations (e.g. initial schema) were applied first; that function is created in older migrations in this repo.

### Idea Web hub

- **Route:** `/inbox` — lists **all** `idea_web_entries` for the user (filter by project, status, tags, sort).
- **UX shell:** sticky toolbar (`IdeaWebInboxView`) with search, view mode (list/grid/map), **filter summary** + **Reset all** when any filter/search/sort/type differs from default, and **Select all in view**. **Filters** (project, status, tags, sort) live in a labeled cluster; on viewports below `lg`, **Advanced filters** is a **Collapsible**. **Ideation tools** (Groq editorial) is collapsible below `lg` and expanded by default on `lg+`. **Type** filter uses a segmented control with helper copy (“Filter by idea type”). Empty states distinguish **no ideas ever** vs **no matches** (reset + link to dashboard). **Selection bar** (fixed): count, Clear, Harvest. **Map** (`IdeaMapView`): when `novelId === 'all'`, the inbox passes **`entryIdsFilter`** so the map shows the **same filtered set** as list/grid (Branch A); a hint line explains this when the filter list is non-empty. Human-readable status strings: `src/lib/idea-web/status-labels.ts`.
- **Inbox-first:** new ideas are created with `novel_id IS NULL` (quick capture, dashboard seed, markdown import). Assignment uses `patchIdeaWebEntry` or **Harvest** (`harvestIdeaWebEntries`).
- **Smart subtitle:** under the Idea Web title, [`IdeaWebSmartSubtitle`](src/components/idea-web/IdeaWebSmartSubtitle.tsx) uses [`deriveIdeaWebAnalytics`](src/lib/idea-web/subtitle-insights.ts) on entries, **Idea Web links**, and **novels** (for book titles on cluster insights). Insights rotate across many angles: lifecycle, **category mix**, recency (7/30 days, oldest web, staleness), **tags** (unique count, top tags), **body richness** (thin/long notes, average length bucket), **cross-project** spread and top book by count, mood/source, **map** placement, **link graph** (connection count, participation, isolated nodes), plus status staples. Appends **Showing X of Y** when filters/search narrow the list; rotates templates every **4 minutes**; typewriter on line changes (`prefers-reduced-motion` shows full text). No extra API calls.
- **Workspace:** the per-book **Idea Web** mode tab was removed; ideas are managed from `/inbox` only.
- **Versioning plan:** `documentation/idea-web-versioning.md` and placeholder migration `supabase/migrations/20260228120000_idea_web_versioning_placeholder.sql`.
- **Typing / saves:** `updateIdea` in [`NovelContext`](src/contexts/NovelContext.tsx) debounces text saves (~500ms), applies optimistic updates to `ideaWebEntries`, and avoids refetch-per-keystroke. Pin and category changes save immediately.
- **Thread history:** table `idea_web_entry_revisions` (migration `20260325120000_idea_web_entry_revisions.sql`), capped at **50** rows per entry via trigger. Revisions on debounced edit sessions (throttled), status/project patches, manual checkpoint, and map layout save. UI: [`IdeaWebRevisionPanel`](src/components/idea-web/IdeaWebRevisionPanel.tsx). Export JSON and delete-all supported.
- **Automation:** [`user_preferences.idea_web_settings`](supabase/migrations/20260325121000_user_preferences_idea_web_settings.sql) JSON — inactivity days (default 90), auto-dormant, per-rule auto-status (seed→sprouting by word count, sprouting→growing by link count). Parsed in [`parseIdeaWebSettings`](src/lib/idea-web/idea-web-user-settings.ts); rules in [`auto-status.ts`](src/lib/idea-web/auto-status.ts). Settings UI: **Settings → Idea Web** tab.
- **Harvest:** [`IdeaWebHarvestDialog`](src/components/idea-web/IdeaWebHarvestDialog.tsx) supports **existing book** or **create new book** via `createNovelWithOptions` + `importNovel`, with optional premise prefill from selected bodies.

### Idea Web — Groq editorial (Edge Function)

**Ideation tools** on `/inbox` (`IdeationTools` in `src/components/idea-web/IdeaWebPromptTools.tsx`) call the Edge Function **`idea-web-groq`**, which proxies [Groq](https://groq.com/) chat completions with **editorial-only** system prompts (questions, not story prose). Requests may include **`contextPerIdea`** (status, type, tags, mood, book title) for tailored system prompts. **`stream: true`** returns a **Server-Sent Events** stream from Groq for `what_if` / `combine` / `expand`; the client uses [`streamIdeaWebGroq`](src/lib/idea-web/groq-editorial.ts) with `fetch` and falls back to `invokeIdeaWebGroq` if streaming fails.

**Secrets (Supabase Dashboard → Edge Functions → Secrets, or CLI):**

| Secret         | Required | Notes                                                                                                    |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `GROQ_API_KEY` | Yes      | From [Groq Console](https://console.groq.com/)                                                           |
| `GROQ_MODEL`   | No       | Defaults to `llama-3.3-70b-versatile` if unset (see [Groq models](https://console.groq.com/docs/models)) |

**Deploy:** `npx supabase functions deploy idea-web-groq` (project linked, logged in).

**Client:** `src/lib/idea-web/groq-editorial.ts` — `invokeIdeaWebGroq`, `streamIdeaWebGroq`, `buildIdeaWebGroqContexts`. If the function is missing or errors, the UI falls back to static prompts.

**Troubleshooting `invalid JWT`:** The app’s `VITE_SUPABASE_URL` / anon key must be the **same** Supabase project where `idea-web-groq` is deployed. Sessions belong to one project; if you change `.env`, sign **out** and **in** again (or clear site data). The Edge Function uses **`verify_jwt = false`** in `config.toml` so the API gateway does not reject requests when the client would otherwise fall back to sending the **anon key** as `Bearer` (see Supabase `fetchWithAuth`). **Authentication is still required** inside the function via `getUser()`. After changing `verify_jwt`, redeploy: `npx supabase functions deploy idea-web-groq`.

---

## 15) Verification Status

Completed:

- Build passes (`npm run build`)
- Tests pass (`npm run test -- --run`)
- Lint checks on edited files pass
- Supabase migration applied and type generation updated

## 16) Known Gaps / Next Hardening

1. Notification channels are scaffolded; production email/push backend delivery is pending.
2. Stats are client-first with snapshot syncing; richer server aggregation jobs are not fully wired.
3. Collaboration/beta reader permissions are still future scope.
4. Review annotations persistence remains a separate follow-up.
5. Offline queueing for book creation retries is not yet implemented (current behavior preserves inputs and supports retry).
