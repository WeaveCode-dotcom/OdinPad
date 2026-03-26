import mammoth from "mammoth";

import { countWords } from "@/lib/novel-metrics";
import type { Act, Chapter, Novel, Scene } from "@/types/novel";

export type WordImportPreview = {
  plainText: string;
  htmlPreview: string;
};

/** Extract plain text from a .docx file for preview / splitting into ideas. */
export async function previewWordFile(file: File): Promise<WordImportPreview> {
  const buf = await file.arrayBuffer();
  const [{ value: plainText }, { value: html }] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer: buf }),
    mammoth.convertToHtml({ arrayBuffer: buf }),
  ]);
  return { plainText: plainText.trim(), htmlPreview: html };
}

function genId() {
  return crypto.randomUUID();
}

function buildScene(title: string, content: string, order: number): Scene {
  return {
    id: genId(),
    title: title || "Scene",
    summary: "",
    content,
    order,
    status: "draft",
    characters: [],
    wordCount: countWords(content),
    labels: [],
  };
}

function buildChapter(title: string, scenes: Scene[], order: number): Chapter {
  return { id: genId(), title: title || "Chapter", order, scenes };
}

function buildAct(title: string, chapters: Chapter[], order: number): Act {
  return { id: genId(), title: title || "Act", order, chapters };
}

/**
 * Parse a .docx file into a Novel structure using heading hierarchy:
 *   H1 → Act · H2 → Chapter · H3 → Scene title · <p> → scene body
 * If no H1 exists, wraps all chapters in a single "Act 1".
 * If no H2 exists, each H1 section becomes a chapter in "Act 1".
 */
export async function importDocxAsManuscript(file: File, author: string): Promise<Novel> {
  const buf = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });

  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.childNodes);

  const acts: Act[] = [];
  let currentAct: { title: string; chapters: Chapter[] } | null = null;
  let currentChapter: { title: string; scenes: Scene[] } | null = null;
  let currentScene: { title: string; paragraphs: string[] } | null = null;
  let hasH1 = false;
  let hasH2 = false;

  // Quick scan for heading presence
  nodes.forEach((n) => {
    if (n.nodeName === "H1") hasH1 = true;
    if (n.nodeName === "H2") hasH2 = true;
  });

  const flushScene = () => {
    if (!currentScene) return;
    const content = currentScene.paragraphs.join("\n\n");
    if (!currentChapter) {
      currentChapter = { title: currentScene.title, scenes: [] };
    }
    currentChapter.scenes.push(buildScene(currentScene.title, content, currentChapter.scenes.length));
    currentScene = null;
  };

  const flushChapter = () => {
    flushScene();
    if (!currentChapter) return;
    if (!currentAct) currentAct = { title: "Act 1", chapters: [] };
    // If no H3 was used, scene titles inherited from chapter heading
    if (currentChapter.scenes.length === 0 && currentChapter.title) {
      currentChapter.scenes.push(buildScene(currentChapter.title, "", 0));
    }
    currentAct.chapters.push(buildChapter(currentChapter.title, currentChapter.scenes, currentAct.chapters.length));
    currentChapter = null;
  };

  const flushAct = () => {
    flushChapter();
    if (!currentAct) return;
    if (currentAct.chapters.length === 0) {
      currentAct.chapters.push(buildChapter("Chapter 1", [buildScene("Scene 1", "", 0)], 0));
    }
    acts.push(buildAct(currentAct.title, currentAct.chapters, acts.length));
    currentAct = null;
  };

  // Derive title from first H1 or filename
  let novelTitle = file.name.replace(/\.docx$/i, "").trim() || "Imported Manuscript";

  for (const node of nodes) {
    const tag = node.nodeName;
    const text = (node.textContent ?? "").trim();

    if (tag === "H1") {
      if (hasH2) {
        // H1 = Act
        if (acts.length === 0 && !currentAct) {
          // First H1 might actually be the document title — use it
          novelTitle = text || novelTitle;
          if (nodes.indexOf(node) === 0) continue; // skip title-only first H1
        }
        flushAct();
        currentAct = { title: text, chapters: [] };
      } else {
        // No H2 present → H1 = Chapter
        flushChapter();
        if (!currentAct) currentAct = { title: "Act 1", chapters: [] };
        currentChapter = { title: text, scenes: [] };
      }
    } else if (tag === "H2") {
      flushChapter();
      if (!currentAct) currentAct = { title: "Act 1", chapters: [] };
      currentChapter = { title: text, scenes: [] };
    } else if (tag === "H3") {
      flushScene();
      if (!currentChapter) currentChapter = { title: text, scenes: [] };
      currentScene = { title: text, paragraphs: [] };
    } else if (["P", "BLOCKQUOTE", "PRE"].includes(tag) && text) {
      if (!currentScene) {
        if (!currentChapter) {
          if (!currentAct) currentAct = { title: "Act 1", chapters: [] };
          currentChapter = { title: "Chapter 1", scenes: [] };
        }
        currentScene = { title: "Scene 1", paragraphs: [] };
      }
      currentScene.paragraphs.push(text);
    }
  }

  flushAct();

  // Ensure at least one act/chapter/scene
  if (acts.length === 0) {
    acts.push(buildAct("Act 1", [buildChapter("Chapter 1", [buildScene("Scene 1", "", 0)], 0)], 0));
  }

  const totalWordCount = acts
    .flatMap((a) => a.chapters.flatMap((c) => c.scenes))
    .reduce((s, sc) => s + sc.wordCount, 0);

  const now = new Date().toISOString();
  return {
    id: genId(),
    title: novelTitle,
    author,
    status: "drafting",
    createdAt: now,
    updatedAt: now,
    wordCount: totalWordCount,
    frameworkId: "three-act",
    acts,
    codexEntries: [],
    brainstormNotes: [],
  };
}
