import { describe, expect, it } from 'vitest';
import { computeWriterStats } from '@/lib/writer-stats';
import type { Novel } from '@/types/novel';

const baseNovel: Novel = {
  id: 'n1',
  title: 'Test',
  author: 'Author',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  wordCount: 0,
  frameworkId: 'three-act',
  acts: [],
  codexEntries: [],
  ideas: [],
  brainstormNotes: [],
};

describe('computeWriterStats', () => {
  it('computes totals and averages', () => {
    const stats = computeWriterStats([
      { ...baseNovel, id: '1', wordCount: 1000, status: 'complete' },
      { ...baseNovel, id: '2', wordCount: 500, status: 'drafting' },
    ]);
    expect(stats.totalWords).toBe(1500);
    expect(stats.projectsCompleted).toBe(1);
    expect(stats.totalProjects).toBe(2);
  });
});
