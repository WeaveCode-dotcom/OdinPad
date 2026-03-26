/**
 * Zod schemas for the key Supabase row shapes returned at the API boundary.
 * Use these to validate/narrow data from `supabase.from(...)` calls before
 * passing it deeper into the application.
 *
 * Pattern: schema.parse(row) throws on unexpected shape; schema.safeParse(row)
 * returns { success, data, error } for graceful fallbacks.
 */
import { z } from "zod";

// ─── Common ────────────────────────────────────────────────────────────────────

const isoDateString = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));

// ─── Novels ────────────────────────────────────────────────────────────────────

export const NovelRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  author: z.string().optional().nullable(),
  data: z.record(z.unknown()),
  series_id: z.string().uuid().optional().nullable(),
  created_at: isoDateString,
  updated_at: isoDateString,
});

export type NovelRowParsed = z.infer<typeof NovelRowSchema>;

// ─── Idea Web entries ─────────────────────────────────────────────────────────

export const IdeaWebStatusSchema = z.enum(["seed", "sprouting", "growing", "dormant", "harvested", "archived"]);

export const IdeaWebEntryRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  status: IdeaWebStatusSchema,
  category: z.string().nullable().optional(),
  tags: z.array(z.string()),
  pinned: z.boolean(),
  novel_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: isoDateString,
  updated_at: isoDateString,
});

export type IdeaWebEntryRowParsed = z.infer<typeof IdeaWebEntryRowSchema>;

export const IdeaWebLinkRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  label: z.string().nullable().optional(),
  created_at: isoDateString,
});

export type IdeaWebLinkRowParsed = z.infer<typeof IdeaWebLinkRowSchema>;

// ─── Book series ──────────────────────────────────────────────────────────────

export const BookSeriesRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  created_at: isoDateString,
  updated_at: isoDateString,
});

export type BookSeriesRowParsed = z.infer<typeof BookSeriesRowSchema>;

// ─── Daily stats ──────────────────────────────────────────────────────────────

export const UserDailyStatRowSchema = z.object({
  user_id: z.string().uuid(),
  stat_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  words_written: z.number().int().nonnegative(),
  updated_at: isoDateString,
});

export type UserDailyStatRowParsed = z.infer<typeof UserDailyStatRowSchema>;

// ─── User preferences ─────────────────────────────────────────────────────────

export const UserPreferencesRowSchema = z
  .object({
    user_id: z.string().uuid(),
    daily_word_goal: z.number().int().nonnegative().optional().nullable(),
    weekly_word_goal: z.number().int().nonnegative().optional().nullable(),
    font_size: z.number().optional().nullable(),
    created_at: isoDateString.optional().nullable(),
    updated_at: isoDateString.optional().nullable(),
  })
  .passthrough(); // preferences schema grows; passthrough allows unknown keys

export type UserPreferencesRowParsed = z.infer<typeof UserPreferencesRowSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse an array of raw rows with a schema. Invalid rows are logged (dev only) and filtered out
 * rather than throwing, so a single malformed row never breaks the UI.
 */
export function safeParseRows<T>(schema: z.ZodType<T>, rows: unknown[]): T[] {
  const result: T[] = [];
  for (const row of rows) {
    const parsed = schema.safeParse(row);
    if (parsed.success) {
      result.push(parsed.data);
    } else if (import.meta.env.DEV) {
      console.warn("[OdinPad] Unexpected API row shape:", parsed.error.issues, row);
    }
  }
  return result;
}
