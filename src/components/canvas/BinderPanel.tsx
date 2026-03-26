import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, FileText, GripVertical, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNovelContext } from "@/contexts/NovelContext";
import type { Scene } from "@/types/novel";

const statusColors: Record<Scene["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  "in-progress": "bg-primary/20 text-primary",
  complete: "bg-emerald-500/20 text-emerald-400",
  revision: "bg-amber-500/20 text-amber-400",
};

export function BinderPanel() {
  const { activeNovel, addActToNovel, addChapterToAct, addSceneToChapter, setActiveScene, setMode, reorderScene } =
    useNovelContext();

  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set(activeNovel?.acts.map((a) => a.id) || []));
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(activeNovel?.acts.flatMap((a) => a.chapters.map((c) => c.id)) || []),
  );
  const [dragInfo, setDragInfo] = useState<{ sceneId: string; chapterId: string } | null>(null);

  if (!activeNovel) return null;

  const toggleAct = (id: string) =>
    setExpandedActs((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleChapter = (id: string) =>
    setExpandedChapters((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const openScene = (sceneId: string) => {
    setActiveScene(sceneId);
    setMode("write");
  };

  const handleDragStart = (sceneId: string, chapterId: string) => setDragInfo({ sceneId, chapterId });
  const handleDrop = (targetChapterId: string, targetIndex: number) => {
    if (!dragInfo) return;
    reorderScene(dragInfo.sceneId, dragInfo.chapterId, targetChapterId, targetIndex);
    setDragInfo(null);
  };

  // ── Item 13: contextual empty state ───────────────────────────────────────
  if (activeNovel.acts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed border-border/60 bg-muted/20 py-12 text-center">
        <p className="text-base font-semibold text-foreground">Your story has no structure yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Create your first Act to start organizing chapters and scenes. Acts map to the major movements of your story —
          setup, confrontation, resolution.
        </p>
        <Button variant="outline" size="sm" onClick={addActToNovel} className="mt-2 gap-1.5 border-2 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add your first act
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Hierarchical outline — acts, chapters, and scenes. Drag scenes to reorder.
        </p>
        <Button variant="outline" size="sm" onClick={addActToNovel} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add Act
        </Button>
      </div>

      {activeNovel.acts.map((act) => (
        <motion.div
          key={act.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-sm border-2 border-border/70 bg-card/50 shadow-none"
        >
          <button
            type="button"
            onClick={() => toggleAct(act.id)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-accent/5 transition-colors rounded-sm"
          >
            {expandedActs.has(act.id) ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-semibold text-foreground">{act.title}</span>
            <span className="ml-auto text-xs text-muted-foreground font-mono">
              {act.chapters.length} ch · {act.chapters.reduce((s, c) => s + c.scenes.length, 0)} scenes
            </span>
          </button>

          {expandedActs.has(act.id) && (
            <div className="border-t-2 border-border/40 px-2 pb-2">
              {act.chapters.map((chapter) => (
                <div key={chapter.id} className="ml-4 mt-1">
                  <button
                    type="button"
                    onClick={() => toggleChapter(chapter.id)}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent/5 transition-colors"
                  >
                    {expandedChapters.has(chapter.id) ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="font-medium text-foreground">{chapter.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground font-mono">
                      {chapter.scenes.length} scenes
                    </span>
                  </button>

                  {expandedChapters.has(chapter.id) && (
                    <div
                      className="ml-6 space-y-1 pb-2"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(chapter.id, chapter.scenes.length);
                      }}
                    >
                      {chapter.scenes.map((scene, sceneIdx) => (
                        <div
                          key={scene.id}
                          draggable
                          onDragStart={() => handleDragStart(scene.id, chapter.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDrop(chapter.id, sceneIdx);
                          }}
                          onClick={() => openScene(scene.id)}
                          className="group flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm hover:bg-accent/5 transition-colors"
                        >
                          <GripVertical className="h-3.5 w-3.5 text-border opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground truncate">{scene.title}</span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 py-0 ${statusColors[scene.status]}`}
                              >
                                {scene.status}
                              </Badge>
                              {/* ── Item 10: POV tag ──────────────────── */}
                              {scene.pov && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground"
                                >
                                  {scene.pov.slice(0, 14)}
                                </Badge>
                              )}
                            </div>
                            {scene.summary && (
                              <p className="mt-0.5 text-xs text-muted-foreground truncate">{scene.summary}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                            {scene.wordCount > 0 ? `${scene.wordCount}w` : "—"}
                          </span>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSceneToChapter(chapter.id)}
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Add Scene
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addChapterToAct(act.id)}
                className="ml-4 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Chapter
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
