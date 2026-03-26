-- Atomic increment for words_written on user_stats_daily (scene edit deltas).

CREATE OR REPLACE FUNCTION public.increment_user_daily_words(p_delta integer, p_stat_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_delta = 0 THEN
    RETURN;
  END IF;
  INSERT INTO public.user_stats_daily (user_id, stat_date, words_written, project_count, session_count)
  VALUES (uid, p_stat_date, GREATEST(0, p_delta), 0, 0)
  ON CONFLICT (user_id, stat_date)
  DO UPDATE SET
    words_written = GREATEST(0, user_stats_daily.words_written + p_delta),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_daily_words(integer, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_daily_words(integer, date) TO authenticated;
