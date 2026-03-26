-- AI daily quotes: one row per user per local calendar day + fingerprints to avoid repeats.

CREATE TABLE IF NOT EXISTS public.user_daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_date date NOT NULL,
  quote_text text NOT NULL,
  character_name text NOT NULL,
  work_title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_date)
);

CREATE TABLE IF NOT EXISTS public.user_quote_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS user_daily_quotes_user_date_idx ON public.user_daily_quotes (user_id, quote_date DESC);
CREATE INDEX IF NOT EXISTS user_quote_fingerprints_user_idx ON public.user_quote_fingerprints (user_id, created_at DESC);

ALTER TABLE public.user_daily_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quote_fingerprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own daily quotes" ON public.user_daily_quotes;
CREATE POLICY "Users manage own daily quotes"
ON public.user_daily_quotes FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own quote fingerprints" ON public.user_quote_fingerprints;
CREATE POLICY "Users manage own quote fingerprints"
ON public.user_quote_fingerprints FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
