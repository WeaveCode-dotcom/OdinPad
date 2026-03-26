import { describe, expect, it } from "vitest";

import { computeWritingStreak, getLocalISODate } from "@/lib/user-stats-daily";

describe("computeWritingStreak", () => {
  it("returns 0 when no days meet the threshold", () => {
    expect(computeWritingStreak(new Map(), 500)).toBe(0);
  });

  it("honors streak_rest_date by skipping today when it matches the rest flag", () => {
    const today = getLocalISODate();
    const map = new Map<string, number>();
    map.set(today, 0);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    map.set(getLocalISODate(yesterday), 500);
    const withRest = computeWritingStreak(map, 500, today);
    const withoutRest = computeWritingStreak(map, 500, today);
    expect(withRest).toBe(withoutRest);
    expect(withRest).toBeGreaterThanOrEqual(1);
  });
});
