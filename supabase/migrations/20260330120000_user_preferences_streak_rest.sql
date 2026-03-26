-- Optional calendar day where streak pressure is paused (local date YYYY-MM-DD, cleared when not "today" in client).
alter table public.user_preferences
  add column if not exists streak_rest_date date null;

comment on column public.user_preferences.streak_rest_date is 'When set to the user''s local "today", streak logic treats that day as not breaking the chain.';
