/**
 * API domain: novels
 * Thin typed wrappers around the `novels` table.
 * Business logic (normalisation, sync) lives in `src/lib/novel-store.ts`.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type NovelRow = Database["public"]["Tables"]["novels"]["Row"];
type NovelInsert = Database["public"]["Tables"]["novels"]["Insert"];
type NovelUpdate = Database["public"]["Tables"]["novels"]["Update"];

export async function fetchNovelRows(userId: string): Promise<NovelRow[]> {
  const { data, error } = await supabase
    .from("novels")
    .select("id, title, author, data, created_at, updated_at, series_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as NovelRow[];
}

export async function upsertNovelRow(row: NovelInsert): Promise<void> {
  const { error } = await supabase.from("novels").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function upsertNovelRows(rows: NovelInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from("novels").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

export async function updateNovelRow(id: string, patch: Omit<NovelUpdate, "id">): Promise<void> {
  const { error } = await supabase.from("novels").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNovelRow(id: string, userId?: string): Promise<void> {
  let query = supabase.from("novels").delete().eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const { error } = await query;
  if (error) throw error;
}
