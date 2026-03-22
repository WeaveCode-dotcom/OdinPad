-- Onboarding, personalization preferences, and lightweight stats scaffolding.

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_step text NOT NULL DEFAULT 'quiz',
  onboarding_completed_at timestamptz,
  onboarding_deferred boolean NOT NULL DEFAULT false,
  writing_stage text,
  writing_style text,
  genres text[] NOT NULL DEFAULT '{}',
  primary_goal text,
  behavior_pace text,
  behavior_support text,
  default_framework_id text,
  preferred_workspace_mode text,
  theme text NOT NULL DEFAULT 'dark',
  font_family text NOT NULL DEFAULT 'Inter',
  font_size numeric NOT NULL DEFAULT 1,
  line_spacing numeric NOT NULL DEFAULT 1.75,
  typewriter_mode boolean NOT NULL DEFAULT false,
  daily_word_goal integer NOT NULL DEFAULT 500,
  weekly_word_goal integer NOT NULL DEFAULT 3500,
  pomodoro_minutes integer NOT NULL DEFAULT 25,
  reminder_daily boolean NOT NULL DEFAULT false,
  reminder_streak boolean NOT NULL DEFAULT true,
  reminder_progress_email text NOT NULL DEFAULT 'weekly',
  reminder_push_enabled boolean NOT NULL DEFAULT false,
  checklist_opening_scene_done boolean NOT NULL DEFAULT false,
  checklist_character_done boolean NOT NULL DEFAULT false,
  checklist_goal_done boolean NOT NULL DEFAULT false,
  guided_tour_completed_at timestamptz,
  first_100_words_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
ON public.user_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_stats_daily (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_date date NOT NULL DEFAULT current_date,
  words_written integer NOT NULL DEFAULT 0,
  session_count integer NOT NULL DEFAULT 0,
  project_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, stat_date)
);

ALTER TABLE public.user_stats_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily stats" ON public.user_stats_daily;
CREATE POLICY "Users can view own daily stats"
ON public.user_stats_daily
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily stats" ON public.user_stats_daily;
CREATE POLICY "Users can insert own daily stats"
ON public.user_stats_daily
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily stats" ON public.user_stats_daily;
CREATE POLICY "Users can update own daily stats"
ON public.user_stats_daily
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_stats_daily_updated_at ON public.user_stats_daily;
CREATE TRIGGER update_user_stats_daily_updated_at
BEFORE UPDATE ON public.user_stats_daily
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure preferences row exists when user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();
