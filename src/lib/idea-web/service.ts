import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  IdeaWebEntry,
  IdeaWebEntryRevision,
  IdeaWebLink,
  IdeaWebRevisionSnapshot,
  IdeaWebRevisionTrigger,
  IdeaWebStatus,
} from "@/types/idea-web";

function rowToEntry(r: Record<string, unknown>): IdeaWebEntry {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    novelId: (r.novel_id as string | null) ?? null,
    title: (r.title as string) ?? "",
    body: (r.body as string) ?? "",
    status: (r.status as IdeaWebStatus) ?? "seed",
    ideaType: (r.idea_type as string) ?? "misc",
    category: (r.category as string | null) ?? null,
    mood: (r.mood as string | null) ?? null,
    sourceType: (r.source_type as string) ?? "original",
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    pinned: Boolean(r.pinned),
    metadata: (typeof r.metadata === "object" && r.metadata !== null ? r.metadata : {}) as Record<string, unknown>,
    harvestedAt: (r.harvested_at as string | null) ?? null,
    harvestTargetNovelId: (r.harvest_target_novel_id as string | null) ?? null,
    remindAt: (r.remind_at as string | null) ?? null,
    deletedAt: (r.deleted_at as string | null) ?? null,
    createdAt: (r.created_at as string) ?? "",
    updatedAt: (r.updated_at as string) ?? "",
  };
}

function rowToLink(r: Record<string, unknown>): IdeaWebLink {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    fromEntryId: r.from_entry_id as string,
    toEntryId: r.to_entry_id as string,
    kind: (r.kind as IdeaWebLink["kind"]) ?? "manual",
    createdAt: (r.created_at as string) ?? "",
  };
}

export async function fetchIdeaWebEntries(userId: string): Promise<IdeaWebEntry[]> {
  const { data, error } = await supabase
    .from("idea_web_entries")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => rowToEntry(r as Record<string, unknown>));
}

export async function fetchIdeaWebEntriesByNovel(userId: string, novelId: string | null): Promise<IdeaWebEntry[]> {
  const all = await fetchIdeaWebEntries(userId);
  if (novelId === null) return all.filter((e) => e.novelId === null);
  return all.filter((e) => e.novelId === novelId);
}

export async function createIdeaWebEntry(input: {
  userId: string;
  novelId: string | null;
  title: string;
  body: string;
  ideaType?: string;
  category?: string | null;
  status?: IdeaWebStatus;
  tags?: string[];
  pinned?: boolean;
  sourceType?: string;
  mood?: string | null;
  metadata?: Record<string, unknown>;
  id?: string;
}): Promise<IdeaWebEntry> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: input.userId,
    novel_id: input.novelId,
    title: input.title,
    body: input.body,
    idea_type: input.ideaType ?? "misc",
    category: input.category ?? null,
    status: input.status ?? "seed",
    tags: input.tags ?? [],
    pinned: input.pinned ?? false,
    source_type: input.sourceType ?? "original",
    mood: input.mood ?? null,
    metadata: (input.metadata ?? {}) as unknown as Json,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("idea_web_entries").insert(row).select("*").single();
  if (error) throw error;
  return rowToEntry(data as Record<string, unknown>);
}

