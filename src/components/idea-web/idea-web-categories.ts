import type { IdeaWebEntry } from "@/types/idea-web";
import type { Idea } from "@/types/novel";

export const IDEA_WEB_CATEGORIES: { value: Idea["category"]; label: string; color: string }[] = [
  { value: "plot", label: "Plot", color: "bg-primary/20 text-primary border-primary/30" },
  { value: "character", label: "Character", color: "bg-teal-500/20 text-teal-300 border-teal-500/35" },
  { value: "world", label: "World", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { value: "theme", label: "Theme", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  { value: "misc", label: "Misc", color: "bg-muted text-muted-foreground border-border" },
];

export function entryCategory(entry: IdeaWebEntry): Idea["category"] {
  const c = (entry.category || entry.ideaType) as Idea["category"];
  if (IDEA_WEB_CATEGORIES.some((x) => x.value === c)) return c;
  return "misc";
}
