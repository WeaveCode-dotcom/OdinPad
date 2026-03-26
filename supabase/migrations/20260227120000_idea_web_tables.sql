-- Idea Web: global + per-novel entries and links (user-scoped)

CREATE TABLE public.idea_web_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id TEXT REFERENCES public.novels(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'seed',
  idea_type TEXT NOT NULL DEFAULT 'misc',
  category TEXT,
  mood TEXT,
  source_type TEXT DEFAULT 'original',
  tags TEXT[] NOT NULL DEFAULT '{}',
  pinned BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  harvested_at TIMESTAMPTZ,
  harvest_target_novel_id TEXT REFERENCES public.novels(id) ON DELETE SET NULL,
  remind_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idea_web_entries_user_id_idx ON public.idea_web_entries(user_id);
CREATE INDEX idea_web_entries_novel_id_idx ON public.idea_web_entries(novel_id);
CREATE INDEX idea_web_entries_user_updated_idx ON public.idea_web_entries(user_id, updated_at DESC);
CREATE INDEX idea_web_entries_tags_gin ON public.idea_web_entries USING GIN(tags);

CREATE TABLE public.idea_web_links (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_entry_id TEXT NOT NULL REFERENCES public.idea_web_entries(id) ON DELETE CASCADE,
  to_entry_id TEXT NOT NULL REFERENCES public.idea_web_entries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT idea_web_links_no_self CHECK (from_entry_id <> to_entry_id),
  CONSTRAINT idea_web_links_unique_pair UNIQUE (from_entry_id, to_entry_id)
);

CREATE INDEX idea_web_links_user_id_idx ON public.idea_web_links(user_id);
CREATE INDEX idea_web_links_from_idx ON public.idea_web_links(from_entry_id);
CREATE INDEX idea_web_links_to_idx ON public.idea_web_links(to_entry_id);

ALTER TABLE public.idea_web_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_web_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own idea_web_entries"
  ON public.idea_web_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own idea_web_links"
  ON public.idea_web_links FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_idea_web_entries_updated_at
  BEFORE UPDATE ON public.idea_web_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
