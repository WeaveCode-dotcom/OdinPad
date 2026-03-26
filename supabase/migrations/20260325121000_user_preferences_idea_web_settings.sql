-- JSON settings for Idea Web automation (dormant days, auto-status rules, etc.)

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS idea_web_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
