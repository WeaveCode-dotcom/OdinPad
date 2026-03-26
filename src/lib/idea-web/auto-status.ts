import type { IdeaWebUserSettings } from "@/lib/idea-web/idea-web-user-settings";
import type { IdeaWebEntry, IdeaWebLink, IdeaWebStatus } from "@/types/idea-web";

export function countLinksForEntry(entryId: string, links: IdeaWebLink[]): number {
  return links.filter((l) => l.fromEntryId === entryId || l.toEntryId === entryId).length;
}

function wordCount(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Suggest next lifecycle status from content/links (never downgrades).
 */
export function suggestAutoStatus(
  entry: IdeaWebEntry,
  linkCount: number,
  rules: IdeaWebUserSettings["autoStatusRules"] | undefined,
): IdeaWebStatus | null {
  if (entry.status === "harvested" || entry.status === "archived" || entry.status === "dormant") {
    return null;
  }

  const r = rules;
  if (entry.status === "seed" && r?.seedToSprouting?.enabled) {
    const minW = r.seedToSprouting.minBodyWords ?? 40;
    if (wordCount(entry.body) >= minW) return "sprouting";
  }

  if (entry.status === "sprouting" && r?.sproutingToGrowing?.enabled) {
    const minL = r.sproutingToGrowing.minLinks ?? 1;
    if (linkCount >= minL) return "growing";
  }

  return null;
}
