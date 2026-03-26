import { supabase } from "@/integrations/supabase/client";

async function withRetry<T>(fn: () => Promise<T>, opts?: { retries?: number; baseMs?: number }): Promise<T> {
  const retries = opts?.retries ?? 2;
  const baseMs = opts?.baseMs ?? 400;
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** attempt));
      }
    }
  }
  throw last;
}

export interface BookSeriesRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchBookSeriesForUser(userId: string): Promise<BookSeriesRow[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("book_series")
      .select("id, user_id, title, description, created_at, updated_at")
      .eq("user_id", userId)
      .order("title", { ascending: true });

    if (error) throw error;
    return (data ?? []) as BookSeriesRow[];
  });
}

export async function createBookSeries(
  userId: string,
  input: { title: string; description?: string | null },
): Promise<BookSeriesRow> {
  const title = input.title.trim();
  if (!title) throw new Error("Series title is required");

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("book_series")
      .insert({
        user_id: userId,
        title,
        description: input.description?.trim() || null,
      })
      .select("id, user_id, title, description, created_at, updated_at")
      .single();

    if (error) throw error;
    return data as BookSeriesRow;
  });
}

export async function updateBookSeries(
  userId: string,
  seriesId: string,
  patch: { title?: string; description?: string | null },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title.trim();
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("book_series").update(row).eq("id", seriesId).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteBookSeries(userId: string, seriesId: string): Promise<void> {
  const { error } = await supabase.from("book_series").delete().eq("id", seriesId).eq("user_id", userId);
  if (error) throw error;
}
