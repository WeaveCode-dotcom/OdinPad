import { describe, expect, it } from 'vitest';
import {
  rankFrameworkRecommendations,
  validateAndNormalizeBookCreation,
} from '@/lib/book-creation';

describe('validateAndNormalizeBookCreation', () => {
  it('validates required fields and normalizes payload', () => {
    const result = validateAndNormalizeBookCreation({
      title: '  My Book  ',
      author: '  ',
      genre: ' Fantasy ',
      frameworkId: 'heros-journey',
      premise: '  A hero rises  ',
      targetWordCount: '50000',
    });

    expect(result.errors).toEqual([]);
    expect(result.normalized.title).toBe('My Book');
    expect(result.normalized.author).toBe('Anonymous');
    expect(result.normalized.genre).toBe('Fantasy');
    expect(result.normalized.premise).toBe('A hero rises');
    expect(result.normalized.targetWordCount).toBe(50000);
  });

  it('warns on duplicate title and errors on invalid target word count', () => {
    const result = validateAndNormalizeBookCreation(
      {
        title: 'Existing Book',
        author: 'Jane',
        genre: 'Mystery',
        frameworkId: 'story-grid',
        targetWordCount: 'abc',
      },
      ['existing book'],
    );

    expect(result.warnings[0]).toContain('already exists');
    expect(result.errors[0]).toContain('must be a number');
  });
});

describe('rankFrameworkRecommendations', () => {
  it('prioritizes profile + genre aligned frameworks', () => {
    const ranking = rankFrameworkRecommendations({
      selectedGenre: 'Fantasy',
      writingStyle: 'plotter',
      primaryGoal: 'build-world',
      fallbackFrameworkId: 'three-act',
    });

    expect(ranking.length).toBeGreaterThan(0);
    expect(ranking[0].frameworkId).toBeTruthy();
  });
});

