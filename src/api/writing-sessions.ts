import { supabase } from "@/integrations/supabase/client";

// writing_sessions is not yet in the generated types; cast to bypass until next `gen types` run.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export interface WritingSessionRow {
  id: string;
  userId: string;
  novelId: string | null;
  startedAt: string;
  endedAt: string;
  durationSecs: number;
  wordsWritten: number;
  createdAt: string;
}

export async function logWritingSession(input: {
  userId: string;
  novelId?: string | null;
  startedAt: string;
  endedAt: string;
  durationSecs: number;
  wordsWritten: number;
}): Promise<void> {
  const { error } = await db.from("writing_sessions").insert({
    user_id: input.userId,
    novel_id: input.novelId ?? null,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    duration_secs: input.durationSecs,
    words_written: input.wordsWritten,
  });
  if (error) throw error;
}

export async function fetchRecentWritingSessions(userId: string, limit = 20): Promise<WritingSessionRow[]> {
  const { data, error } = await db
    .from("writing_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    novelId: r.novel_id as string | null,
    startedAt: r.started_at as string,
    endedAt: r.ended_at as string,
    durationSecs: r.duration_secs as number,
    wordsWritten: r.words_written as number,
    createdAt: r.created_at as string,
  }));
}
