-- Cosmetic Foundations badge (first-run “three wins” complete). Independent of Odyssey word ranks.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS foundations_badge_unlocked boolean NOT NULL DEFAULT false;

UPDATE public.user_preferences
SET foundations_badge_unlocked = true
WHERE first_run_novel_created
  AND first_run_idea_web_visited
  AND first_run_write_opened;

COMMENT ON COLUMN public.user_preferences.foundations_badge_unlocked IS 'Unlocked when all first_run_* checklist flags are true; cosmetic only.';
