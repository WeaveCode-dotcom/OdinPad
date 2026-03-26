# OdinPad — CLAUDE.md

Project conventions, architecture decisions, and key patterns for contributors (human and AI).

---

## Stack

| Layer      | Technology                                                       |
| ---------- | ---------------------------------------------------------------- |
| UI         | React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix)            |
| Routing    | React Router v6 (file-driven pages in `src/pages/`)              |
| State      | React Context (`NovelContext`, `AuthContext`, `AppShellContext`) |
| Backend    | Supabase (Postgres + Auth + Storage + Edge Functions)            |
| AI         | Groq via Supabase Edge Functions (`supabase/functions/`)         |
| Build      | Vite 5, Vitest                                                   |
| Animations | Framer Motion                                                    |

---

## Key directories

```
src/
  api/               Supabase query helpers (all DB calls go here)
  components/
    idea-web/        Idea Web inbox, map, entry cards
    layout/          AppLayout, AppSidebar, AppPageHeader, StudioLayout
    novel/           Dashboard, NovelWorkspace, WriteView, CodexPanel, …
    ui/              shadcn/ui primitives (do not edit without good reason)
  contexts/
    AuthContext.tsx   user, profile, preferences, updatePreferences
    NovelContext.tsx  novels, ideaWebEntries, ideaWebLinks, codex, canvas
  lib/               Pure utility functions (no React imports)
  pages/             Route-level components (lazy-loaded in App.tsx)
  types/
    novel.ts         Novel, Act, Chapter, Scene, CodexEntry, …
    idea-web.ts      IdeaWebEntry, IdeaWebLink, IdeaWebStatus
supabase/
  functions/         Edge Functions (Deno); each has its own index.ts
  migrations/        Forward-only SQL files; prefix YYYYMMDDHHMMSS_
```

---

## Architecture decisions

### Novel persistence

Novels are stored as a single JSONB blob in `novels.data` (Supabase). On load, `normalizeNovel()` in `src/lib/novel-store.ts` maps raw JSONB back to the `Novel` type. All DB calls route through `syncNovelsToRemote()` which has a concurrency guard (`_syncInProgress` flag + pending-sync drain) to prevent lost-update races.

### Idea Web vs. `Novel.ideas`

The `ideas: Idea[]` field on `Novel` is deprecated. All new idea management uses the `IdeaWebEntry` + `IdeaWebLink` tables via `NovelContext`. Do not add new code that touches `Novel.ideas`.

### Feature flags

Flags live in `src/lib/feature-flags.ts` (local) and are also remotely overridable via `app_remote_config` in Supabase. Prefer remote flags for experiments that should not require a redeploy.

### AI calls

AI editorial calls go through Supabase Edge Functions (`supabase/functions/idea-web-groq/`). Edge Functions hold the Groq API key — never expose it client-side. Per-user rate limiting (10 req/60 s burst) is applied in each function.

### Route lazy-loading

Every page in `src/App.tsx` is wrapped with `React.lazy()` + `Suspense`. The `LoadingScreen` component is the default fallback. Do not eagerly import page-level components.

### Error boundaries

Each route is wrapped in `<RouteErrorBoundary>` (see `src/App.tsx`). Add per-route boundaries when adding new routes.

---

## Coding conventions

- **No `any`** — prefer `unknown` + narrowing. TypeScript strict flags are incrementally enabled.
- **Word count** — always use `countWords()` from `src/lib/novel-metrics.ts`. Never inline `split(/\s+/).filter(Boolean).length`.
- **Supabase calls** — import the typed client from `src/integrations/supabase/client.ts`. All new DB access belongs in `src/api/`.
- **CSS** — Tailwind only; no inline style objects except for dynamic values (e.g., `style={{ height: px }}`). Follow the existing `border-2 border-neutral-900` brutalist aesthetic in new cards/panels.
- **Icons** — Lucide icons only. Add `aria-hidden` on decorative icons; do not use icons as the sole accessible label — pair with `aria-label` on the button.
- **Toasts** — import `toast` from `@/hooks/use-toast`, not from `sonner`.
- **Async patterns** — prefer `async/await` + `try/catch`; avoid `.then().catch()` chains.

---

## Running the project

```bash
cp .env.example .env        # fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev

# tests
npm test

# type check
npx tsc --noEmit --project tsconfig.app.json

# lint
npm run lint

# format
npm run format
```

---

## Supabase local dev

```bash
npx supabase start           # starts local Postgres + Auth + Edge Functions
npx supabase db reset        # applies all migrations cleanly
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## Pre-commit hooks (Husky)

After cloning, run `npm install` — the `prepare` script installs Husky automatically.

Hooks run on every commit:

- **pre-commit**: `lint-staged` (format + lint staged files) + `tsc --noEmit`
- **commit-msg**: `commitlint` (conventional commits required)

Commit format: `type(scope): message` — e.g. `feat(idea-web): add date range filter`

---

## Adding a new page

1. Create `src/pages/MyPage.tsx`
2. Add a lazy import + `<Route>` in `src/App.tsx` wrapped in `<RouteErrorBoundary>` + `<Suspense>`
3. Add a nav link in `src/components/layout/AppSidebar.tsx` if it should appear in the sidebar
4. Add a help section in `src/pages/Help.tsx` if users need guidance

---

## Adding a Supabase migration

1. Create `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Test locally: `npx supabase db reset`
3. Add RLS policies in the same migration; verify with `supabase/tests/`
4. Push to remote: `npm run supabase:push`

Do **not** modify existing migration files once merged.

---

## TypeScript strict mode migration

Two tsconfig files coexist intentionally:

| File                   | Purpose                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.app.json`    | Build + pre-commit type check. Strict flags are **off** by default; new violations here block CI.                     |
| `tsconfig.strict.json` | Opt-in strict checking for files actively being hardened. Run with `npx tsc --noEmit --project tsconfig.strict.json`. |

**How to move a file under strict mode:**

1. Fix all errors surfaced by `tsconfig.strict.json` in the target file.
2. Add the file path to `tsconfig.strict.json → include`.
3. Verify CI still passes on `tsconfig.app.json`.

Do **not** enable strict flags in `tsconfig.app.json` in a single PR — migrate file-by-file to avoid a wall of unrelated fixes.

**Workers (`src/workers/`)**

The Web Workers directory is scaffolded for offloading heavy synchronous operations (JSON serialization of large novels, word-count batch jobs) to background threads. Workers use `postMessage` / `onmessage` exclusively — no shared state. Document the purpose of any worker you add here in a leading comment block inside the worker file.
