import { describe, expect, it } from "vitest";

import { STORY_FRAMEWORKS } from "@/lib/story-frameworks";

describe("STORY_FRAMEWORKS", () => {
  it("contains at least 8 frameworks", () => {
    expect(STORY_FRAMEWORKS.length).toBeGreaterThanOrEqual(8);
  });

  it("every framework has required fields", () => {
    for (const fw of STORY_FRAMEWORKS) {
      expect(fw.id, `${fw.name} missing id`).toBeTruthy();
      expect(fw.name, `${fw.id} missing name`).toBeTruthy();
      expect(fw.beats.length, `${fw.id} has no beats`).toBeGreaterThan(0);
      expect(fw.visualization, `${fw.id} missing visualization`).toBeTruthy();
    }
  });

  it("all beat percentages are between 0 and 100", () => {
    for (const fw of STORY_FRAMEWORKS) {
      for (const beat of fw.beats) {
        expect(beat.percentage, `${fw.id} beat "${beat.title}" pct out of range`).toBeGreaterThanOrEqual(0);
        expect(beat.percentage, `${fw.id} beat "${beat.title}" pct out of range`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("all beat ids are unique within a framework", () => {
    for (const fw of STORY_FRAMEWORKS) {
      const ids = fw.beats.map((b) => b.id);
      const unique = new Set(ids);
      expect(unique.size, `${fw.id} has duplicate beat ids`).toBe(ids.length);
    }
  });

  it("beatCount matches actual beats array length", () => {
    for (const fw of STORY_FRAMEWORKS) {
      expect(fw.beats.length, `${fw.id} beatCount mismatch`).toBe(fw.beatCount);
    }
  });

  it("three-act is the first (default) framework", () => {
    expect(STORY_FRAMEWORKS[0].id).toBe("three-act");
  });

  it("core and unlockable frameworks are categorized", () => {
    const categories = new Set(STORY_FRAMEWORKS.map((f) => f.category));
    expect(categories.has("core")).toBe(true);
  });
});
