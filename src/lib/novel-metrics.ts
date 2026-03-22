import type { Novel, Scene } from '@/types/novel';

/** Total words across all scenes in a novel. */
export function getNovelWordCount(novel: Novel): number {
  return novel.acts.reduce(
    (sum, act) =>
      sum +
      act.chapters.reduce(
        (cSum, ch) => cSum + ch.scenes.reduce((sSum, s) => sSum + s.wordCount, 0),
        0,
      ),
    0,
  );
}

/** Most recently updated novel first. */
export function sortNovelsByRecent(novels: Novel[]): Novel[] {
  return [...novels].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
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
  if (!last) return { label: 'Start your first scene', scene: null };
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
  return last ? `After “${last.title}”` : 'New scene';
}

export function rankFromWords(totalWords: number): { rank: string; nextBadge: string; scenesToBadge: number } {
  if (totalWords < 500) return { rank: 'Apprentice', nextBadge: 'First Flame', scenesToBadge: 1 };
  if (totalWords < 5000) return { rank: 'Storyteller', nextBadge: 'Pacing Master', scenesToBadge: 15 };
  if (totalWords < 50000) return { rank: 'Novelist', nextBadge: 'Marathon Scribe', scenesToBadge: 40 };
  return { rank: 'Odyssey Master', nextBadge: 'Legend', scenesToBadge: 0 };
}
