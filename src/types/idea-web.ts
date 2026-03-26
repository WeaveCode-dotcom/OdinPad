/** Idea Web entry — mirrors `public.idea_web_entries` */
export type IdeaWebStatus = "seed" | "sprouting" | "growing" | "dormant" | "harvested" | "archived";

export type IdeaWebSourceType = "original" | "inspired_by" | "research" | "quote" | "dream" | "overheard" | "import";

export type IdeaWebLinkKind = "manual" | "suggested" | "rejected";

export interface IdeaWebEntry {
  id: string;
  userId: string;
  novelId: string | null;
  title: string;
  body: string;
  status: IdeaWebStatus;
  ideaType: string;
  category: string | null;
  mood: string | null;
  sourceType: IdeaWebSourceType | string;
  tags: string[];
  pinned: boolean;
  metadata: Record<string, unknown>;
  harvestedAt: string | null;
  harvestTargetNovelId: string | null;
  remindAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdeaWebLink {
  id: string;
  userId: string;
  fromEntryId: string;
  toEntryId: string;
  kind: IdeaWebLinkKind;
  createdAt: string;
}

export interface IdeaWebLayoutMetadata {
  mapLayout?: Record<string, { x: number; y: number }>;
}

export type IdeaWebRevisionTrigger = "edit_session" | "status_change" | "manual_checkpoint" | "map_move" | "system";

/** Point-in-time snapshot stored in `idea_web_entry_revisions.snapshot`. */
export interface IdeaWebRevisionSnapshot {
  title: string;
  body: string;
  status: IdeaWebStatus;
  tags: string[];
  ideaType: string;
  category: string | null;
  mood: string | null;
  sourceType: string;
  metadata: Record<string, unknown>;
  novelId?: string | null;
}

export interface IdeaWebEntryRevision {
  id: string;
  entryId: string;
  userId: string;
  trigger: IdeaWebRevisionTrigger;
  snapshot: IdeaWebRevisionSnapshot;
  createdAt: string;
}
