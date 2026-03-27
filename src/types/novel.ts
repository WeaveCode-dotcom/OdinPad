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
  /** Edit mode per-scene pass tracking. */
  editPassState?: EditPassState;
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
  /** Currently active color-coding mode. */
  colorMode?: "beat" | "status" | "pov" | "act" | "custom";
  /** Card size preset. */
  cardSize?: "sm" | "md" | "lg";
}

export interface CorkboardCard {
  id: string;
  sceneId?: string;
  title: string;
  summary?: string;
  x: number;
  y: number;
  /** Custom hex color when colorMode is "custom". */
  color?: string;
  /** When true, drag is disabled for this card. */
  locked?: boolean;
}

export interface TimelineState {
  rows: TimelineRow[];
  cards: TimelineCard[];
  columnMode?: "chapter" | "scene";
}

export interface TimelineRow {
  id: string;
  name: string;
  order: number;
  color?: string;
  /** Group label for grouping rows under a category. */
  group?: string;
}

export interface TimelineCard {
  id: string;
  rowId: string;
  sceneId: string;
  columnIndex: number;
}

export interface AtlasNode {
  id: string;
  type: "character" | "location" | "lore" | "item" | "faction" | "theme" | "custom";
  codexEntryId?: string;
  /** When set, this node originated from an IdeaWebEntry. */
  ideaWebEntryId?: string;
  label: string;
  x: number;
  y: number;
  /** Additional notes shown in the node detail panel. */
  notes?: string;
  /** When true, auto-layout will not move this node. */
  pinned?: boolean;
  /** When true, node is hidden from the graph view but not deleted. */
  hidden?: boolean;
}

export type AtlasEdgeType =
  | "allied"
  | "opposed"
  | "romantic"
  | "mentor"
  | "family"
  | "professional"
  | "rivals"
  | "custom";

export interface AtlasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** Semantic relationship category. */
  type?: AtlasEdgeType;
  /** When true, arrowhead appears on both ends. */
  bidirectional?: boolean;
  /** Relationship strength 1–5; heavier weight renders as thicker line. */
  weight?: number;
}

export interface AtlasState {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
}

export interface HealthSnapshot {
  id: string;
  label?: string;
  pacingScore?: number;
  threadBalance?: number;
  createdAt: string;
  sceneCount?: number;
  wordCount?: number;
  beatCoverage?: number;
  statusBreakdown?: Record<string, number>;
  actBalance?: number[];
}

export interface ObservatoryInsightDismissal {
  id: string;
  dismissedUntil: string;
}

export interface ObservatoryState {
  pinnedPanels?: ("binder" | "blueprint" | "corkboard" | "timeline" | "atlas")[];
  lastHealthSnapshot?: { pacingScore?: number; threadBalance?: number; updatedAt: string };
  /** Up to 10 historical snapshots for trend tracking. */
  snapshots?: HealthSnapshot[];
  /** Dismissed insight IDs and their snooze-until timestamps. */
  insightDismissals?: ObservatoryInsightDismissal[];
}

export interface Act {
  id: string;
  title: string;
  order: number;
  chapters: Chapter[];
  /** Optional short blurb for this act's role in the story. */
  summary?: string;
  /** Custom label color token (hex). */
  color?: string;
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  scenes: Scene[];
  /** Short blurb shown collapsed under the chapter name. */
  summary?: string;
  /** Per-chapter word count target. */
  targetWordCount?: number;
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
  /** Per-scene word count target. */
  targetWordCount?: number;
  /** Private planning notes (not manuscript text). */
  notes?: string;
  /** Optionally tag this scene as "inspired by" a specific IdeaWebEntry. */
  ideaWebEntryId?: string;
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

export type BeatTone = "action" | "revelation" | "emotional" | "transition" | "climax";

export interface CustomBeat {
  id: string;
  title: string;
  description: string;
  percentage: number;
  tags: string[];
  optional?: boolean;
  order: number;
  /** Emotional tone of the beat for arc visualization. */
  tone?: BeatTone;
  /** Whether this beat is marked as addressed (separate from scene status). */
  completionStatus?: boolean;
  /** Custom color hex for this beat (propagates to Binder and Corkboard). */
  color?: string;
  /** Long-form planning context separate from description. */
  notes?: string;
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

export type WorkspaceMode = "sandbox" | "canvas" | "write" | "edit" | "review";

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

export type EditPass = "dev" | "line";

export type EditPassStatus = "unedited" | "in-progress" | "dev-reviewed" | "line-edited" | "polished";

export interface EditScenePassRecord {
  status: EditPassStatus;
  devDoneAt?: string;
  lineDoneAt?: string;
}

export interface EditPassState {
  /** Per-scene editing status keyed by scene ID */
  sceneRecords: Record<string, EditScenePassRecord>;
}

export interface EditSuggestion {
  id: string;
  sceneId: string;
  /** Which pass produced this suggestion */
  pass: EditPass;
  type: "tighten" | "heighten" | "dialogue" | "fewer-words" | "passive-voice" | "weak-word" | "cliche" | "show-dont-tell" | "revision-prompt";
  /** The original text span (may be empty for revision prompts) */
  original: string;
  /** AI suggestion text (or prompt text for revision-prompt type) */
  suggestion: string;
  /** Brief rationale from the AI */
  rationale: string;
  status: "pending" | "accepted" | "rejected" | "promoted";
}
