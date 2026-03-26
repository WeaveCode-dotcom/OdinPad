import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import type { Novel } from "@/types/novel";

/** Single Markdown file: title, metadata, then scenes by act/chapter. */
export function novelToMarkdown(novel: Novel): string {
  const lines: string[] = [];
  lines.push(`# ${novel.title}`);
  lines.push("");
  lines.push(`**Author:** ${novel.author}`);
  if (novel.genre) lines.push(`**Genre:** ${novel.genre}`);
  if (novel.premise) lines.push(`**Premise:** ${novel.premise}`);
  lines.push("");
  for (const act of novel.acts) {
    lines.push(`## ${act.title}`);
    lines.push("");
    for (const ch of act.chapters) {
      lines.push(`### ${ch.title}`);
      lines.push("");
      for (const sc of ch.scenes) {
        lines.push(`#### ${sc.title}`);
        if (sc.summary) {
          lines.push(`*${sc.summary}*`);
          lines.push("");
        }
        lines.push(sc.content || "_Empty scene_");
        lines.push("");
      }
    }
  }
  return lines.join("\n");
}

export function downloadManuscriptMarkdown(novel: Novel): void {
  const md = novelToMarkdown(novel);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${novel.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "manuscript"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printManuscriptHtml(novel: Novel): void {
  const md = novelToMarkdown(novel);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(novel.title)}</title>
  <style>body{font-family:Georgia,serif;max-width:40rem;margin:2rem auto;line-height:1.6;} h1,h2,h3{margin-top:1.5em;} pre{white-space:pre-wrap;}</style></head><body><pre>${escapeHtml(md)}</pre></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Export novel as a formatted .docx file and trigger browser download. */
export async function downloadManuscriptDocx(novel: Novel): Promise<void> {
  const children: Paragraph[] = [];

  // Title page
  children.push(new Paragraph({ text: novel.title, heading: HeadingLevel.TITLE }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `By ${novel.author}`, italics: true })],
    }),
  );
  if (novel.genre) {
    children.push(new Paragraph({ children: [new TextRun({ text: `Genre: ${novel.genre}`, italics: true })] }));
  }
  children.push(new Paragraph({ text: "" }));

  for (const act of novel.acts) {
    children.push(new Paragraph({ text: act.title, heading: HeadingLevel.HEADING_1 }));
    for (const ch of act.chapters) {
      children.push(new Paragraph({ text: ch.title, heading: HeadingLevel.HEADING_2 }));
      for (const sc of ch.scenes) {
        children.push(new Paragraph({ text: sc.title, heading: HeadingLevel.HEADING_3 }));
        if (sc.summary) {
          children.push(new Paragraph({ children: [new TextRun({ text: sc.summary, italics: true })] }));
        }
        if (sc.content) {
          // Split content into paragraphs on newlines
          for (const para of sc.content.split(/\n{2,}/)) {
            const trimmed = para.trim();
            if (trimmed) {
              children.push(new Paragraph({ text: trimmed }));
            }
          }
        } else {
          children.push(
            new Paragraph({ children: [new TextRun({ text: "[Empty scene]", italics: true, color: "999999" })] }),
          );
        }
        children.push(new Paragraph({ text: "" }));
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${novel.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "manuscript"}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
