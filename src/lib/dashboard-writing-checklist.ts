import { getLocalISODate } from "@/lib/user-stats-daily";
import type { IdeaWebEntry } from "@/types/idea-web";

/** v1 defaults: daily goal + Idea Web activity = today (local); “open project” = active manuscript selected. */
export type WritingChecklistTaskId = "daily" | "idea" | "open";

const STORAGE_KEY = "odinpad_writing_checklist_overrides";

export type WritingChecklistOverrides = Partial<Record<WritingChecklistTaskId, boolean>>;

export function loadWritingChecklistOverrides(): WritingChecklistOverrides {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Record<string, unknown>;
    const out: WritingChecklistOverrides = {};
    if (typeof p.daily === "boolean") out.daily = p.daily;
    if (typeof p.idea === "boolean") out.idea = p.idea;
    if (typeof p.open === "boolean") out.open = p.open;
    return out;
  } catch {
    return {};
  }
}

export function saveWritingChecklistOverrides(o: WritingChecklistOverrides): void {
  if (typeof localStorage === "undefined") return;
  if (Object.keys(o).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
}

export function deriveWritingChecklistState(input: {
  wordsToday: number;
  dailyGoal: number;
  ideaWebEntries: IdeaWebEntry[];
  todayIso: string;
  hasActiveNovel: boolean;
  /** True after user has opened Write in workspace at least once (user_preferences). */
  firstRunWriteOpened?: boolean;
}): Record<WritingChecklistTaskId, boolean> {
  const { wordsToday, dailyGoal, ideaWebEntries, todayIso, hasActiveNovel, firstRunWriteOpened } = input;

  const dailyMet = dailyGoal > 0 && wordsToday >= dailyGoal;
  const ideaToday = ideaWebEntries.some((e) => {
    const u = getLocalISODate(new Date(e.updatedAt));
    const c = getLocalISODate(new Date(e.createdAt));
    return u === todayIso || c === todayIso;
  });

  return {
    daily: dailyMet,
    idea: ideaToday,
    open: hasActiveNovel || Boolean(firstRunWriteOpened),
  };
}

export function mergeChecklistDone(
  derived: Record<WritingChecklistTaskId, boolean>,
  overrides: WritingChecklistOverrides,
): Record<WritingChecklistTaskId, boolean> {
  return {
    daily: overrides.daily ?? derived.daily,
    idea: overrides.idea ?? derived.idea,
    open: overrides.open ?? derived.open,
  };
}

export function toggleChecklistOverride(
  id: WritingChecklistTaskId,
  derived: Record<WritingChecklistTaskId, boolean>,
  overrides: WritingChecklistOverrides,
): WritingChecklistOverrides {
  const current = overrides[id] ?? derived[id];
  const next = !current;
  const nextOverrides: WritingChecklistOverrides = { ...overrides };
  if (next === derived[id]) {
    delete nextOverrides[id];
  } else {
    nextOverrides[id] = next;
  }
  return nextOverrides;
}
