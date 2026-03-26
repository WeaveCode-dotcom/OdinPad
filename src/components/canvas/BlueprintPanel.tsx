import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Circle, Layers, LayoutGrid, LayoutList, Plus, Triangle } from "lucide-react";
import { useState } from "react";

import { BeatRow } from "@/components/canvas/BeatRow";
import FrameworkSelector from "@/components/novel/FrameworkSelector";
import FrameworkVisualization from "@/components/novel/FrameworkVisualization";
import { Badge } from "@/components/ui/badge";
import { useNovelContext } from "@/contexts/NovelContext";
import { STORY_FRAMEWORKS, StoryFramework } from "@/lib/story-frameworks";

type VizMode = "linear" | "grid" | "circle" | "pyramid";

const vizOptions: { mode: VizMode; icon: React.ElementType; label: string }[] = [
  { mode: "linear", icon: LayoutList, label: "Linear" },
  { mode: "grid", icon: LayoutGrid, label: "Grid" },
  { mode: "circle", icon: Circle, label: "Circle" },
  { mode: "pyramid", icon: Triangle, label: "Pyramid" },
];

export function BlueprintPanel() {
  const { activeNovel, applyFramework, getActiveBeats, updateBeat, addCustomBeat, deleteBeat, reorderBeats } =
    useNovelContext();

  const [frameworkOpen, setFrameworkOpen] = useState(false);
  const [vizMode, setVizMode] = useState<VizMode>("linear");
  const [showFrameworkViz, setShowFrameworkViz] = useState(false);
  const [showBeats, setShowBeats] = useState(true);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);

  if (!activeNovel) return null;

  const beats = getActiveBeats();
  const activeFramework = STORY_FRAMEWORKS.find((f) => f.id === activeNovel.frameworkId) || STORY_FRAMEWORKS[0];

  const filledBeatIds = new Set(
    activeNovel.acts
      .flatMap((a) => a.chapters.flatMap((c) => c.scenes))
      .map((s) => s.beatId)
      .filter((id): id is string => Boolean(id)),
  );

  const vizFramework: StoryFramework = {
    ...activeFramework,
    beats: beats.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      percentage: b.percentage,
      tags: b.tags,
      optional: b.optional,
    })),
  };

  const handleFrameworkSelect = (fw: StoryFramework) => {
    applyFramework(fw.id);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Choose a structure template, edit beats, and visualize how your story maps to the blueprint.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFrameworkOpen(true)}
            className="flex items-center gap-1.5 rounded-sm border-2 border-border/70 bg-card/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-none transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            {activeFramework.shortName}
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBeats(!showBeats)}
            className={`rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors ${showBeats ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Beats
          </button>
          <button
            type="button"
            onClick={() => setShowFrameworkViz(!showFrameworkViz)}
            className={`rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors ${showFrameworkViz ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {showFrameworkViz ? "Hide" : "Show"} Visual
          </button>
          {showFrameworkViz && (
            <div className="flex items-center gap-0.5 rounded-sm border-2 border-border bg-secondary/50 p-0.5 shadow-none">
              {vizOptions.map((v) => (
                <button
                  key={v.mode}
                  type="button"
                  onClick={() => setVizMode(v.mode)}
                  className={`rounded p-1.5 transition-colors ${vizMode === v.mode ? "bg-accent/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title={v.label}
                >
                  <v.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFrameworkViz && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-sm border-2 border-border/70 bg-card/30 p-4 shadow-none"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{activeFramework.name}</h3>
                <p className="text-xs text-muted-foreground">{activeFramework.description}</p>
              </div>
              <div className="flex gap-1">
                {activeFramework.bestFor.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <FrameworkVisualization framework={vizFramework} mode={vizMode} filledBeatIds={filledBeatIds} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBeats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-sm border-2 border-border/70 bg-card/30 shadow-none overflow-hidden"
          >
            <div className="flex items-center justify-between border-b-2 border-border/40 px-4 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {activeFramework.shortName} Beats ({beats.length})
              </span>
              <button
                type="button"
                onClick={() => addCustomBeat()}
                className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Beat
              </button>
            </div>
            <div className="divide-y divide-border/20">
              {beats.map((beat, idx) => (
                <BeatRow
                  key={beat.id}
                  beat={beat}
                  index={idx}
                  total={beats.length}
                  isEditing={editingBeatId === beat.id}
                  onStartEdit={() => setEditingBeatId(beat.id)}
                  onStopEdit={() => setEditingBeatId(null)}
                  onUpdate={updateBeat}
                  onDelete={deleteBeat}
                  onAddAfter={() => addCustomBeat(beat.id)}
                  onMoveUp={() => idx > 0 && reorderBeats(idx, idx - 1)}
                  onMoveDown={() => idx < beats.length - 1 && reorderBeats(idx, idx + 1)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FrameworkSelector
        open={frameworkOpen}
        onOpenChange={setFrameworkOpen}
        currentFrameworkId={activeNovel.frameworkId}
        onSelect={handleFrameworkSelect}
      />
    </div>
  );
}
