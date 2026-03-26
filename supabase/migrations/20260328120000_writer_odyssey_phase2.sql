-- Phase 2: Writer's Odyssey — points, badges, and gamification preferences (schema only; point rules ship later).

-- Optional aggregate Odyssey Points (server-authoritative grants recommended in Edge Functions).
CREATE TABLE IF NOT EXISTS public.user_odyssey_points (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_odyssey_points IS 'Writer''s Odyssey cumulative points; updated by trusted server logic.';

-- Earned badges (idempotent per user + badge_key).
CREATE TABLE IF NOT EXISTS public.user_odyssey_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS user_odyssey_badges_user_earned_idx
  ON public.user_odyssey_badges (user_id, earned_at DESC);

COMMENT ON TABLE public.user_odyssey_badges IS 'Writer''s Odyssey badges earned by the user (e.g. streak, Sandbox, tier milestones).';

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS gamification_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_odyssey_ui BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seasonal_events_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_preferences.gamification_enabled IS 'Master toggle for Writer''s Odyssey rewards and nudges.';
COMMENT ON COLUMN public.user_preferences.show_odyssey_ui IS 'Show Odyssey rank/journey UI when gamification_enabled is true.';
COMMENT ON COLUMN public.user_preferences.seasonal_events_enabled IS 'Opt in to time-boxed seasonal challenges (e.g. NaNo).';

ALTER TABLE public.user_odyssey_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_odyssey_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own user_odyssey_points" ON public.user_odyssey_points;
CREATE POLICY "Users manage own user_odyssey_points"
  ON public.user_odyssey_points FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own user_odyssey_badges" ON public.user_odyssey_badges;
CREATE POLICY "Users manage own user_odyssey_badges"
  ON public.user_odyssey_badges FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
