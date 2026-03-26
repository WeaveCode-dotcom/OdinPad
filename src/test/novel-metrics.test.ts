import { describe, expect, it } from "vitest";

import {
  countWords,
  getAccountOdysseyProgress,
  getNovelWordCount,
  getOdysseyTierProgress,
  getTotalWordsAcrossNovels,
} from "@/lib/novel-metrics";

describe("countWords", () => {
  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("counts single words", () => {
    expect(countWords("hello")).toBe(1);
  });

  it("ignores leading/trailing whitespace", () => {
    expect(countWords("  hello world  ")).toBe(2);
  });

  it("handles multiple internal spaces", () => {
    expect(countWords("one   two    three")).toBe(3);
  });

  it("handles newlines and tabs", () => {
    expect(countWords("line one\nline two\ttab")).toBe(5);
  });

  it("matches the legacy inline expression", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const legacy = text.split(/\s+/).filter(Boolean).length;
    expect(countWords(text)).toBe(legacy);
  });
});
import type { Novel } from "@/types/novel";

function emptyNovel(overrides: Partial<Novel> & Pick<Novel, "id" | "title">): Novel {
  return {
    author: "Test",
    genre: "Fantasy",
    updatedAt: new Date().toISOString(),
    acts: [
      {
        id: "a1",
        title: "Act",
        chapters: [
          {
            id: "c1",
            title: "Ch",
            scenes: [{ id: "s1", title: "Scene", wordCount: 0, content: "" }],
          },
        ],
      },
    ],
    ...overrides,
  } as Novel;
}

describe("getTotalWordsAcrossNovels", () => {
  it("sums words from all novels", () => {
    const n1 = emptyNovel({ id: "1", title: "A" });
    n1.acts[0].chapters[0].scenes[0].wordCount = 100;
    const n2 = emptyNovel({ id: "2", title: "B" });
    n2.acts[0].chapters[0].scenes[0].wordCount = 250;
    expect(getTotalWordsAcrossNovels([n1, n2])).toBe(350);
  });

  it("returns 0 for empty list", () => {
    expect(getTotalWordsAcrossNovels([])).toBe(0);
  });
});

describe("getAccountOdysseyProgress", () => {
  it("matches getOdysseyTierProgress on summed words", () => {
    const n = emptyNovel({ id: "1", title: "A" });
    n.acts[0].chapters[0].scenes[0].wordCount = 600;
    const acc = getAccountOdysseyProgress([n]);
    const direct = getOdysseyTierProgress(600);
    expect(acc.rank).toBe(direct.rank);
    expect(acc.wordsToNextTier).toBe(direct.wordsToNextTier);
    expect(acc.tierProgressPct).toBe(direct.tierProgressPct);
  });
});

describe("getNovelWordCount", () => {
  it("aggregates scene word counts", () => {
    const n = emptyNovel({ id: "1", title: "A" });
    expect(getNovelWordCount(n)).toBe(0);
    n.acts[0].chapters[0].scenes[0].wordCount = 42;
    expect(getNovelWordCount(n)).toBe(42);
  });
});
