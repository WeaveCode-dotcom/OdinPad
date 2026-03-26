import {
  BOOK_GENRE_OPTIONS,
  type BookAudience,
  bookDuplicateKey,
  type BookPov,
  type BookTense,
  normalizeSecondaryGenres,
  type WordCountPresetId,
} from "@/lib/book-metadata";
import { isValidCoverDataUrl, MAX_COVER_DATA_URL_CHARS } from "@/lib/novel-cover";
import { mapPersonalization, type WritingGoal, type WritingStyle } from "@/lib/personalization";
import type { Novel } from "@/types/novel";

const DRAFT_PREFIX = "odinpad_book_creation_draft_";

const MAX_FIELD_LEN = {
  subtitle: 300,
  logline: 500,
  comparables: 500,
  premise: 2000,
  penName: 200,
} as const;

export interface BookCreationInput {
  title: string;
  author: string;
  genre: string;
  frameworkId: string;
  premise?: string;
  targetWordCount?: string;
  status?: "brainstorming" | "outlining" | "drafting" | "editing" | "complete";
  subtitle?: string;
  penName?: string;
  logline?: string;
  comparables?: string;
  secondaryGenres?: string[];
  wordCountPreset?: WordCountPresetId;
  /** When standalone, series fields are ignored. */
  seriesMode?: "standalone" | "series";
  seriesId?: string;
  seriesPosition?: string;
  audience?: BookAudience | "";
  contentWarnings?: string[];
  defaultPov?: BookPov | "";
  defaultTense?: BookTense | "";
  /** Base64 data URL from file import */
  coverImageDataUrl?: string;
}

export interface BookCreationNormalized {
  title: string;
  author: string;
  genre: string;
  frameworkId: string;
  premise?: string;
  targetWordCount?: number;
  status?: "brainstorming" | "outlining" | "drafting" | "editing" | "complete";
  subtitle?: string;
  penName?: string;
  logline?: string;
  comparables?: string;
  secondaryGenres?: string[];
  wordCountPreset?: WordCountPresetId;
  seriesId?: string;
  seriesPosition?: number;
  seriesTitle?: string;
  audience?: BookAudience;
  contentWarnings?: string[];
  defaultPov?: BookPov;
  defaultTense?: BookTense;
  coverImageDataUrl?: string;
}

export interface BookCreationValidation {
  normalized: BookCreationNormalized;
  errors: string[];
  warnings: string[];
}

export interface FrameworkRecommendation {
  frameworkId: string;
  reason: string;
  score: number;
}

interface RecommendationInput {
  selectedGenre?: string;
  preferredGenres?: string[];
  writingStyle?: string | null;
  primaryGoal?: string | null;
  fallbackFrameworkId?: string;
}

export type BookCreationWizardStep = 1 | 2 | 3;

export interface BookCreationDraft {
  title: string;
  author: string;
  genre: string;
  frameworkId: string;
  premise: string;
  targetWordCount: string;
  /** @deprecated use wizardStep */
  advancedOpen: boolean;
  wizardStep: BookCreationWizardStep;
  subtitle: string;
  penName: string;
  logline: string;
  comparables: string;
  wordCountPreset: WordCountPresetId | "";
  seriesId: string;
  seriesPosition: string;
  audience: BookAudience | "";
  contentWarnings: string[];
  defaultPov: BookPov | "";
  defaultTense: BookTense | "";
  secondaryGenres: string[];
  seriesScope: "standalone" | "series";
  coverImageDataUrl: string;
}

export function defaultBookCreationDraft(): BookCreationDraft {
  return {
    title: "",
    author: "",
    genre: "",
    frameworkId: "three-act",
    premise: "",
    targetWordCount: "",
    advancedOpen: false,
    wizardStep: 1,
    subtitle: "",
    penName: "",
    logline: "",
    comparables: "",
    wordCountPreset: "",
    seriesId: "",
    seriesPosition: "",
    audience: "",
    contentWarnings: [],
    defaultPov: "",
    defaultTense: "",
    secondaryGenres: [],
    seriesScope: "standalone",
    coverImageDataUrl: "",
  };
}

export function getDraftStorageKey(userId: string): string {
  return `${DRAFT_PREFIX}${userId}`;
}

