# Supabase migrations

Migrations live in `supabase/migrations/` and are applied in timestamp order. **Production:** use `npm run supabase:push` (with `SUPABASE_DB_PASSWORD` set) or run each file once in the Supabase SQL Editor.

## Idempotency

- Prefer `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and one-time policy names.
- Avoid re-running a migration that `CREATE POLICY` with the same name without `DROP POLICY IF EXISTS` first.

## Rollback (manual)

Supabase does not auto-generate `down` migrations. To reverse a change:

| Migration        | Rollback notes                                                               |
| ---------------- | ---------------------------------------------------------------------------- |
| Column additions | `ALTER TABLE ... DROP COLUMN IF EXISTS ...;` (only if no dependent objects). |
| New tables       | `DROP TABLE IF EXISTS ... CASCADE;` (destroys data).                         |
| RLS policies     | `DROP POLICY IF EXISTS "policy_name" ON table_name;`                         |
| Functions/RPC    | `DROP FUNCTION IF EXISTS ...;`                                               |

Keep a backup or use a staging project before destructive rollback.

## Inventory (high level)

See filenames in `supabase/migrations/` — they cover profiles, novels JSON storage, idea web, sandbox, user stats, preferences extensions, daily quotes, and first-run checklist columns.
