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

## 7) Guided Activation and Progressive Disclosure

`src/components/novel/NovelWorkspace.tsx`:

- guided activation banner and anchored overlay tour (`src/components/onboarding/GuidedTourOverlay.tsx`),
- expanded targets: plan mode, write mode, editor, codex, settings, review mode, dashboard return,
- persisted checklist completion in preferences,
- progressive disclosure: `review` tab hidden until core onboarding checklist is complete (or guided tour disabled by flag).

## 8) Quick Wins and Motivation

`src/components/novel/WriteView.tsx`:

- detects first 100-word milestone,
- stores `first_100_words_at`,
- shows celebratory toast.

`src/components/novel/Dashboard.tsx`:

- personalized summary block from preferences,
- onboarding checklist progress + action buttons.

## 9) Settings Command Center

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

## 10) Stats and Notification Scaffolding

- Stats utility: `src/lib/writer-stats.ts`
  - computes total words, daily average, project totals.
  - syncs daily snapshot rows to `user_stats_daily`.
- Notification abstraction: `src/lib/notifications.ts`
  - in-app/email/push-ready channel contract.
  - local queue + flush dispatcher scaffold.

Current strategy is hybrid:

- client-computed stats now,
- server daily aggregation table available (`user_stats_daily`) for future pipeline.

## 11) Feature Flags and Instrumentation

Feature flags in `src/lib/feature-flags.ts`:

- `VITE_FF_ONBOARDING_V2`
- `VITE_FF_SETTINGS_COMMAND_CENTER`
- `VITE_FF_GUIDED_TOUR`

Analytics wrapper: `src/lib/analytics.ts`

- onboarding start/quiz completion/skip/complete events,
- first-project creation event,
- book-creation funnel events (`started`, `template_selected`, `submitted`, `succeeded`, `failed`, `time_ms`).

## 12) Database Migrations and Security

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

## 13) Verification Status

Completed:

- Build passes (`npm run build`)
- Tests pass (`npm run test -- --run`)
- Lint checks on edited files pass
- Supabase migration applied and type generation updated

## 14) Known Gaps / Next Hardening

1. Notification channels are scaffolded; production email/push backend delivery is pending.
2. Stats are client-first with snapshot syncing; richer server aggregation jobs are not fully wired.
3. Collaboration/beta reader permissions are still future scope.
4. Review annotations persistence remains a separate follow-up.
5. Offline queueing for book creation retries is not yet implemented (current behavior preserves inputs and supports retry).
