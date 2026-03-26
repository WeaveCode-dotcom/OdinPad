import { supabase } from "@/integrations/supabase/client";

/** Local calendar date as YYYY-MM-DD (writing stats follow the writer's day). */
export function getLocalISODate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** Monday 00:00 local of the week containing `d`. */
export function getWeekStartLocal(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

/** Sum words_written for stat_date in [weekStartIso, weekEndIso] inclusive (local dates). */
export function sumWordsInRange(byDate: Map<string, number>, startIso: string, endIso: string): number {
  let sum = 0;
  const cur = parseLocalDateKey(startIso);
  const end = parseLocalDateKey(endIso);
  const walk = new Date(cur);
  while (walk <= end) {
    sum += byDate.get(getLocalISODate(walk)) ?? 0;
    walk.setDate(walk.getDate() + 1);
  }
  return sum;
}

/**
 * Consecutive days meeting threshold, counting backward from today.
 * If "today" is still in progress (below threshold), streak continues from yesterday.
 * When `restDateIso` matches today, today is treated as a rest day (does not break the streak).
 */
export function computeWritingStreak(
  byDate: Map<string, number>,
  dailyGoal: number,
  restDateIso?: string | null,
): number {
  const threshold = dailyGoal > 0 ? dailyGoal : 1;
  let streak = 0;
  const today = getLocalISODate();
  const todayWords = byDate.get(today) ?? 0;
  const cursor = parseLocalDateKey(today);
  if (restDateIso === today) {
    cursor.setDate(cursor.getDate() - 1);
  } else if (todayWords < threshold) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 4000; i++) {
    const key = getLocalISODate(cursor);
    const w = byDate.get(key) ?? 0;
    if (w >= threshold) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export async function incrementUserDailyWords(delta: number, statDate = getLocalISODate()): Promise<void> {
  if (delta === 0) return;
  const { error } = await supabase.rpc("increment_user_daily_words", {
    p_delta: delta,
    p_stat_date: statDate,
  });
  if (error) {
    console.warn("OdinPad: increment_user_daily_words failed", error.message);
  }
}

export async function fetchUserDailyStatsRange(
  userId: string,
  fromIso: string,
  toIso: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data, error } = await supabase
    .from("user_stats_daily")
    .select("stat_date, words_written")
    .eq("user_id", userId)
    .gte("stat_date", fromIso)
    .lte("stat_date", toIso);
  if (error) {
    console.warn("OdinPad: fetch user_stats_daily failed", error.message);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.stat_date, row.words_written);
  }
  return map;
}
