import type { IdeaWebEntry } from "@/types/idea-web";

/** Non-generative connection suggestions: shared tags, same category, recent pair window. */
export function suggestIdeaPairs(entries: IdeaWebEntry[]): { a: string; b: string; reason: string }[] {
  const out: { a: string; b: string; reason: string }[] = [];
  const sorted = [...entries].sort((x, y) => Date.parse(y.createdAt) - Date.parse(x.createdAt));

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const A = sorted[i];
      const B = sorted[j];
      if (A.id === B.id) continue;

      const tagOverlap = A.tags.filter((t) => B.tags.includes(t));
      if (tagOverlap.length > 0) {
        out.push({ a: A.id, b: B.id, reason: `Shared tags: ${tagOverlap.slice(0, 3).join(", ")}` });
        continue;
      }

      const ca = (A.category || A.ideaType || "").toLowerCase();
      const cb = (B.category || B.ideaType || "").toLowerCase();
      if (ca && ca === cb) {
        out.push({ a: A.id, b: B.id, reason: `Same type: ${ca}` });
        continue;
      }

      const ta = Date.parse(A.createdAt);
      const tb = Date.parse(B.createdAt);
      if (Math.abs(ta - tb) < 1000 * 60 * 60 * 6) {
        out.push({ a: A.id, b: B.id, reason: "Logged within hours of each other" });
      }
    }
  }

  const seen = new Set<string>();
  return out
    .filter((s) => {
      const key = [s.a, s.b].sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 25);
}
