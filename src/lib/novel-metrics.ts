import { useMemo, useRef } from "react";

import type { Novel, Scene } from "@/types/novel";

/** Count words in arbitrary prose text (same algorithm used across the app). */
export function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Incremental word counter hook — recomputes only changed paragraphs.
 * For typical scenes (< 5 000 words) this is equivalent to `countWords(content)`.
 * For very long scenes, it avoids a full re-scan on every keystroke by caching
 * per-paragraph counts and only recomputing lines that have changed.
 */
export function useIncrementalWordCount(content: string): number {
  // Map of paragraph text → word count (identity cache)
  const cacheRef = useRef<Map<string, number>>(new Map());

  return useMemo(() => {
    const paragraphs = content.split("\n");
    const nextCache = new Map<string, number>();
    let total = 0;

    for (const para of paragraphs) {
      let count = cacheRef.current.get(para);
      if (count === undefined) {
        count = countWords(para);
      }
      nextCache.set(para, count);
      total += count;
    }

    cacheRef.current = nextCache;
    return total;
  }, [content]);
}

/** Total words across all scenes in a novel. */
export function getNovelWordCount(novel: Novel): number {
  return novel.acts.reduce(
    (sum, act) =>
      sum + act.chapters.reduce((cSum, ch) => cSum + ch.scenes.reduce((sSum, s) => sSum + s.wordCount, 0), 0),
    0,
  );
}

/** Sum of words across every manuscript in the library (Writer's Odyssey account-wide total). */
export function getTotalWordsAcrossNovels(novels: Novel[]): number {
  return novels.reduce((sum, n) => sum + getNovelWordCount(n), 0);
}

/** Odyssey tier progress using account-wide word counts across all projects. */
export function getAccountOdysseyProgress(novels: Novel[]): ReturnType<typeof getOdysseyTierProgress> {
  return getOdysseyTierProgress(getTotalWordsAcrossNovels(novels));
}

/** Most recently updated novel first. */
export function sortNovelsByRecent(novels: Novel[]): Novel[] {
  return [...novels].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/** Last scene with content in manuscript order (for "last edited"). */
export function findLastTouchedScene(novel: Novel): { label: string; scene: Scene | null } {
  let last: Scene | null = null;
  for (const act of novel.acts) {
    for (const ch of act.chapters) {
      for (const sc of ch.scenes) {
        if (sc.wordCount > 0) last = sc;
      }
    }
  }
  if (!last) return { label: "Start your first scene", scene: null };
  return { label: last.title, scene: last };
}

/** First scene with no content for "next up". */
export function findNextSceneTitle(novel: Novel): string {
  for (const act of novel.acts) {
    for (const ch of act.chapters) {
      for (const sc of ch.scenes) {
        if (!sc.content?.trim()) return sc.title;
      }
    }
  }
  const last = novel.acts.at(-1)?.chapters.at(-1)?.scenes.at(-1);
  return last ? `After “${last.title}”` : "New scene";
}

/** Word-tier labels aligned with Writer's Odyssey PRD (Scribe → Eternal Author). */
export function rankFromWords(totalWords: number): { rank: string; nextBadge: string; scenesToBadge: number } {
  if (totalWords < 500) return { rank: "Scribe", nextBadge: "First Flame", scenesToBadge: 1 };
  if (totalWords < 5000) return { rank: "Storyteller", nextBadge: "Pacing Master", scenesToBadge: 15 };
  if (totalWords < 50000) return { rank: "Bard", nextBadge: "Marathon Scribe", scenesToBadge: 40 };
  return { rank: "Eternal Author", nextBadge: "Legend", scenesToBadge: 0 };
}

/** Progress within Odyssey tiers (word thresholds align with `rankFromWords`). */
export function getOdysseyTierProgress(totalWords: number): {
  rank: string;
  nextBadge: string;
  scenesToBadge: number;
  wordsToNextTier: number | null;
  nextTierThreshold: number | null;
  nextTierLabel: string | null;
  tierProgressPct: number;
  atMaxTier: boolean;
} {
  const base = rankFromWords(totalWords);

  if (totalWords < 500) {
    return {
      ...base,
      wordsToNextTier: 500 - totalWords,
      nextTierThreshold: 500,
      nextTierLabel: "Storyteller",
      tierProgressPct: Math.min(100, Math.round((totalWords / 500) * 100)),
      atMaxTier: false,
    };
  }
  if (totalWords < 5000) {
    const span = 5000 - 500;
    return {
      ...base,
      wordsToNextTier: 5000 - totalWords,
      nextTierThreshold: 5000,
      nextTierLabel: "Bard",
      tierProgressPct: Math.min(100, Math.round(((totalWords - 500) / span) * 100)),
      atMaxTier: false,
    };
  }
  if (totalWords < 50000) {
    const span = 50000 - 5000;
    return {
      ...base,
      wordsToNextTier: 50000 - totalWords,
      nextTierThreshold: 50000,
      nextTierLabel: "Eternal Author",
      tierProgressPct: Math.min(100, Math.round(((totalWords - 5000) / span) * 100)),
      atMaxTier: false,
    };
  }
  return {
    ...base,
    wordsToNextTier: null,
    nextTierThreshold: null,
    nextTierLabel: null,
    tierProgressPct: 100,
    atMaxTier: true,
  };
}

/**
 * Writer's Odyssey tier for the **primary** manuscript (active novel, else most recently updated).
 * Dashboard uses this; full Odyssey page may still show account-wide totals elsewhere.
 */
export function getPrimaryNovelOdysseyProgress(primaryNovel: Novel | null): ReturnType<typeof getOdysseyTierProgress> {
  const w = primaryNovel ? getNovelWordCount(primaryNovel) : 0;
  return getOdysseyTierProgress(w);
}
