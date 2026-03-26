import { describe, expect, it, vi } from "vitest";

// Mock supabase client before importing the module under test.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          Object.assign(Promise.resolve({ data: [{ table }], error: null }), {
            maybeSingle: () => Promise.resolve({ data: { table }, error: null }),
            eq: () => Promise.resolve({ data: [{ table }], error: null }),
          }),
      }),
    }),
  },
}));

// Mock series-service to avoid supabase dependency.
vi.mock("@/lib/series-service", () => ({
  fetchBookSeriesForUser: () => Promise.resolve([{ id: "s1", title: "Test Series" }]),
}));

import { downloadJson, fetchUserDataBundle } from "@/lib/user-data-export";

describe("fetchUserDataBundle", () => {
  it("returns a bundle with the expected top-level keys", async () => {
    const bundle = await fetchUserDataBundle("user-123");
    expect(bundle).toMatchObject({
      version: 1,
      exportedAt: expect.any(String),
      bookSeries: expect.any(Array),
    });
    const keys: (keyof typeof bundle)[] = [
      "exportedAt",
      "version",
      "profile",
      "preferences",
      "novels",
      "bookSeries",
      "ideaWebEntries",
      "ideaWebLinks",
      "userStatsDaily",
      "userDailyQuotes",
      "userQuoteFingerprints",
      "userOdysseyPoints",
      "userOdysseyBadges",
    ];
    for (const k of keys) {
      expect(bundle, `missing key: ${k}`).toHaveProperty(k);
    }
  });

  it("populates bookSeries from fetchBookSeriesForUser", async () => {
    const bundle = await fetchUserDataBundle("user-123");
    expect(bundle.bookSeries).toEqual([{ id: "s1", title: "Test Series" }]);
  });
});

describe("downloadJson", () => {
  it("creates a temporary anchor element and clicks it", () => {
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const createElement = vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click,
    } as unknown as HTMLAnchorElement);

    Object.defineProperty(window, "URL", {
      value: { createObjectURL, revokeObjectURL },
      writable: true,
    });

    downloadJson("export.json", { hello: "world" });

    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    createElement.mockRestore();
  });
});
