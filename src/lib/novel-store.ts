import { deleteNovelRow, fetchNovelRows, upsertNovelRows } from "@/api/novels";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import type { WordCountPresetId } from "@/lib/book-metadata";
import type { BookAudience, BookPov, BookTense } from "@/lib/book-metadata";
import { Act, BrainstormNote, BrainstormNoteColor, Chapter, CodexEntry, Idea, Novel, Scene } from "@/types/novel";

let idCounter = 0;
const genId = () => `id_${++idCounter}_${Date.now()}`;

// ── LocalStorage persistence ──────────────────────────────────────────────────

export const NOVELS_STORAGE_KEY = "odinpad_novels";
const STORAGE_KEY = NOVELS_STORAGE_KEY;

export function saveNovels(novels: Novel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novels));
  } catch {
    console.warn("OdinPad: could not save to localStorage — storage quota exceeded");
    // Emit a custom event so the UI can show a storage warning toast.
    window.dispatchEvent(new CustomEvent("odinpad:storage-quota-exceeded"));
  }
  // Non-blocking quota check: warn when < 20 % of storage remains.
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    void navigator.storage.estimate().then(({ usage, quota }) => {
      if (quota && usage && usage / quota > 0.8) {
        console.warn(`OdinPad: storage ${Math.round((usage / quota) * 100)}% full`);
        window.dispatchEvent(new CustomEvent("odinpad:storage-high-usage", { detail: { usage, quota } }));
      }
    });
  }
}

export function loadNovels(): Novel[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Novel[];
  } catch {
    return null;
  }
}

type NovelInsert = TablesInsert<"novels">;

function normalizeNovel(row: {
  id: string;
  title: string;
  author: string;
  data: Json;
  created_at: string;
  updated_at: string;
  series_id?: string | null;
}): Novel {
  const raw = (row.data ?? {}) as Partial<Novel>;
  return {
    id: row.id,
    title: raw.title ?? row.title,
    author: raw.author ?? row.author,
    penName: raw.penName,
    subtitle: raw.subtitle,
    genre: raw.genre,
    secondaryGenres: raw.secondaryGenres,
    premise: raw.premise,
    logline: raw.logline,
    comparables: raw.comparables,
    targetWordCount: raw.targetWordCount,
    wordCountPreset: raw.wordCountPreset,
    status: raw.status,
    series: raw.series,
    seriesId: raw.seriesId ?? row.series_id ?? undefined,
    seriesPosition: raw.seriesPosition,
    audience: raw.audience,
    contentWarnings: raw.contentWarnings,
    defaultPov: raw.defaultPov,
    defaultTense: raw.defaultTense,
    coverImageDataUrl: (() => {
      const r = raw as { coverImageDataUrl?: string; coverImageUrl?: string };
      if (r.coverImageDataUrl) return r.coverImageDataUrl;
      const legacy = r.coverImageUrl;
      return typeof legacy === "string" && legacy.startsWith("data:") ? legacy : undefined;
    })(),
    coverImageStorageUrl: (raw as { coverImageStorageUrl?: string }).coverImageStorageUrl,
    createdAt: raw.createdAt ?? row.created_at,
    updatedAt: raw.updatedAt ?? row.updated_at,
    wordCount: raw.wordCount ?? 0,
    frameworkId: raw.frameworkId ?? "three-act",
    customBeats: raw.customBeats ?? [],
    acts: raw.acts ?? [],
    codexEntries: raw.codexEntries ?? [],
    ideas: raw.ideas ?? [],
    brainstormNotes: (raw.brainstormNotes ?? []).map(migrateBrainstormNoteColor),
    reviewAnnotations: raw.reviewAnnotations,
    canvas: raw.canvas,
  };
}

function novelToInsert(userId: string, novel: Novel): NovelInsert {
  return {
    id: novel.id,
    user_id: userId,
    title: novel.title,
    author: novel.author,
    data: novel as unknown as Json,
    series_id: novel.seriesId ?? null,
  };
}

export async function fetchRemoteNovels(userId: string): Promise<Novel[]> {
  const rows = await fetchNovelRows(userId);
  return rows.map(normalizeNovel);
}

let _syncInProgress = false;
let _pendingSync: { userId: string; novels: Novel[] } | null = null;

function fireWebhooksForNovels(novels: Novel[]): void {
  try {
    const webhookUrl = localStorage.getItem("odinpad_save_webhook_url")?.trim();
    if (!webhookUrl) return;
    const savedAt = new Date().toISOString();
    for (const novel of novels) {
      const body = JSON.stringify({
        novelId: novel.id,
        title: novel.title,
        wordCount: novel.wordCount,
        savedAt,
      });
      void fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {
        /* fire-and-forget */
      });
    }
  } catch {
    /* never throw from webhook */
  }
}