export function loadBookCreationDraft(userId: string): BookCreationDraft | null {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BookCreationDraft>;
    const base = defaultBookCreationDraft();
    const wizardStep: BookCreationWizardStep =
      parsed.wizardStep === 1 || parsed.wizardStep === 2 || parsed.wizardStep === 3
        ? parsed.wizardStep
        : parsed.advancedOpen
          ? 3
          : 1;
    const legacyRaw = (parsed as { secondaryGenresRaw?: string }).secondaryGenresRaw;
    const secondaryGenres =
      Array.isArray(parsed.secondaryGenres) && parsed.secondaryGenres.length > 0
        ? parsed.secondaryGenres
        : legacyRaw
          ? legacyRaw
              .split(/[,;\n]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : base.secondaryGenres;
    const seriesScope: "standalone" | "series" =
      parsed.seriesScope === "series" || (parsed.seriesId && String(parsed.seriesId).trim() !== "")
        ? "series"
        : "standalone";

    const legacyCoverUrl = (parsed as { coverImageUrl?: string }).coverImageUrl;
    const coverImageDataUrl =
      (typeof parsed.coverImageDataUrl === "string" && parsed.coverImageDataUrl) ||
      (typeof legacyCoverUrl === "string" && legacyCoverUrl.startsWith("data:")
        ? legacyCoverUrl
        : base.coverImageDataUrl);

    return {
      ...base,
      ...parsed,
      wizardStep,
      secondaryGenres,
      seriesScope,
      coverImageDataUrl,
      contentWarnings: Array.isArray(parsed.contentWarnings) ? parsed.contentWarnings : base.contentWarnings,
    };
  } catch {
    return null;
  }
}

export function saveBookCreationDraft(userId: string, draft: BookCreationDraft): void {
  try {
    const safe = sanitizeBookCreationDraftForStorage(draft);
    localStorage.setItem(getDraftStorageKey(userId), JSON.stringify(safe));
  } catch {
    // no-op
  }
}

export function clearBookCreationDraft(userId: string): void {
  try {
    localStorage.removeItem(getDraftStorageKey(userId));
  } catch {
    // no-op
  }
}

/** First wizard step: title, genre, template required before continuing. */
export function validateBookCreationStep1(input: { title: string; genre: string; frameworkId: string }): string | null {
  if (!input.title.trim()) return "Title is required.";
  if (!input.genre.trim()) return "Genre is required.";
  if (!input.frameworkId.trim()) return "Template is required.";
  return null;
}

/** Wizard step 2: series placement requires a chosen series when scope is "series". */
export function validateBookCreationStep2(input: {
  seriesScope: "standalone" | "series";
  seriesId: string;
}): string | null {
  if (input.seriesScope === "series" && !input.seriesId.trim()) {
    return "Choose a series from the list, create a new one, or switch to Standalone.";
  }
  return null;
}

/** Avoids blowing localStorage when cover data URL is huge; strip cover from persisted draft. */
const DRAFT_MAX_COVER_DATA_URL_CHARS = 400_000;

export function sanitizeBookCreationDraftForStorage(draft: BookCreationDraft): BookCreationDraft {
  if (draft.coverImageDataUrl && draft.coverImageDataUrl.length > DRAFT_MAX_COVER_DATA_URL_CHARS) {
    return { ...draft, coverImageDataUrl: "" };
  }
  return draft;
}

