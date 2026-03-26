import { describe, expect, it } from "vitest";

import { clearDraft, draftKey, loadDraft, saveDraft } from "@/lib/form-drafts";

describe("form-drafts", () => {
  it("round-trips and clears", () => {
    const uid = "test-user";
    const form = "unit_test_form";
    const k = draftKey(uid, form);
    expect(k).toContain("unit_test_form");

    saveDraft(uid, form, { a: "hello", b: "world" });
    const loaded = loadDraft(uid, form);
    expect(loaded?.data.a).toBe("hello");
    clearDraft(uid, form);
    expect(loadDraft(uid, form)).toBeNull();
  });
});
