import { describe, expect, it } from "vitest";

import { shouldRouteToOnboarding } from "@/lib/onboarding-gate";

describe("shouldRouteToOnboarding", () => {
  it("returns true only when authenticated and incomplete", () => {
    expect(shouldRouteToOnboarding(true, false, false, true)).toBe(true);
    expect(shouldRouteToOnboarding(true, true, false, true)).toBe(false);
    expect(shouldRouteToOnboarding(true, false, true, true)).toBe(false);
    expect(shouldRouteToOnboarding(false, false, false, true)).toBe(false);
    expect(shouldRouteToOnboarding(true, false, false, false)).toBe(false);
  });
});
