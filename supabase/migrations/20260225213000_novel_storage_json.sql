-- Novel storage (JSON-based, user-owned)
CREATE TABLE public.novels (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Anonymous',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX novels_user_id_idx ON public.novels(user_id);
CREATE INDEX novels_user_updated_idx ON public.novels(user_id, updated_at DESC);

ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own novels"
  ON public.novels FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own novels"
  ON public.novels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own novels"
  ON public.novels FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own novels"
  ON public.novels FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_novels_updated_at
  BEFORE UPDATE ON public.novels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional import state for one-time local migration
CREATE TABLE public.user_migrations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  novels_imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own migration state"
  ON public.user_migrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own migration state"
  ON public.user_migrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own migration state"
  ON public.user_migrations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_migrations_updated_at
  BEFORE UPDATE ON public.user_migrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
