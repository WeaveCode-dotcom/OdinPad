export type SandboxListType =
  | "character_names"
  | "plot_points"
  | "worldbuilding"
  | "dialogue_snippets"
  | "sensory_details";

export type SandboxMapType = "mindmap" | "tree" | "affinity" | "radial" | "flowchart";

export type SandboxTranscriptMessage = {
  role: "user" | "assistant";
  content: string;
  at?: string;
};

export interface SandboxBraindumpSession {
  id: string;
  userId: string;
  novelId: string | null;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxList {
  id: string;
  userId: string;
  novelId: string | null;
  name: string;
  listType: SandboxListType | string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxListItem {
  id: string;
  listId: string;
  userId: string;
  content: string;
  rank: number;
  favorite: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxMap {
  id: string;
  userId: string;
  novelId: string | null;
  name: string;
  mapType: SandboxMapType | string;
  layoutData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxMapNode {
  id: string;
  mapId: string;
  userId: string;
  x: number;
  y: number;
  content: string;
  nodeType: string;
  linkedIdeaId: string | null;
  linkedCodexId: string | null;
  color: string | null;
  status: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxMapEdge {
  id: string;
  mapId: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  label: string | null;
  createdAt: string;
}

export interface SandboxConversation {
  id: string;
  userId: string;
  novelId: string | null;
  elementType: string;
  elementId: string | null;
  title: string;
  transcript: SandboxTranscriptMessage[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxPromptEvent {
  id: string;
  userId: string;
  novelId: string | null;
  promptType: string;
  promptKey: string;
  promptText: string;
  userResponse: string | null;
  ideaWebEntryId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SandboxExpansionSession {
  id: string;
  userId: string;
  novelId: string | null;
  elementType: string;
  sourceIdeaId: string | null;
  templateId: string;
  expandedContent: Record<string, unknown>;
  promotedTo: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ExpansionTemplateId = "character" | "location" | "plot_point" | "magic" | "theme" | "faction" | "scene";
