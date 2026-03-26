import { createIdeaWebEntry } from "@/lib/idea-web/service";

/** Import markdown: one entry per `#` / `##` heading block, or one entry for the whole file. */
export async function importMarkdownAsIdeas(
  userId: string,
  novelId: string | null,
  markdown: string,
  defaultTitle: string,
): Promise<number> {
  const text = markdown.trim();
  if (!text) return 0;

  const blocks = text
    .split(/\n(?=^#+\s)/m)
    .map((b) => b.trim())
    .filter(Boolean);
  const chunks = blocks.length > 0 ? blocks : [text];
  let count = 0;
  const baseTitle = defaultTitle.replace(/\.md$/i, "") || "Imported";

  for (const block of chunks) {
    const lines = block.split("\n");
    const m = lines[0]?.match(/^(#+)\s*(.+)$/);
    const title = m ? m[2].trim().slice(0, 200) : baseTitle;
    const body = m ? lines.slice(1).join("\n").trim() : block;
    await createIdeaWebEntry({
      userId,
      novelId,
      title: title || baseTitle,
      body: body || title,
      ideaType: "misc",
      tags: ["import"],
    });
    count++;
  }
  return count;
}
