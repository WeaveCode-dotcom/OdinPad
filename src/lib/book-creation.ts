import { mapPersonalization, type WritingGoal, type WritingStyle } from '@/lib/personalization';

const DRAFT_PREFIX = 'odinpad_book_creation_draft_';

export interface BookCreationInput {
  title: string;
  author: string;
  genre: string;
  frameworkId: string;
  premise?: string;
  targetWordCount?: string;
  status?: 'brainstorming' | 'outlining' | 'drafting' | 'editing' | 'complete';
}

export interface BookCreationNormalized {
  title: string;
  author: string;
  genre: string;
  frameworkId: string;
  premise?: string;
  targetWordCount?: number;
  status?: 'brainstorming' | 'outlining' | 'drafting' | 'editing' | 'complete';
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

export interface BookCreationDraft {
  title: string;
  author: string;
  genre: string;
  frameworkId: string;
  premise: string;
  targetWordCount: string;
  advancedOpen: boolean;
}

export function getDraftStorageKey(userId: string): string {
  return `${DRAFT_PREFIX}${userId}`;
}

export function loadBookCreationDraft(userId: string): BookCreationDraft | null {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as BookCreationDraft;
  } catch {
    return null;
  }
}

export function saveBookCreationDraft(userId: string, draft: BookCreationDraft): void {
  try {
    localStorage.setItem(getDraftStorageKey(userId), JSON.stringify(draft));
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

export function validateAndNormalizeBookCreation(
  input: BookCreationInput,
  existingTitles: string[] = [],
): BookCreationValidation {
  const normalized: BookCreationNormalized = {
    title: input.title.trim(),
    author: input.author.trim() || 'Anonymous',
    genre: input.genre.trim(),
    frameworkId: input.frameworkId.trim(),
    premise: input.premise?.trim() || undefined,
    status: input.status ?? 'drafting',
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!normalized.title) errors.push('Title is required.');
  if (!normalized.genre) errors.push('Genre is required.');
  if (!normalized.frameworkId) errors.push('Template is required.');

  const dedupedTitles = new Set(existingTitles.map((value) => value.trim().toLowerCase()));
  if (dedupedTitles.has(normalized.title.toLowerCase())) {
    warnings.push('A project with this title already exists. You can still continue.');
  }

  if (input.targetWordCount && input.targetWordCount.trim()) {
    const parsed = Number(input.targetWordCount.trim());
    if (!Number.isFinite(parsed)) {
      errors.push('Target word count must be a number.');
    } else if (parsed < 100 || parsed > 1_000_000) {
      errors.push('Target word count must be between 100 and 1,000,000.');
    } else {
      normalized.targetWordCount = parsed;
    }
  }

  return { normalized, errors, warnings };
}

export function rankFrameworkRecommendations(input: RecommendationInput): FrameworkRecommendation[] {
  const writingStyle = (input.writingStyle as WritingStyle) ?? 'hybrid';
  const primaryGoal = (input.primaryGoal as WritingGoal) ?? 'finish-first-draft';
  const genres = [input.selectedGenre, ...(input.preferredGenres ?? [])]
    .filter(Boolean)
    .map((value) => String(value));

  const mapped = mapPersonalization({
    writingStyle,
    primaryGoal,
    genres,
  });

  const genre = (input.selectedGenre ?? '').toLowerCase();
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

  addScore(mapped.recommendedFrameworkId, 5, 'Matches your writing profile');

  if (genre.includes('romance')) addScore('hauge-six-stage', 3, 'Popular for romance pacing');
  if (genre.includes('fantasy') || genre.includes('sci')) addScore('heros-journey', 3, 'Strong fit for epic/speculative arcs');
  if (genre.includes('mystery') || genre.includes('thriller')) addScore('story-grid', 2, 'Good for genre-driven beats');
  if (genre.includes('literary')) addScore('freytags-pyramid', 2, 'Fits literary tension curves');

  if (writingStyle === 'plotter') addScore('save-the-cat', 2, 'Works well for structured planning');
  if (writingStyle === 'pantser') addScore('story-circle', 2, 'Flexible structure for discovery writing');
  if (primaryGoal === 'build-world') addScore('heros-journey', 1, 'Supports worldbuilding progression');
  if (primaryGoal === 'daily-word-count') addScore('three-act', 1, 'Simple structure for drafting momentum');

  if (input.fallbackFrameworkId) addScore(input.fallbackFrameworkId, 1, 'Your saved default template');

  return Array.from(scoreByFramework.values()).sort((a, b) => b.score - a.score);
}

