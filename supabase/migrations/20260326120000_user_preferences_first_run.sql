-- First-run checklist (post-onboarding) and onboarding skip reason.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS first_run_novel_created boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_run_idea_web_visited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_run_write_opened boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_skip_reason text;

COMMENT ON COLUMN public.user_preferences.first_run_novel_created IS 'User created or opened a manuscript (dashboard/library)';
COMMENT ON COLUMN public.user_preferences.first_run_idea_web_visited IS 'User visited global Idea Web inbox or completed capture';
COMMENT ON COLUMN public.user_preferences.first_run_write_opened IS 'User opened Write mode in the workspace';
COMMENT ON COLUMN public.user_preferences.onboarding_skip_reason IS 'Optional reason when skipping onboarding (survey)';
