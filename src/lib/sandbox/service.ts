import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  SandboxBraindumpSession,
  SandboxConversation,
  SandboxExpansionSession,
  SandboxList,
  SandboxListItem,
  SandboxMap,
  SandboxMapEdge,
  SandboxMapNode,
  SandboxPromptEvent,
  SandboxTranscriptMessage,
} from "@/types/sandbox";

function rowBraindump(r: Record<string, unknown>): SandboxBraindumpSession {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    novelId: r.novel_id != null ? String(r.novel_id) : null,
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowList(r: Record<string, unknown>): SandboxList {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    novelId: r.novel_id != null ? String(r.novel_id) : null,
    name: String(r.name ?? ""),
    listType: String(r.list_type ?? "misc"),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowListItem(r: Record<string, unknown>): SandboxListItem {
  return {
    id: String(r.id),
    listId: String(r.list_id),
    userId: String(r.user_id),
    content: String(r.content ?? ""),
    rank: Number(r.rank ?? 0),
    favorite: Boolean(r.favorite),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowMap(r: Record<string, unknown>): SandboxMap {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    novelId: r.novel_id != null ? String(r.novel_id) : null,
    name: String(r.name ?? ""),
    mapType: String(r.map_type ?? "mindmap"),
    layoutData: (r.layout_data as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowNode(r: Record<string, unknown>): SandboxMapNode {
  return {
    id: String(r.id),
    mapId: String(r.map_id),
    userId: String(r.user_id),
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    content: String(r.content ?? ""),
    nodeType: String(r.node_type ?? "idea"),
    linkedIdeaId: r.linked_idea_id != null ? String(r.linked_idea_id) : null,
    linkedCodexId: r.linked_codex_id != null ? String(r.linked_codex_id) : null,
    color: r.color != null ? String(r.color) : null,
    status: r.status != null ? String(r.status) : null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowEdge(r: Record<string, unknown>): SandboxMapEdge {
  return {
    id: String(r.id),
    mapId: String(r.map_id),
    userId: String(r.user_id),
    sourceNodeId: String(r.source_node_id),
    targetNodeId: String(r.target_node_id),
    edgeType: String(r.edge_type ?? "default"),
    label: r.label != null ? String(r.label) : null,
    createdAt: String(r.created_at),
  };
}

function rowConversation(r: Record<string, unknown>): SandboxConversation {
  const raw = r.transcript;
  let transcript: SandboxTranscriptMessage[] = [];
  if (Array.isArray(raw)) {
    transcript = raw
      .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
      .map((x) => ({
        role: x.role === "assistant" ? "assistant" : "user",
        content: String(x.content ?? ""),
        at: x.at != null ? String(x.at) : undefined,
      }));
  }
  return {
    id: String(r.id),
    userId: String(r.user_id),
    novelId: r.novel_id != null ? String(r.novel_id) : null,
    elementType: String(r.element_type ?? "character"),
    elementId: r.element_id != null ? String(r.element_id) : null,
    title: String(r.title ?? ""),
    transcript,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowExpansion(r: Record<string, unknown>): SandboxExpansionSession {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    novelId: r.novel_id != null ? String(r.novel_id) : null,
    elementType: String(r.element_type ?? "character"),
    sourceIdeaId: r.source_idea_id != null ? String(r.source_idea_id) : null,
    templateId: String(r.template_id ?? "character"),
    expandedContent: (r.expanded_content as Record<string, unknown>) ?? {},
    promotedTo: r.promoted_to != null ? (r.promoted_to as Record<string, unknown>) : null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowPrompt(r: Record<string, unknown>): SandboxPromptEvent {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    novelId: r.novel_id != null ? String(r.novel_id) : null,
    promptType: String(r.prompt_type ?? ""),
    promptKey: String(r.prompt_key ?? ""),
    promptText: String(r.prompt_text ?? ""),
    userResponse: r.user_response != null ? String(r.user_response) : null,
    ideaWebEntryId: r.idea_web_entry_id != null ? String(r.idea_web_entry_id) : null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
  };
}

// --- Braindump ---

export async function fetchBraindumpSessions(
  userId: string,
  novelId: string | null | "all",
): Promise<SandboxBraindumpSession[]> {
  let q = supabase
    .from("sandbox_braindump_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (novelId !== "all" && novelId !== null) {
    q = q.eq("novel_id", novelId);
  } else if (novelId === null) {
    q = q.is("novel_id", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowBraindump(r as Record<string, unknown>));
}

export async function createBraindumpSession(input: {
  userId: string;
  novelId: string | null;
  title?: string;
  body?: string;
  id?: string;
}): Promise<SandboxBraindumpSession> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: input.userId,
    novel_id: input.novelId,
    title: input.title ?? "Braindump",
    body: input.body ?? "",
    metadata: {},
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from("sandbox_braindump_sessions").insert(row).select("*").single();
  if (error) throw error;
  return rowBraindump(data as Record<string, unknown>);
}

export async function updateBraindumpSession(
  userId: string,
  id: string,
  patch: Partial<{ title: string; body: string; novelId: string | null; metadata: Record<string, unknown> }>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.novelId !== undefined) row.novel_id = patch.novelId;
  if (patch.metadata !== undefined) row.metadata = patch.metadata;
  const { error } = await supabase.from("sandbox_braindump_sessions").update(row).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteBraindumpSession(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("sandbox_braindump_sessions").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

// --- Lists ---

export async function fetchSandboxLists(userId: string, novelId: string | null | "all"): Promise<SandboxList[]> {
  let q = supabase.from("sandbox_lists").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (novelId !== "all" && novelId !== null) {
    q = q.eq("novel_id", novelId);
  } else if (novelId === null) {
    q = q.is("novel_id", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowList(r as Record<string, unknown>));
}

export async function createSandboxList(input: {
  userId: string;
  novelId: string | null;
  name: string;
  listType: string;
  id?: string;
}): Promise<SandboxList> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: input.userId,
    novel_id: input.novelId,
    name: input.name,
    list_type: input.listType,
    metadata: {},
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from("sandbox_lists").insert(row).select("*").single();
  if (error) throw error;
  return rowList(data as Record<string, unknown>);
}

export async function updateSandboxList(
  userId: string,
  id: string,
  patch: Partial<{ name: string; listType: string; novelId: string | null; metadata: Record<string, unknown> }>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.listType !== undefined) row.list_type = patch.listType;
  if (patch.novelId !== undefined) row.novel_id = patch.novelId;
  if (patch.metadata !== undefined) row.metadata = patch.metadata;
  const { error } = await supabase.from("sandbox_lists").update(row).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteSandboxList(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("sandbox_lists").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function fetchListItems(userId: string, listId: string): Promise<SandboxListItem[]> {
  const { data, error } = await supabase
    .from("sandbox_list_items")
    .select("*")
    .eq("user_id", userId)
    .eq("list_id", listId)
    .order("rank", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowListItem(r as Record<string, unknown>));
}

export async function createListItem(input: {
  userId: string;
  listId: string;
  content: string;
  rank?: number;
  favorite?: boolean;
  id?: string;
}): Promise<SandboxListItem> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    list_id: input.listId,
    user_id: input.userId,
    content: input.content,
    rank: input.rank ?? Date.now(),
    favorite: input.favorite ?? false,
    metadata: {},
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from("sandbox_list_items").insert(row).select("*").single();
  if (error) throw error;
  return rowListItem(data as Record<string, unknown>);
}

export async function updateListItem(
  userId: string,
  id: string,
  patch: Partial<{ content: string; rank: number; favorite: boolean; metadata: Record<string, unknown> }>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.rank !== undefined) row.rank = patch.rank;
  if (patch.favorite !== undefined) row.favorite = patch.favorite;
  if (patch.metadata !== undefined) row.metadata = patch.metadata;
  const { error } = await supabase.from("sandbox_list_items").update(row).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteListItem(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("sandbox_list_items").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

// --- Maps ---

export async function fetchSandboxMaps(userId: string, novelId: string | null | "all"): Promise<SandboxMap[]> {
  let q = supabase.from("sandbox_maps").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (novelId !== "all" && novelId !== null) {
    q = q.eq("novel_id", novelId);
  } else if (novelId === null) {
    q = q.is("novel_id", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowMap(r as Record<string, unknown>));
}

export async function createSandboxMap(input: {
  userId: string;
  novelId: string | null;
  name: string;
  mapType: string;
  layoutData?: Record<string, unknown>;
  id?: string;
}): Promise<SandboxMap> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: input.userId,
    novel_id: input.novelId,
    name: input.name,
    map_type: input.mapType,
    layout_data: (input.layoutData ?? {}) as unknown as Json,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from("sandbox_maps").insert(row).select("*").single();
  if (error) throw error;
  return rowMap(data as Record<string, unknown>);
}

export async function updateSandboxMap(
  userId: string,
  id: string,
  patch: Partial<{
    name: string;
    mapType: string;
    novelId: string | null;
    layoutData: Record<string, unknown>;
  }>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.mapType !== undefined) row.map_type = patch.mapType;
  if (patch.novelId !== undefined) row.novel_id = patch.novelId;
  if (patch.layoutData !== undefined) row.layout_data = patch.layoutData;
  const { error } = await supabase.from("sandbox_maps").update(row).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteSandboxMap(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("sandbox_maps").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function fetchMapNodes(userId: string, mapId: string): Promise<SandboxMapNode[]> {
  const { data, error } = await supabase
    .from("sandbox_map_nodes")
    .select("*")
    .eq("user_id", userId)
    .eq("map_id", mapId);
  if (error) throw error;
  return (data ?? []).map((r) => rowNode(r as Record<string, unknown>));
}

export async function upsertMapNode(
  userId: string,
  input: {
    id?: string;
    mapId: string;
    x: number;
    y: number;
    content: string;
    nodeType?: string;
    linkedIdeaId?: string | null;
    linkedCodexId?: string | null;
    color?: string | null;
    status?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<SandboxMapNode> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    map_id: input.mapId,
    user_id: userId,
    x: input.x,
    y: input.y,
    content: input.content,
    node_type: input.nodeType ?? "idea",
    linked_idea_id: input.linkedIdeaId ?? null,
    linked_codex_id: input.linkedCodexId ?? null,
    color: input.color ?? null,
    status: input.status ?? null,
    metadata: (input.metadata ?? {}) as unknown as Json,
    created_at: now,
    updated_at: now,
  };
  if (input.id) {
    const { data, error } = await supabase
      .from("sandbox_map_nodes")
      .update({
        x: input.x,
        y: input.y,
        content: input.content,
        node_type: input.nodeType ?? "idea",
        linked_idea_id: input.linkedIdeaId ?? null,
        linked_codex_id: input.linkedCodexId ?? null,
        color: input.color ?? null,
        status: input.status ?? null,
        metadata: (input.metadata ?? {}) as unknown as Json,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return rowNode(data as Record<string, unknown>);
  }
  const { data, error } = await supabase.from("sandbox_map_nodes").insert(row).select("*").single();
  if (error) throw error;
  return rowNode(data as Record<string, unknown>);
}

export async function deleteMapNode(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("sandbox_map_nodes").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function fetchMapEdges(userId: string, mapId: string): Promise<SandboxMapEdge[]> {
  const { data, error } = await supabase
    .from("sandbox_map_edges")
    .select("*")
    .eq("user_id", userId)
    .eq("map_id", mapId);
  if (error) throw error;
  return (data ?? []).map((r) => rowEdge(r as Record<string, unknown>));
}

export async function createMapEdge(input: {
  userId: string;
  mapId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType?: string;
  label?: string | null;
  id?: string;
}): Promise<SandboxMapEdge> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    map_id: input.mapId,
    user_id: input.userId,
    source_node_id: input.sourceNodeId,
    target_node_id: input.targetNodeId,
    edge_type: input.edgeType ?? "default",
    label: input.label ?? null,
    created_at: now,
  };
  const { data, error } = await supabase.from("sandbox_map_edges").insert(row).select("*").single();
  if (error) throw error;
  return rowEdge(data as Record<string, unknown>);
}

export async function deleteMapEdge(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("sandbox_map_edges").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

// --- Conversations ---

export async function fetchConversations(
  userId: string,
  novelId: string | null | "all",
): Promise<SandboxConversation[]> {
  let q = supabase
    .from("sandbox_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (novelId !== "all" && novelId !== null) {
    q = q.eq("novel_id", novelId);
  } else if (novelId === null) {
    q = q.is("novel_id", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowConversation(r as Record<string, unknown>));
}

export async function saveConversation(
  userId: string,
  input: {
    id?: string;
    novelId: string | null;
    elementType: string;
    elementId: string | null;
    title: string;
    transcript: SandboxTranscriptMessage[];
    metadata?: Record<string, unknown>;
  },
): Promise<SandboxConversation> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: userId,
    novel_id: input.novelId,
    element_type: input.elementType,
    element_id: input.elementId,
    title: input.title,
    transcript: input.transcript as unknown as Json,
    metadata: (input.metadata ?? {}) as unknown as Json,
    created_at: now,
    updated_at: now,
  };
  if (input.id) {
    const { data, error } = await supabase
      .from("sandbox_conversations")
      .update({
        novel_id: input.novelId,
        element_type: input.elementType,
        element_id: input.elementId,
        title: input.title,
        transcript: input.transcript as unknown as Json,
        metadata: (input.metadata ?? {}) as unknown as Json,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return rowConversation(data as Record<string, unknown>);
  }
  const { data, error } = await supabase.from("sandbox_conversations").insert(row).select("*").single();
  if (error) throw error;
  return rowConversation(data as Record<string, unknown>);
}

// --- Prompt events ---

export async function createPromptEvent(input: {
  userId: string;
  novelId: string | null;
  promptType: string;
  promptKey: string;
  promptText: string;
  userResponse?: string | null;
  ideaWebEntryId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<SandboxPromptEvent> {
  const id = crypto.randomUUID();
  const row = {
    id,
    user_id: input.userId,
    novel_id: input.novelId,
    prompt_type: input.promptType,
    prompt_key: input.promptKey,
    prompt_text: input.promptText,
    user_response: input.userResponse ?? null,
    idea_web_entry_id: input.ideaWebEntryId ?? null,
    metadata: (input.metadata ?? {}) as unknown as Json,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("sandbox_prompt_events").insert(row).select("*").single();
  if (error) throw error;
  return rowPrompt(data as Record<string, unknown>);
}

export async function fetchRecentPromptKeys(userId: string, limit = 50): Promise<string[]> {
  const { data, error } = await supabase
    .from("sandbox_prompt_events")
    .select("prompt_key")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => String((r as Record<string, unknown>).prompt_key ?? "")))].filter(Boolean);
}

// --- Expansion ---

export async function fetchExpansionSessions(
  userId: string,
  novelId: string | null | "all",
): Promise<SandboxExpansionSession[]> {
  let q = supabase
    .from("sandbox_expansion_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (novelId !== "all" && novelId !== null) {
    q = q.eq("novel_id", novelId);
  } else if (novelId === null) {
    q = q.is("novel_id", null);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowExpansion(r as Record<string, unknown>));
}

export async function saveExpansionSession(
  userId: string,
  input: {
    id?: string;
    novelId: string | null;
    elementType: string;
    sourceIdeaId: string | null;
    templateId: string;
    expandedContent: Record<string, unknown>;
    promotedTo?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  },
): Promise<SandboxExpansionSession> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: userId,
    novel_id: input.novelId,
    element_type: input.elementType,
    source_idea_id: input.sourceIdeaId,
    template_id: input.templateId,
    expanded_content: input.expandedContent as unknown as Json,
    promoted_to: (input.promotedTo ?? null) as unknown as Json,
    metadata: (input.metadata ?? {}) as unknown as Json,
    created_at: now,
    updated_at: now,
  };
  if (input.id) {
    const { data, error } = await supabase
      .from("sandbox_expansion_sessions")
      .update({
        novel_id: input.novelId,
        element_type: input.elementType,
        source_idea_id: input.sourceIdeaId,
        template_id: input.templateId,
        expanded_content: input.expandedContent as unknown as Json,
        promoted_to: (input.promotedTo ?? null) as unknown as Json,
        metadata: (input.metadata ?? {}) as unknown as Json,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return rowExpansion(data as Record<string, unknown>);
  }
  const { data, error } = await supabase.from("sandbox_expansion_sessions").insert(row).select("*").single();
  if (error) throw error;
  return rowExpansion(data as Record<string, unknown>);
}

// --- Gamification ---

export async function recordSandboxGamificationEvent(
  userId: string,
  kind: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from("sandbox_gamification_events").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    kind,
    payload: payload as unknown as Json,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export type SandboxGamificationEventRow = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

/** Recent Sandbox activity for Writer's Odyssey journey (non-generative gamification events). */
export async function fetchRecentSandboxGamificationEvents(
  userId: string,
  limit = 8,
): Promise<SandboxGamificationEventRow[]> {
  const { data, error } = await supabase
    .from("sandbox_gamification_events")
    .select("id, kind, payload, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: String(r.id),
    kind: String(r.kind),
    payload: (r.payload as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
  }));
}

export async function fetchSandboxStats(
  userId: string,
  sinceIso: string,
): Promise<{
  sessionCount: number;
  braindumpWords: number;
  listItems: number;
  promptsUsed: number;
  mapNodes: number;
}> {
  const [bd, li, pr, nodes] = await Promise.all([
    supabase.from("sandbox_braindump_sessions").select("body").eq("user_id", userId).gte("updated_at", sinceIso),
    supabase
      .from("sandbox_list_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", sinceIso),
    supabase
      .from("sandbox_prompt_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", sinceIso),
    supabase
      .from("sandbox_map_nodes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", sinceIso),
  ]);
  if (bd.error) throw bd.error;
  let words = 0;
  for (const r of bd.data ?? []) {
    const b = String((r as { body?: string }).body ?? "");
    words += b.split(/\s+/).filter(Boolean).length;
  }
  return {
    sessionCount: (bd.data ?? []).length,
    braindumpWords: words,
    listItems: li.count ?? 0,
    promptsUsed: pr.count ?? 0,
    mapNodes: nodes.count ?? 0,
  };
}

// --- Daily seed ---

export async function getOrCreateDailySeed(
  userId: string,
  promptKey: string,
  promptText: string,
): Promise<{ promptKey: string; promptText: string; seedDate: string }> {
  const seedDate = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("sandbox_daily_seed")
    .select("*")
    .eq("user_id", userId)
    .eq("seed_date", seedDate)
    .maybeSingle();
  if (existing) {
    const r = existing as Record<string, unknown>;
    return {
      promptKey: String(r.prompt_key),
      promptText: String(r.prompt_text),
      seedDate: String(r.seed_date),
    };
  }
  const { error } = await supabase.from("sandbox_daily_seed").insert({
    user_id: userId,
    seed_date: seedDate,
    prompt_key: promptKey,
    prompt_text: promptText,
  });
  if (error) throw error;
  return { promptKey, promptText, seedDate };
}
