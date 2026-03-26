-- Corrective: idea_web_entry_revisions was missing from the DB despite migration 20260325120000
-- being recorded as applied. Re-creates the table, index, RLS policy, and trim trigger.

CREATE TABLE IF NOT EXISTS public.idea_web_entry_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id TEXT NOT NULL REFERENCES public.idea_web_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idea_web_entry_revisions_entry_created_idx
  ON public.idea_web_entry_revisions (entry_id, created_at DESC);

ALTER TABLE public.idea_web_entry_revisions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'idea_web_entry_revisions'
      AND policyname = 'Users manage own idea_web_entry_revisions'
  ) THEN
    CREATE POLICY "Users manage own idea_web_entry_revisions"
      ON public.idea_web_entry_revisions FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.trim_idea_web_entry_revisions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.idea_web_entry_revisions r
  USING (
    SELECT id
    FROM (
      SELECT id,
        ROW_NUMBER() OVER (PARTITION BY entry_id ORDER BY created_at DESC) AS rn
      FROM public.idea_web_entry_revisions
      WHERE entry_id = NEW.entry_id
    ) x
    WHERE x.rn > 50
  ) old
  WHERE r.id = old.id;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'idea_web_entry_revisions_trim'
  ) THEN
    CREATE TRIGGER idea_web_entry_revisions_trim
      AFTER INSERT ON public.idea_web_entry_revisions
      FOR EACH ROW
      EXECUTE FUNCTION public.trim_idea_web_entry_revisions();
  END IF;
END$$;