export async function syncNovelsToRemote(userId: string, novels: Novel[]): Promise<void> {
  if (novels.length === 0) return;

  // If a sync is already in flight, queue the latest state and skip.
  if (_syncInProgress) {
    _pendingSync = { userId, novels };
    return;
  }

  _syncInProgress = true;
  try {
    const payload = novels.map((novel) => novelToInsert(userId, novel));
    await upsertNovelRows(payload);
    fireWebhooksForNovels(novels);
  } finally {
    _syncInProgress = false;
    // Drain the pending call (if any) with the most recent state.
    if (_pendingSync) {
      const pending = _pendingSync;
      _pendingSync = null;
      await syncNovelsToRemote(pending.userId, pending.novels);
    }
  }
}

/** Permanently removes a novel row for this user (RLS enforces ownership). */
export async function deleteRemoteNovel(userId: string, novelId: string): Promise<void> {
  await deleteNovelRow(novelId, userId);
}

function coerceOptionalString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  }
  return undefined;
}

function coerceOptionalFiniteInt(v: unknown, min: number, max: number): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  const i = Math.floor(n);
  if (i < min || i > max) return undefined;
  return i;
}

/**
 * Validates JSON backup shape before merging into the library.
 * Preserves unknown keys on the novel object; coerces series metadata when malformed.
 */
export function parseNovelImport(raw: unknown): Novel | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Partial<Novel>;
  if (typeof n.id !== "string" || typeof n.title !== "string" || !Array.isArray(n.acts)) return null;
  const base = raw as Novel;
  const seriesId = coerceOptionalString(base.seriesId);
  const seriesPosition = coerceOptionalFiniteInt(base.seriesPosition, 1, 999);
  const penName = coerceOptionalString(base.penName);
  const subtitle = coerceOptionalString(base.subtitle);
  const logline = coerceOptionalString(base.logline);
  const comparables = coerceOptionalString(base.comparables);

  return {
    ...base,
    seriesId,
    seriesPosition,
    penName,
    subtitle,
    logline,
    comparables,
  };
}

// ── Factories ─────────────────────────────────────────────────────────────────

export function createNovel(title: string, author: string): Novel {
  const actId = genId();
  const chapterId = genId();
  const sceneId = genId();
  return {
    id: genId(),
    title,
    author,
    status: "drafting",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: 0,
    frameworkId: "three-act",
    acts: [
      {
        id: actId,
        title: "Act I",
        order: 0,
        chapters: [
          {
            id: chapterId,
            title: "Chapter 1",
            order: 0,
            scenes: [
              {
                id: sceneId,
                title: "Opening Scene",
                summary: "",
                content: "",
                order: 0,
                status: "draft",
                characters: [],
                wordCount: 0,
                labels: [],
              },
            ],
          },
        ],
      },
    ],
    codexEntries: [],
    brainstormNotes: [],
  };
}

export interface CreateNovelOptions {
  genre?: string;
  premise?: string;
  targetWordCount?: number;
  frameworkId?: string;
  status?: Novel["status"];
  penName?: string;
  subtitle?: string;
  secondaryGenres?: string[];
  logline?: string;
  comparables?: string;
  wordCountPreset?: WordCountPresetId;
  seriesId?: string;
  seriesTitle?: string;
  seriesPosition?: number;
  series?: string;
  audience?: BookAudience;
  contentWarnings?: string[];
  defaultPov?: BookPov;
  defaultTense?: BookTense;
  coverImageDataUrl?: string;
}

export function createNovelWithOptions(title: string, author: string, options: CreateNovelOptions = {}): Novel {
  const novel = createNovel(title, author);
  return {
    ...novel,
    penName: options.penName?.trim() || undefined,
    genre: options.genre,
    subtitle: options.subtitle,
    secondaryGenres: options.secondaryGenres,
    premise: options.premise,
    logline: options.logline,
    comparables: options.comparables,
    targetWordCount: options.targetWordCount,
    wordCountPreset: options.wordCountPreset,
    frameworkId: options.frameworkId ?? novel.frameworkId,
    status: options.status ?? novel.status,
    seriesId: options.seriesId,
    series: options.seriesTitle ?? options.series,
    seriesPosition: options.seriesPosition,
    audience: options.audience,
    contentWarnings: options.contentWarnings,
    defaultPov: options.defaultPov,
    defaultTense: options.defaultTense,
    coverImageDataUrl: options.coverImageDataUrl,
  };
}

export function createCodexEntry(type: CodexEntry["type"], name: string): CodexEntry {
  return { id: genId(), type, name, description: "", notes: "", tags: [] };
}

export function createAct(order: number): Act {
  return { id: genId(), title: `Act ${order + 1}`, order, chapters: [] };
}

export function createChapter(order: number): Chapter {
  return { id: genId(), title: `Chapter ${order + 1}`, order, scenes: [] };
}

