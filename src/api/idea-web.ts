/**
 * API domain: idea-web
 * Thin typed wrappers around `idea_web_entries` and `idea_web_links`.
 * Business logic lives in `src/lib/idea-web/service.ts`.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type IdeaWebEntryRow = Database["public"]["Tables"]["idea_web_entries"]["Row"];
type IdeaWebEntryInsert = Database["public"]["Tables"]["idea_web_entries"]["Insert"];
type IdeaWebLinkRow = Database["public"]["Tables"]["idea_web_links"]["Row"];

export async function fetchIdeaWebEntryRows(userId: string): Promise<IdeaWebEntryRow[]> {
  const { data, error } = await supabase
    .from("idea_web_entries")
    .select("*")
    .eq("user_id", userId)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchIdeaWebEntryRowsPage(
  userId: string,
  { cursor, limit = 50 }: { cursor?: string; limit?: number },
): Promise<{ rows: IdeaWebEntryRow[]; nextCursor: string | null }> {
  let query = supabase
    .from("idea_web_entries")
    .select("*")
    .eq("user_id", userId)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("updated_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const nextCursor = rows.length === limit ? (rows[rows.length - 1]?.updated_at ?? null) : null;
  return { rows, nextCursor };
}

export async function insertIdeaWebEntryRow(row: IdeaWebEntryInsert): Promise<IdeaWebEntryRow> {
  const { data, error } = await supabase.from("idea_web_entries").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateIdeaWebEntryRow(
  id: string,
  patch: Partial<Omit<IdeaWebEntryInsert, "id" | "user_id">>,
): Promise<void> {
  const { error } = await supabase.from("idea_web_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function softDeleteIdeaWebEntryRow(id: string): Promise<void> {
  const { error } = await supabase.from("idea_web_entries").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
}

export async function fetchIdeaWebLinkRows(userId: string): Promise<IdeaWebLinkRow[]> {
  const { data, error } = await supabase.from("idea_web_links").select("*").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertIdeaWebLinkRow(
  row: Database["public"]["Tables"]["idea_web_links"]["Insert"],
): Promise<void> {
  const { error } = await supabase.from("idea_web_links").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteIdeaWebLinkRow(id: string): Promise<void> {
  const { error } = await supabase.from("idea_web_links").delete().eq("id", id);
  if (error) throw error;
}
