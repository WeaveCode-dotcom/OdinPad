import { describe, expect, it } from 'vitest';
import { mapPersonalization } from '@/lib/personalization';

describe('mapPersonalization', () => {
  it('recommends codex-friendly fantasy flow', () => {
    const result = mapPersonalization({
      writingStage: 'drafting',
      writingStyle: 'hybrid',
      genres: ['Fantasy'],
      primaryGoal: 'build-world',
    });
    expect(result.recommendedFrameworkId).toBe('heros-journey');
    expect(result.preferredWorkspaceMode).toBe('write');
    expect(result.highlightedTools).toContain('codex');
  });

  it('supports quiz mapping without stage', () => {
    const result = mapPersonalization({
      writingStyle: 'plotter',
      genres: ['Mystery'],
      primaryGoal: 'finish-first-draft',
    });
    expect(result.preferredWorkspaceMode).toBe('ideas');
    expect(result.recommendedFrameworkId).toBe('save-the-cat');
  });
});