export function createScene(order: number): Scene {
  return {
    id: genId(),
    title: `Scene ${order + 1}`,
    summary: "",
    content: "",
    order,
    status: "draft",
    characters: [],
    wordCount: 0,
    labels: [],
  };
}

export function createIdea(category: Idea["category"] = "misc"): Idea {
  return {
    id: genId(),
    content: "",
    category,
    pinned: false,
    createdAt: new Date().toISOString(),
  };
}

/** Coerce legacy CSS class strings (pre-Arch#11) to the typed color token. */
const LEGACY_COLOR_MAP: Record<string, BrainstormNoteColor> = {
  "bg-primary/10": "amber",
  "bg-teal-500/10": "teal",
  "bg-emerald-500/10": "emerald",
  "bg-rose-500/10": "rose",
  "bg-sky-500/10": "sky",
};
const VALID_TOKENS = new Set<string>(["amber", "teal", "emerald", "rose", "sky"]);

function migrateBrainstormNoteColor(note: BrainstormNote): BrainstormNote {
  if (VALID_TOKENS.has(note.color)) return note;
  const mapped = LEGACY_COLOR_MAP[note.color];
  return { ...note, color: mapped ?? "amber" };
}

export function createBrainstormNote(title = "New Note"): BrainstormNote {
  const colors = ["amber", "emerald", "teal", "rose", "sky"] as const;
  return {
    id: genId(),
    title,
    content: "",
    color: colors[Math.floor(Math.random() * colors.length)],
    createdAt: new Date().toISOString(),
  };
}

// ── Demo novel ────────────────────────────────────────────────────────────────

export function createDemoNovel(): Novel {
  const novel = createNovel("The Forgotten City", "Anonymous");
  novel.acts[0].chapters[0].scenes[0] = {
    ...novel.acts[0].chapters[0].scenes[0],
    title: "The Discovery",
    summary: "Protagonist discovers an ancient map leading to a forgotten underground city.",
    content:
      "The map was tucked between the pages of a book that hadn't been opened in decades. Its edges were yellowed and brittle, threatening to crumble at the lightest touch. But the lines drawn upon it—those were unmistakable.\n\nElara held it closer to the lamplight, her breath catching as she traced the intricate pathways with her fingertip. A city. An entire city, buried beneath the hills she had walked over every day of her life.\n\n\"This can't be real,\" she whispered to no one. The library was empty at this hour, the only sound the distant hum of rain against the windows.",
    wordCount: 96,
    pov: "Elara",
    location: "The Old Library",
    characters: ["Elara"],
    status: "in-progress",
  };

  novel.acts[0].chapters.push({
    ...createChapter(1),
    title: "Chapter 2 - Descent",
    scenes: [
      {
        ...createScene(0),
        title: "Preparing the Expedition",
        summary: "Elara gathers supplies and convinces her reluctant friend Marcus to join.",
        status: "draft",
        characters: ["Elara", "Marcus"],
      },
    ],
  });

  novel.codexEntries = [
    {
      id: genId(),
      type: "character",
      name: "Elara Voss",
      description: "A 28-year-old archaeologist and librarian. Curious, determined, sometimes reckless.",
      notes: "Motivated by her late grandmother's stories about the old world.",
      tags: ["protagonist", "archaeologist"],
    },
    {
      id: genId(),
      type: "character",
      name: "Marcus Chen",
      description: "Elara's childhood friend and a structural engineer. Pragmatic and cautious, but fiercely loyal.",
      notes: "Reluctant adventurer.",
      tags: ["supporting", "engineer"],
    },
    {
      id: genId(),
      type: "location",
      name: "The Old Library",
      description: "A centuries-old library in the university district.",
      notes: "Where the map is discovered. Has secret basement levels.",
      tags: ["starting-point"],
    },
    {
      id: genId(),
      type: "location",
      name: "The Forgotten City",
      description: "An ancient underground city beneath the Thornhill countryside.",
      notes: "Reveal gradually. Full scope not understood until Act III.",
      tags: ["main-setting", "mystery"],
    },
    {
      id: genId(),
      type: "lore",
      name: "The Builders",
      description: "The unknown civilization that constructed the Forgotten City.",
      notes: "Central mystery of the story.",
      tags: ["mystery", "ancient"],
    },
  ];

  novel.brainstormNotes = [
    {
      id: genId(),
      title: "Themes",
      content: "Memory & forgetting\nHidden histories\nThe cost of knowledge",
      color: "amber",
      createdAt: new Date().toISOString(),
    },
    {
      id: genId(),
      title: "Tone References",
      content: "Indiana Jones meets The Secret History\nAtmospheric, slightly gothic",
      color: "teal",
      createdAt: new Date().toISOString(),
    },
  ];

  return novel;
}
