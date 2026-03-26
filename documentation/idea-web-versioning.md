# Idea Web — versioning & future filters (plan)

## Current behavior (Feb 2026)

- **Single row per idea** in `idea_web_entries` (`updated_at` reflects last edit).
- **Inbox-first capture**: new rows use `novel_id IS NULL` until the user assigns a project or runs **Harvest** (which sets `novel_id`, `status`, `harvested_at`).
- **Idea Web** (`/inbox`) lists **all** ideas for the user with filters (project, status, tags, sort).

## Planned: versioning

**Goal:** immutable history when title/body/tags/status/project change, for audit and “restore this version”.

**Sketch schema (not applied until product confirms):**

```sql
-- idea_web_entry_versions
-- id, entry_id, user_id, version (int), snapshot jsonb (title, body, tags, status, novel_id),
-- created_at, created_by (user_id), change_summary text null
```

**App flow:**

1. On meaningful `update` to an entry, insert previous state into `idea_web_entry_versions` (or only when diff exceeds a threshold).
2. UI: “History” in entry detail drawer; “Restore” creates a new version row pointing at restored content.

## Planned: richer filters

- **Merged / expanded**: store in `metadata` (e.g. `metadata.mergedInto`, `metadata.branchOf`) when merge/split ships.
- **Labels vs tags**: optional `labels` JSON column or dedicated join table if labels become first-class.

## Related

- Migration placeholder: `supabase/migrations/20260228120000_idea_web_versioning_placeholder.sql` (comments only).
