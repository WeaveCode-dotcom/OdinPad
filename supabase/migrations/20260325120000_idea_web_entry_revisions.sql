-- Idea Web entry revisions (thread history), max 50 per entry

CREATE TABLE public.idea_web_entry_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id TEXT NOT NULL REFERENCES public.idea_web_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idea_web_entry_revisions_entry_created_idx
  ON public.idea_web_entry_revisions (entry_id, created_at DESC);

ALTER TABLE public.idea_web_entry_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own idea_web_entry_revisions"
  ON public.idea_web_entry_revisions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

CREATE TRIGGER idea_web_entry_revisions_trim
  AFTER INSERT ON public.idea_web_entry_revisions
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_idea_web_entry_revisions();
