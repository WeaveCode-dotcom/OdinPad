/**
 * API domain: writing stats
 * Thin typed wrappers around `user_daily_stats` / `user_stats_daily` and the
 * `increment_user_daily_words` RPC.
 * Helper logic (streak, range sums) lives in `src/lib/user-stats-daily.ts`.
 */
import { supabase } from "@/integrations/supabase/client";

export interface UserDailyStatRow {
  user_id: string;
  /** YYYY-MM-DD local date */
  stat_date: string;
  words_written: number;
  updated_at: string;
}

export async function fetchDailyStatsRange(
  userId: string,
  fromIso: string,
  toIso: string,
): Promise<UserDailyStatRow[]> {
  const { data, error } = await supabase
    .from("user_stats_daily")
    .select("user_id, stat_date, words_written, updated_at")
    .eq("user_id", userId)
    .gte("stat_date", fromIso)
    .lte("stat_date", toIso)
    .order("stat_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UserDailyStatRow[];
}

export async function fetchDailyStatsMap(userId: string, fromIso: string, toIso: string): Promise<Map<string, number>> {
  const rows = await fetchDailyStatsRange(userId, fromIso, toIso);
  return new Map(rows.map((r) => [r.stat_date, r.words_written]));
}

export async function incrementDailyWords(delta: number, statDate: string): Promise<void> {
  if (delta === 0) return;
  const { error } = await supabase.rpc("increment_user_daily_words", {
    p_delta: delta,
    p_stat_date: statDate,
  });
  if (error) throw error;
}

export async function upsertDailyStat(userId: string, statDate: string, wordsWritten: number): Promise<void> {
  const { error } = await supabase
    .from("user_stats_daily")
    .upsert(
      { user_id: userId, stat_date: statDate, words_written: wordsWritten, updated_at: new Date().toISOString() },
      { onConflict: "user_id,stat_date" },
    );
  if (error) throw error;
}
