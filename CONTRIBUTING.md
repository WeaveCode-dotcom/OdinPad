# Contributing to OdinPad

Thank you for contributing! This document covers local setup, our PR process, database migrations, and feature flags.

---

## Local setup

```bash
# 1. Clone and install
git clone <repo-url>
cd OdinPad
npm install          # also installs Husky pre-commit hooks via `prepare` script

# 2. Configure environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# 3. Start local Supabase (requires Docker)
npx supabase start

# 4. Apply all migrations
npx supabase db reset

# 5. Regenerate TypeScript types after schema changes
npm run types:gen    # writes to src/integrations/supabase/types.ts

# 6. Start the dev server
npm run dev
```

### Useful scripts

| Command                                        | What it does                         |
| ---------------------------------------------- | ------------------------------------ |
| `npm run dev`                                  | Vite dev server with HMR             |
| `npm test`                                     | Vitest (watch mode)                  |
| `npm run test:coverage`                        | Vitest with v8 coverage + thresholds |
| `npm run lint`                                 | ESLint                               |
| `npm run format`                               | Prettier                             |
| `npx tsc --noEmit --project tsconfig.app.json` | Full type check                      |
| `npm run types:gen`                            | Supabase → TypeScript types          |

---

## Commit format

OdinPad uses [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg` hook enforces this.

```
<type>(<scope>): <short description>

# Types: feat, fix, chore, docs, refactor, test, ci, perf, style
# Scope: idea-web, novel, canvas, auth, settings, onboarding, dx, a11y, …

# Examples
feat(idea-web): add date range filter to inbox
fix(novel): prevent lost-update race in syncNovelsToRemote
a11y(write-view): add aria-live region for sprint completion
```

---

## Pull request process

1. Branch off `master`: `git checkout -b feat/<scope>/<short-description>`
2. Keep PRs focused — one feature or fix per PR.
3. Fill out the PR template (`.github/pull_request_template.md`).
4. CI must pass: lint, type check, tests, migration filename validation.
5. At least one review approval required before merge.
6. Squash-merge is preferred for feature PRs; merge commit for releases.

### What goes in a PR description

- **Why** this change is needed (link to issue if applicable).
- **What** was changed at a high level — no need to repeat the diff.
- **Screenshots** for any UI change.
- **Migration checklist** if you added a `supabase/migrations/` file.

---

## Database migrations

All schema changes go through forward-only SQL migration files.

```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
# Example: 20260401120000_writing_sessions.sql
```

Rules:

- **Never edit** a migration file once it has been merged.
- Always include RLS policies in the same migration file.
- Test locally before pushing: `npx supabase db reset`
- Verify with `supabase/tests/` (pgTAP) when adding tables or policies.
- The CI `validate-migrations` job rejects any filename that doesn't match `^[0-9]{14}_[a-z0-9_]+\.sql$`.

To push migrations to the remote project:

```bash
npm run supabase:push
```

---

## Feature flags

### Local flags (`src/lib/feature-flags.ts`)

Local flags are plain `import.meta.env` checks:

```ts
export const FLAG_CANVAS_STUDIO = import.meta.env.VITE_FLAG_CANVAS_STUDIO === "true";
```

Use these for features that don't need remote control.

### Remote flags (`app_remote_config` table)

Remote flags are stored in Supabase and fetched at runtime via `src/lib/remote-feature-flags.ts`. They override local flags and can be toggled without a redeploy.

To add a new remote flag:

1. Add a row in `app_remote_config` with `key = 'flag_name'` and a JSON `value`.
2. Add a migration if the flag needs to be seeded for all environments.
3. Use `useFeatureFlag('flag_name')` in components — this hook returns the live value with a loading state.

Prefer remote flags for experiments and gradual rollouts.

---

## Code conventions

See [CLAUDE.md](CLAUDE.md) for the full list. Quick summary:

- **No `any`** — use `unknown` + narrowing.
- **Word count** — always use `countWords()` from `src/lib/novel-metrics.ts`.
- **DB calls** — in `src/api/` only; import the typed client from `src/integrations/supabase/client.ts`.
- **CSS** — Tailwind only; no inline `style` objects except for dynamic values.
- **Icons** — Lucide only; add `aria-hidden` on decorative icons; pair icon-only buttons with `aria-label`.
- **Toasts** — import `toast` from `@/hooks/use-toast`, not from `sonner`.
- **Async** — `async/await` + `try/catch`; avoid `.then().catch()` chains.

---

## Accessibility

OdinPad targets WCAG 2.1 Level AA. When contributing UI changes:

- Provide visible focus indicators — don't remove `outline` without an accessible replacement.
- Test keyboard navigation for new interactive regions.
- Pair icon-only buttons with `aria-label`.
- Add `aria-describedby` on destructive action buttons pointing to a description of the consequence.
- Use `role="status"` / `aria-live` regions for async feedback (toasts, sprint completions, etc.).
- See `src/pages/AccessibilityStatement.tsx` for known exceptions.

---

## Getting help

Open a GitHub Issue or start a Discussion for questions, bug reports, and proposals.
