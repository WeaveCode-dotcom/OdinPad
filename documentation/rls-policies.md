# Row Level Security (RLS)

OdinPad expects **RLS enabled** on user-owned tables with policies that restrict reads/writes to `auth.uid() = user_id` (or equivalent). Policies are defined in `supabase/migrations/`.

## Tables with user-scoped policies (typical pattern)

| Area                | Tables                                                                                 | Pattern                |
| ------------------- | -------------------------------------------------------------------------------------- | ---------------------- |
| Profile             | `profiles`                                                                             | `user_id = auth.uid()` |
| Preferences & stats | `user_preferences`, `user_stats_daily`, `user_daily_quotes`, `user_quote_fingerprints` | `user_id = auth.uid()` |
| Manuscripts         | `novels`                                                                               | `user_id = auth.uid()` |
| Idea Web            | `idea_web_entries`, `idea_web_links`, `idea_web_entry_revisions`                       | `user_id = auth.uid()` |
| Sandbox             | `sandbox_*`                                                                            | `user_id = auth.uid()` |

Exact policy names and `USING` / `WITH CHECK` clauses are in the migration that introduced each table.

## Verification

- In the Supabase Dashboard: **Authentication** users cannot read another user’s rows when querying as the anon key with a JWT.
- Optional: run manual SQL as two different test users and confirm `SELECT` counts match ownership.

## `supabase/tests/rls_smoke.sql`

If present, contains commented examples for ad-hoc checks in the SQL Editor (not run automatically in this repo’s CI).
