-- First-class series (per user) + optional FK from novels for queries and integrity.

CREATE TABLE public.book_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT book_series_title_not_empty CHECK (length(trim(title)) > 0)
);

CREATE INDEX book_series_user_id_idx ON public.book_series(user_id);
CREATE INDEX book_series_user_updated_idx ON public.book_series(user_id, updated_at DESC);

ALTER TABLE public.book_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own book_series"
  ON public.book_series FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own book_series"
  ON public.book_series FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own book_series"
  ON public.book_series FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own book_series"
  ON public.book_series FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_book_series_updated_at
  BEFORE UPDATE ON public.book_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.book_series(id) ON DELETE SET NULL;

CREATE INDEX novels_series_id_idx ON public.novels(series_id) WHERE series_id IS NOT NULL;
