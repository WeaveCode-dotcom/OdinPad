/** Shared book-level metadata enums and presets (creation + edit). */

/** Primary + secondary genre pickers (aligned across create / edit). */
export const BOOK_GENRE_OPTIONS = [
  "Fantasy",
  "Romance",
  "Mystery",
  "Literary",
  "Sci-Fi",
  "Thriller",
  "Historical",
  "General",
  "Cozy mystery",
  "Urban fantasy",
  "Contemporary",
  "Horror",
  "Nonfiction",
] as const;

export type BookGenreOption = (typeof BOOK_GENRE_OPTIONS)[number];

export const BOOK_AUDIENCES = [
  { value: "general", label: "General" },
  { value: "children", label: "Children" },
  { value: "middle_grade", label: "Middle grade" },
  { value: "young_adult", label: "Young adult" },
  { value: "adult", label: "Adult" },
] as const;

export type BookAudience = (typeof BOOK_AUDIENCES)[number]["value"];

export const BOOK_POVS = [
  { value: "first", label: "First person" },
  { value: "second", label: "Second person" },
  { value: "third", label: "Third person" },
  { value: "omniscient", label: "Third omniscient" },
  { value: "mixed", label: "Mixed / varies" },
] as const;

export type BookPov = (typeof BOOK_POVS)[number]["value"];

export const BOOK_TENSES = [
  { value: "past", label: "Past" },
  { value: "present", label: "Present" },
  { value: "mixed", label: "Mixed" },
] as const;

export type BookTense = (typeof BOOK_TENSES)[number]["value"];

/** Curated content-warning tags; stored as string[] on Novel. */
export const CONTENT_WARNING_PRESETS = [
  "Violence",
  "Sexual content",
  "Abuse",
  "Self-harm",
  "Death / grief",
  "Horror",
  "Substance use",
  "Profanity",
  "Discrimination (depicted)",
] as const;

export type WordCountPresetId = "short_story" | "novella" | "novel" | "epic" | "custom";

export const WORD_COUNT_PRESETS: {
  id: WordCountPresetId;
  label: string;
  words: number;
  hint: string;
  /** Comparable titles grounding the abstract word count in books the writer already knows. */
  comparables: string;
}[] = [
  {
    id: "short_story",
    label: "Short story",
    words: 7500,
    hint: "~30 pages",
    comparables: "Like a New Yorker short story — a single complete arc.",
  },
  {
    id: "novella",
    label: "Novella",
    words: 40000,
    hint: "~160 pages",
    comparables: 'Like "Of Mice and Men" or "The Strange Case of Dr Jekyll and Mr Hyde" — tight and impactful.',
  },
  {
    id: "novel",
    label: "Novel",
    words: 80000,
    hint: "~320 pages",
    comparables: 'Like "The Hunger Games" or "Gone Girl" — roughly 300 pages, the standard debut length.',
  },
  {
    id: "epic",
    label: "Epic / saga",
    words: 120000,
    hint: "~480+ pages",
    comparables: 'Like "The Name of the Wind" or "A Game of Thrones" — room for deep world-building.',
  },
];

export function presetDefaultWords(preset: WordCountPresetId | undefined): number | undefined {
  if (!preset || preset === "custom") return undefined;
  const row = WORD_COUNT_PRESETS.find((p) => p.id === preset);
  return row?.words;
}

/** Normalize secondary genres from multi-select; drops primary duplicate and unknown labels. */
export function normalizeSecondaryGenres(
  selected: string[],
  primaryGenre: string | undefined,
  allowed: readonly string[],
): string[] {
  const allow = new Map(allowed.map((g) => [g.toLowerCase(), g]));
  const primary = primaryGenre?.trim().toLowerCase() ?? "";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of selected) {
    const canon = allow.get(raw.trim().toLowerCase());
    if (!canon) continue;
    if (canon.toLowerCase() === primary) continue;
    if (seen.has(canon.toLowerCase())) continue;
    seen.add(canon.toLowerCase());
    out.push(canon);
    if (out.length >= 8) break;
  }
  return out;
}

export function bookDuplicateKey(title: string, seriesId?: string | null): string {
  return `${title.trim().toLowerCase()}|${seriesId ?? ""}`;
}
