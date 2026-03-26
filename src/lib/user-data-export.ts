import { supabase } from "@/integrations/supabase/client";
import { fetchBookSeriesForUser } from "@/lib/series-service";

export type UserDataExportBundle = {
  exportedAt: string;
  version: 1;
  profile: unknown;
  preferences: unknown;
  novels: unknown[];
  bookSeries: unknown[];
  ideaWebEntries: unknown[];
  ideaWebLinks: unknown[];
  userStatsDaily: unknown[];
  userDailyQuotes: unknown[];
  userQuoteFingerprints: unknown[];
  userOdysseyPoints: unknown | null;
  userOdysseyBadges: unknown[];
};

/**
 * Fetches user-owned rows for GDPR-style portability (JSON download).
 * Best-effort: tables missing in a project are omitted or empty.
 */
export async function fetchUserDataBundle(userId: string): Promise<UserDataExportBundle> {
  const exportedAt = new Date().toISOString();

  const [
    profileRes,
    prefRes,
    novelsRes,
    ideasRes,
    linksRes,
    statsRes,
    quotesRes,
    printsRes,
    odysseyPointsRes,
    odysseyBadgesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("novels").select("*").eq("user_id", userId),
    supabase.from("idea_web_entries").select("*").eq("user_id", userId),
    supabase.from("idea_web_links").select("*").eq("user_id", userId),
    supabase.from("user_stats_daily").select("*").eq("user_id", userId),
    supabase.from("user_daily_quotes").select("*").eq("user_id", userId),
    supabase.from("user_quote_fingerprints").select("*").eq("user_id", userId),
    supabase.from("user_odyssey_points").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_odyssey_badges").select("*").eq("user_id", userId),
  ]);

  const rows = [
    profileRes,
    prefRes,
    novelsRes,
    ideasRes,
    linksRes,
    statsRes,
    quotesRes,
    printsRes,
    odysseyPointsRes,
    odysseyBadgesRes,
  ];
  for (const r of rows) {
    if (r.error) throw r.error;
  }

  // Fetch book series separately (uses its own retry wrapper).
  const bookSeriesData = await fetchBookSeriesForUser(userId).catch(() => []);

  return {
    exportedAt,
    version: 1,
    profile: profileRes.data ?? null,
    preferences: prefRes.data ?? null,
    novels: novelsRes.data ?? [],
    bookSeries: bookSeriesData,
    ideaWebEntries: ideasRes.data ?? [],
    ideaWebLinks: linksRes.data ?? [],
    userStatsDaily: statsRes.data ?? [],
    userDailyQuotes: quotesRes.data ?? [],
    userQuoteFingerprints: printsRes.data ?? [],
    userOdysseyPoints: odysseyPointsRes.data ?? null,
    userOdysseyBadges: odysseyBadgesRes.data ?? [],
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