export async function updateIdeaWebEntry(
  userId: string,
  id: string,
  patch: Partial<{
    novelId: string | null;
    title: string;
    body: string;
    ideaType: string;
    category: string | null;
    status: IdeaWebStatus;
    tags: string[];
    pinned: boolean;
    sourceType: string;
    mood: string | null;
    metadata: Record<string, unknown>;
    harvestedAt: string | null;
    harvestTargetNovelId: string | null;
    remindAt: string | null;
  }>,
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.novelId !== undefined) row.novel_id = patch.novelId;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.ideaType !== undefined) row.idea_type = patch.ideaType;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.pinned !== undefined) row.pinned = patch.pinned;
  if (patch.sourceType !== undefined) row.source_type = patch.sourceType;
  if (patch.mood !== undefined) row.mood = patch.mood;
  if (patch.metadata !== undefined) row.metadata = patch.metadata;
  if (patch.harvestedAt !== undefined) row.harvested_at = patch.harvestedAt;
  if (patch.harvestTargetNovelId !== undefined) row.harvest_target_novel_id = patch.harvestTargetNovelId;
  if (patch.remindAt !== undefined) row.remind_at = patch.remindAt;

  const { error } = await supabase.from("idea_web_entries").update(row).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function softDeleteIdeaWebEntry(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("idea_web_entries")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function upsertIdeaWebEntryLegacy(row: {
  id: string;
  user_id: string;
  novel_id: string | null;
  title: string;
  body: string;
  idea_type: string;
  category: string | null;
  pinned: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("idea_web_entries").upsert(
    {
      id: row.id,
      user_id: row.user_id,
      novel_id: row.novel_id,
      title: row.title,
      body: row.body,
      idea_type: row.idea_type,
      category: row.category,
      pinned: row.pinned,
      status: "seed",
      tags: [],
      source_type: "original",
      metadata: (row.metadata ?? { legacy: true }) as unknown as Json,
      created_at: row.created_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function fetchIdeaWebLinks(userId: string): Promise<IdeaWebLink[]> {
  const { data, error } = await supabase.from("idea_web_links").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => rowToLink(r as Record<string, unknown>));
}

export async function createIdeaWebLink(input: {
  userId: string;
  fromEntryId: string;
  toEntryId: string;
  kind?: IdeaWebLink["kind"];
}): Promise<IdeaWebLink> {
  const id = crypto.randomUUID();
  const row = {
    id,
    user_id: input.userId,
    from_entry_id: input.fromEntryId,
    to_entry_id: input.toEntryId,
    kind: input.kind ?? "manual",
  };
  const { data, error } = await supabase.from("idea_web_links").insert(row).select("*").single();
  if (error) throw error;
  return rowToLink(data as Record<string, unknown>);
}

export async function deleteIdeaWebLink(userId: string, linkId: string): Promise<void> {
  const { error } = await supabase.from("idea_web_links").delete().eq("id", linkId).eq("user_id", userId);
  if (error) throw error;
}

export function snapshotFromIdeaWebEntry(entry: IdeaWebEntry): IdeaWebRevisionSnapshot {
  return {
    title: entry.title,
    body: entry.body,
    status: entry.status,
    tags: [...entry.tags],
    ideaType: entry.ideaType,
    category: entry.category,
    mood: entry.mood,
    sourceType: typeof entry.sourceType === "string" ? entry.sourceType : "original",
    metadata: { ...(entry.metadata ?? {}) },
    novelId: entry.novelId,
  };
}

function rowToRevision(r: Record<string, unknown>): IdeaWebEntryRevision {
  const snap = r.snapshot as Record<string, unknown>;
  return {
    id: r.id as string,
    entryId: r.entry_id as string,
    userId: r.user_id as string,
    trigger: r.trigger as IdeaWebRevisionTrigger,
    snapshot: snap as unknown as IdeaWebRevisionSnapshot,
    createdAt: r.created_at as string,
  };
}

export async function createIdeaWebRevision(
  userId: string,
  entryId: string,
  trigger: IdeaWebRevisionTrigger,
  snapshot: IdeaWebRevisionSnapshot,
): Promise<IdeaWebEntryRevision> {
  const row = {
    entry_id: entryId,
    user_id: userId,
    trigger,
    snapshot,
  };
  // `idea_web_entry_revisions` is not yet in the generated types — cast via unknown.
  const db = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };
  const { data, error } = await db.from("idea_web_entry_revisions").insert(row).select("*").single();
  if (error) throw error;
  return rowToRevision(data as Record<string, unknown>);
}

export async function fetchIdeaWebRevisions(
  userId: string,
  entryId: string,
  limit = 50,
): Promise<IdeaWebEntryRevision[]> {
  const db = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };
  const { data, error } = await db
    .from("idea_web_entry_revisions")
    .select("*")
    .eq("entry_id", entryId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map((r) => rowToRevision(r));
}

export async function deleteIdeaWebRevisionsForEntry(userId: string, entryId: string): Promise<void> {
  const db = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> };
  const { error } = await db.from("idea_web_entry_revisions").delete().eq("entry_id", entryId).eq("user_id", userId);
  if (error) throw error;
}
