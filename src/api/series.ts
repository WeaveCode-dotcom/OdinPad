/**
 * API domain: book series
 * Thin typed wrappers around the `book_series` table.
 * Business logic lives in `src/lib/series-service.ts`.
 */
import { supabase } from "@/integrations/supabase/client";

export interface BookSeriesRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchBookSeries(userId: string): Promise<BookSeriesRow[]> {
  const { data, error } = await supabase
    .from("book_series")
    .select("id, user_id, title, description, created_at, updated_at")
    .eq("user_id", userId)
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BookSeriesRow[];
}

export async function createBookSeriesRow(input: {
  userId: string;
  title: string;
  description?: string | null;
}): Promise<BookSeriesRow> {
  const { data, error } = await supabase
    .from("book_series")
    .insert({ user_id: input.userId, title: input.title, description: input.description ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as BookSeriesRow;
}

export async function updateBookSeriesRow(
  id: string,
  patch: { title?: string; description?: string | null },
): Promise<void> {
  const { error } = await supabase.from("book_series").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBookSeriesRow(id: string): Promise<void> {
  const { error } = await supabase.from("book_series").delete().eq("id", id);
  if (error) throw error;
}
