import type { IdeaWebEntry } from "@/types/idea-web";

export function ideaWebEntriesToMarkdown(entries: IdeaWebEntry[]): string {
  const lines: string[] = ["# Idea Web export", `Entries: ${entries.length}`, ""];
  for (const e of entries) {
    lines.push(`## ${e.title || "Untitled"}`);
    lines.push(`Status: ${e.status} · Updated: ${e.updatedAt}`);
    if (e.tags?.length) lines.push(`Tags: ${e.tags.join(", ")}`);
    lines.push("");
    lines.push(e.body || "");
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

export function downloadIdeaWebMarkdown(entries: IdeaWebEntry[], filename = "idea-web.md"): void {
  const blob = new Blob([ideaWebEntriesToMarkdown(entries)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
