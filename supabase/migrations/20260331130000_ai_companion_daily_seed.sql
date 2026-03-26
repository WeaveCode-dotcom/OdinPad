-- AI companion: cached daily seed prompts, weekly digests, user toggles.

CREATE TABLE IF NOT EXISTS public.daily_seed_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_date DATE NOT NULL,
  prompt TEXT NOT NULL,
  anchors_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, prompt_date)
);

CREATE INDEX IF NOT EXISTS daily_seed_prompts_user_date_idx
  ON public.daily_seed_prompts (user_id, prompt_date DESC);

ALTER TABLE public.daily_seed_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own daily seed prompts" ON public.daily_seed_prompts;
CREATE POLICY "Users manage own daily seed prompts"
  ON public.daily_seed_prompts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  summary TEXT NOT NULL,
  best_seed_id TEXT REFERENCES public.idea_web_entries(id) ON DELETE SET NULL,
  best_seed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS weekly_digests_user_week_idx
  ON public.weekly_digests (user_id, week_start DESC);

ALTER TABLE public.weekly_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own weekly digests" ON public.weekly_digests;
CREATE POLICY "Users manage own weekly digests"
  ON public.weekly_digests FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS ai_companion JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_preferences.ai_companion IS
  'Toggles: daily_prompt_enabled, auto_enrich_enabled, use_context_enabled, stretch_variants_enabled (omit or true = on).';