function trimMax(s: string | undefined, max: number): string | undefined {
  const t = s?.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

export function validateAndNormalizeBookCreation(
  input: BookCreationInput,
  existingNovels: Pick<Novel, "title" | "seriesId">[] = [],
  seriesTitleById?: Map<string, string>,
): BookCreationValidation {
  const normalized: BookCreationNormalized = {
    title: input.title.trim(),
    author: input.author.trim() || "Anonymous",
    genre: input.genre.trim(),
    frameworkId: input.frameworkId.trim(),
    premise: trimMax(input.premise, MAX_FIELD_LEN.premise),
    status: input.status ?? "drafting",
    subtitle: trimMax(input.subtitle, MAX_FIELD_LEN.subtitle),
    penName: trimMax(input.penName, MAX_FIELD_LEN.penName),
    logline: trimMax(input.logline, MAX_FIELD_LEN.logline),
    comparables: trimMax(input.comparables, MAX_FIELD_LEN.comparables),
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!normalized.title) errors.push("Title is required.");
  if (!normalized.genre) errors.push("Genre is required.");
  if (!normalized.frameworkId) errors.push("Template is required.");

  const secondaryGenres = normalizeSecondaryGenres(
    input.secondaryGenres ?? [],
    normalized.genre,
    BOOK_GENRE_OPTIONS as unknown as string[],
  );
  if (secondaryGenres.length > 0) normalized.secondaryGenres = secondaryGenres;

  if (input.wordCountPreset && input.wordCountPreset !== "custom") {
    normalized.wordCountPreset = input.wordCountPreset;
  }

  const seriesMode = input.seriesMode ?? (input.seriesId?.trim() ? "series" : "standalone");
  if (seriesMode === "standalone") {
    // Explicit standalone: no series link
  } else {
    const sid = input.seriesId?.trim();
    if (sid) {
      normalized.seriesId = sid;
      const st = seriesTitleById?.get(sid);
      if (st) normalized.seriesTitle = st;
    }

    if (input.seriesPosition !== undefined && String(input.seriesPosition).trim() !== "") {
      const p = Number(String(input.seriesPosition).trim());
      if (!Number.isFinite(p) || p < 1 || p > 999) {
        errors.push("Volume number must be between 1 and 999.");
      } else {
        normalized.seriesPosition = Math.floor(p);
      }
    }
  }

  const coverRaw = input.coverImageDataUrl?.trim() ?? "";
  if (coverRaw) {
    if (coverRaw.length > MAX_COVER_DATA_URL_CHARS || !isValidCoverDataUrl(coverRaw)) {
      errors.push("Cover image must be a valid imported image (or remove it).");
    } else {
      normalized.coverImageDataUrl = coverRaw;
    }
  } else {
    normalized.coverImageDataUrl = undefined;
  }

  if (input.audience) {
    normalized.audience = input.audience;
  }

  if (input.contentWarnings && input.contentWarnings.length > 0) {
    normalized.contentWarnings = [...new Set(input.contentWarnings)].slice(0, 24);
  }

  if (input.defaultPov) {
    normalized.defaultPov = input.defaultPov;
  }
  if (input.defaultTense) {
    normalized.defaultTense = input.defaultTense;
  }

  const dedupeNew = bookDuplicateKey(normalized.title, seriesMode === "standalone" ? undefined : normalized.seriesId);
  const clash = existingNovels.some((n) => bookDuplicateKey(n.title, n.seriesId) === dedupeNew);
  if (clash) {
    warnings.push("A project with this title already exists in the same series context. You can still continue.");
  }

  if (input.targetWordCount && input.targetWordCount.trim()) {
    const parsed = Number(input.targetWordCount.trim());
    if (!Number.isFinite(parsed)) {
      errors.push("Target word count must be a number.");
    } else if (parsed < 100 || parsed > 1_000_000) {
      errors.push("Target word count must be between 100 and 1,000,000.");
    } else {
      normalized.targetWordCount = parsed;
    }
  }

  return { normalized, errors, warnings };
}

/** Presence flags for analytics (no raw text / PII). */
export function bookCreateMetadataAnalytics(n: BookCreationNormalized): {
  hasSubtitle: boolean;
  hasPenName: boolean;
  hasLogline: boolean;
  hasComparables: boolean;
  hasSecondaryGenres: boolean;
  hasSeriesPosition: boolean;
  hasAudience: boolean;
  hasContentWarnings: boolean;
  hasDefaultPov: boolean;
  hasDefaultTense: boolean;
  hasCover: boolean;
} {
  return {
    hasSubtitle: Boolean(n.subtitle),
    hasPenName: Boolean(n.penName),
    hasLogline: Boolean(n.logline),
    hasComparables: Boolean(n.comparables),
    hasSecondaryGenres: Boolean(n.secondaryGenres?.length),
    hasSeriesPosition: n.seriesPosition != null,
    hasAudience: Boolean(n.audience),
    hasContentWarnings: Boolean(n.contentWarnings?.length),
    hasDefaultPov: Boolean(n.defaultPov),
    hasDefaultTense: Boolean(n.defaultTense),
    hasCover: Boolean(n.coverImageDataUrl),
  };
}

export function rankFrameworkRecommendations(input: RecommendationInput): FrameworkRecommendation[] {
  const writingStyle = (input.writingStyle as WritingStyle) ?? "hybrid";
  const primaryGoal = (input.primaryGoal as WritingGoal) ?? "finish-first-draft";
  const genres = [input.selectedGenre, ...(input.preferredGenres ?? [])].filter(Boolean).map((value) => String(value));

  const mapped = mapPersonalization({
    writingStyle,
    primaryGoal,
    genres,
  });

  const genre = (input.selectedGenre ?? "").toLowerCase();
  const scoreByFramework = new Map<string, FrameworkRecommendation>();

  const addScore = (frameworkId: string, score: number, reason: string) => {
    const current = scoreByFramework.get(frameworkId);
    if (current) {
      scoreByFramework.set(frameworkId, {
        frameworkId,
        score: current.score + score,
        reason: `${current.reason}; ${reason}`,
      });
      return;
    }
    scoreByFramework.set(frameworkId, { frameworkId, score, reason });
  };

  addScore(mapped.recommendedFrameworkId, 5, "Matches your writing profile");

  if (genre.includes("romance")) addScore("hauge-six-stage", 3, "Popular for romance pacing");
  if (genre.includes("fantasy") || genre.includes("sci"))
    addScore("heros-journey", 3, "Strong fit for epic/speculative arcs");
  if (genre.includes("mystery") || genre.includes("thriller")) addScore("story-grid", 2, "Good for genre-driven beats");
  if (genre.includes("literary")) addScore("freytags-pyramid", 2, "Fits literary tension curves");

  if (writingStyle === "plotter") addScore("save-the-cat", 2, "Works well for structured planning");
  if (writingStyle === "pantser") addScore("story-circle", 2, "Flexible structure for discovery writing");
  if (primaryGoal === "build-world") addScore("heros-journey", 1, "Supports worldbuilding progression");
  if (primaryGoal === "daily-word-count") addScore("three-act", 1, "Simple structure for drafting momentum");

  if (input.fallbackFrameworkId) addScore(input.fallbackFrameworkId, 1, "Your saved default template");

  return Array.from(scoreByFramework.values()).sort((a, b) => b.score - a.score);
}
