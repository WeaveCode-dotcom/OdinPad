import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { assertAiEditorialEnabled } from "@/lib/remote-feature-flags";
import { getUserAccessTokenForEdgeFunctions } from "@/lib/supabase-user-access-token";
import { getLocalISODate, getWeekStartLocal } from "@/lib/user-stats-daily";

async function invokeCompanion<T>(body: Record<string, unknown>): Promise<T> {
  await assertAiEditorialEnabled();
  const token = await getUserAccessTokenForEdgeFunctions();
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>("idea-web-groq", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    let msg = error.message ?? "Companion request failed";
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      try {
        const j = (await res.json()) as { error?: string };
        if (typeof j.error === "string") msg = j.error;
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg);
  }
  const payload = data as { error?: string } | null;
  if (payload && typeof payload.error === "string" && payload.error) {
    throw new Error(payload.error);
  }
  return data as T;
}

export type DailyPromptResult = {
  prompt: string;
  anchors_used?: string[];
  cached?: boolean;
  promptDate?: string;
  fallback?: boolean;
  disabled?: boolean;
};

export async function fetchDailySeedPrompt(options?: {
  promptDate?: string;
  writingStreakDays?: number;
}): Promise<DailyPromptResult> {
  const promptDate = options?.promptDate ?? getLocalISODate();
  return invokeCompanion<DailyPromptResult>({
    mode: "daily_prompt",
    promptDate,
    writingStreakDays: options?.writingStreakDays,
  });
}

export async function enrichIdeaWebEntry(entryId: string): Promise<{
  enriched: boolean;
  reason?: string;
  tags?: string[];
  suggested_status?: string | null;
  one_line_summary?: string | null;
}> {
  return invokeCompanion({
    mode: "enrich_entry",
    entryId,
  });
}

export type StretchType = "paragraph" | "whatifs" | "opposite";

export async function stretchIdeaText(
  entryContent: string,
  stretchType: StretchType,
): Promise<{ stretchType: StretchType; text?: string; whatifs?: string[] }> {
  return invokeCompanion({
    mode: "stretch_idea",
    entryContent,
    stretchType,
  });
}

export type WeeklyDigestResult = {
  summary: string;
  best_seed_id?: string | null;
  best_seed_reason?: string | null;
  cached?: boolean;
  weekStart?: string;
  has_entries?: boolean;
};

export async function fetchWeeklyDigest(): Promise<WeeklyDigestResult> {
  const ws = getWeekStartLocal();
  const we = new Date(ws);
  we.setDate(we.getDate() + 7);
  const weekStart = getLocalISODate(ws);
  return invokeCompanion<WeeklyDigestResult>({
    mode: "weekly_digest",
    weekStart,
    weekFrom: ws.toISOString(),
    weekTo: we.toISOString(),
  });
}

export async function fetchStreakNudge(streakCount: number): Promise<{ nudge: string | null }> {
  if (streakCount < 1) return { nudge: null };
  return invokeCompanion<{ nudge: string | null }>({
    mode: "streak_nudge",
    streakCount,
  });
}

export type SparkSortLane = "theme" | "character" | "plot" | "world" | "misc";

export async function fetchSparkSortIdeas(
  ideas: { id: string; title?: string; body?: string }[],
): Promise<{ assignments: { id: string; lane: SparkSortLane }[] }> {
  return invokeCompanion({
    mode: "spark_sort_ideas",
    ideas,
  });
}
