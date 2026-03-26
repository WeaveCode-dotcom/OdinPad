import type { BookAudience, BookPov, BookTense, WordCountPresetId } from "@/lib/book-metadata";

export interface Novel {
  id: string;
  title: string;
  author: string;
  /** Optional display name if different from billing/legal (shown in UI when set). */
  penName?: string;
  subtitle?: string;
  genre?: string;
  /** Additional genre tags beyond primary `genre`. */
  secondaryGenres?: string[];
  premise?: string;
  logline?: string;
  /** "X meets Y" or comp titles — short marketing line. */
  comparables?: string;
  targetWordCount?: number;
  /** Preset used at creation; `custom` or unset when target was typed manually. */
  wordCountPreset?: WordCountPresetId;
  status?: "brainstorming" | "outlining" | "drafting" | "editing" | "complete";
  /** Cached series title for display when `seriesId` is set (synced from server). */
  series?: string;
  /** FK to `book_series.id` when using Tier B series entities. */
  seriesId?: string;
  /** Order within the series (1 = first book). */
  seriesPosition?: number;
  audience?: BookAudience;
  contentWarnings?: string[];
  defaultPov?: BookPov;
  defaultTense?: BookTense;
  /** Imported cover art as a data URL (local file); shown on library cards. */
  coverImageDataUrl?: string;
  /** Supabase Storage public URL for cover (preferred over large data URLs when set). */
  coverImageStorageUrl?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  wordCount: number;
  frameworkId: string;
  customBeats?: CustomBeat[];
  acts: Act[];
  codexEntries: CodexEntry[];
  /** @deprecated Embedded ideas are migrated to IdeaWebEntry. Do not add new references. */
  ideas?: Idea[];
  brainstormNotes: BrainstormNote[];
  reviewAnnotations?: ReviewAnnotation[];
  /** Canvas studio state (corkboard, timeline, atlas, observatory). */
  canvas?: CanvasState;
}

/** Story planning studio persisted on the novel (see OdinPad Canvas.md). */
export interface CanvasState {
  corkboard?: CorkboardState;
  timeline?: TimelineState;
  atlas?: AtlasState;
  observatory?: ObservatoryState;
}

export interface CorkboardState {
  cards: CorkboardCard[];
}

export interface CorkboardCard {
  id: string;
  sceneId?: string;
  title: string;
  summary?: string;
  x: number;
  y: number;
}

export interface TimelineState {
  rows: { id: string; name: string; order: number; color?: string }[];
  cards: { id: string; rowId: string; sceneId: string; columnIndex: number }[];
  columnMode?: "chapter" | "scene";
}

export interface AtlasNode {
  id: string;
  type: "character" | "location" | "lore" | "item" | "faction" | "theme" | "custom";
  codexEntryId?: string;
  label: string;
  x: number;
  y: number;
}

export interface AtlasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface AtlasState {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
}

export interface ObservatoryState {
  pinnedPanels?: ("binder" | "blueprint" | "corkboard" | "timeline" | "atlas")[];
  lastHealthSnapshot?: { pacingScore?: number; threadBalance?: number; updatedAt: string };
}

export interface Act {
  id: string;
  title: string;
  order: number;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  title: string;
  summary: string;
  content: string;
  order: number;
  status: "draft" | "in-progress" | "complete" | "revision";
  pov?: string;
  location?: string;
  characters: string[];
  wordCount: number;
  labels: string[];
  beatId?: string; // linked framework beat
  codexRefs?: string[];
}

export interface CharacterArc {
  startingState?: string;
  incitingWound?: string;
  midpointShift?: string;
  climaxChoice?: string;
  endingState?: string;
}

export interface CodexEntry {
  id: string;
  type: "character" | "location" | "lore" | "item" | "faction";
  name: string;
  description: string;
  notes: string;
  tags: string[];
  /** Character arc worksheet — only meaningful when type === "character". */
  arc?: CharacterArc;
}

export interface CustomBeat {
  id: string;
  title: string;
  description: string;
  percentage: number;
  tags: string[];
  optional?: boolean;
  order: number;
}

export interface Idea {
  id: string;
  content: string;
  category: "plot" | "character" | "world" | "theme" | "misc";
  pinned: boolean;
  createdAt: string;
}

/** Typed color token — never store raw CSS class strings in data. */
export type BrainstormNoteColor = "amber" | "teal" | "emerald" | "rose" | "sky";

export interface BrainstormNote {
  id: string;
  title: string;
  content: string;
  /** Color token (enum). Stored as the typed key, not as a CSS class string. */
  color: BrainstormNoteColor;
  createdAt: string;
}

export interface ReviewAnnotation {
  id: string;
  sceneId: string;
  type: "note" | "issue" | "praise" | "continuity";
  content: string;
  resolved: boolean;
  createdAt: string;
}

export type WorkspaceMode = "sandbox" | "canvas" | "write" | "review";
