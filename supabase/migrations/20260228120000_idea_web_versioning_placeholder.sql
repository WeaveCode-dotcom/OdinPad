-- Placeholder for future Idea Web versioning (see documentation/idea-web-versioning.md).
-- Do not run until product approves schema; app does not depend on this table yet.
--
-- Example (not executed):
-- CREATE TABLE public.idea_web_entry_versions (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   entry_id uuid NOT NULL REFERENCES public.idea_web_entries(id) ON DELETE CASCADE,
--   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   version int NOT NULL,
--   snapshot jsonb NOT NULL,
--   created_at timestamptz NOT NULL DEFAULT now(),
--   change_summary text
-- );

SELECT 1;
