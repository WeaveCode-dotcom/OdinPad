import { describe, expect, it } from "vitest";

import { mapPersonalization } from "@/lib/personalization";

describe("mapPersonalization", () => {
  it("recommends story-wiki-friendly fantasy flow", () => {
    const result = mapPersonalization({
      writingStage: "drafting",
      writingStyle: "hybrid",
      genres: ["Fantasy"],
      primaryGoal: "build-world",
    });
    expect(result.recommendedFrameworkId).toBe("heros-journey");
    expect(result.preferredWorkspaceMode).toBe("write");
    expect(result.highlightedTools).toContain("story-wiki");
  });

  it("supports quiz mapping without stage", () => {
    const result = mapPersonalization({
      writingStyle: "plotter",
      genres: ["Mystery"],
      primaryGoal: "finish-first-draft",
    });
    expect(result.preferredWorkspaceMode).toBe("canvas");
    expect(result.recommendedFrameworkId).toBe("save-the-cat");
  });
});
