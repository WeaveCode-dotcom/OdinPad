import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Circle,
  Download,
  Layers,
  LayoutGrid,
  LayoutList,
  Plus,
  Shuffle,
  Triangle,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { BeatRow } from "@/components/canvas/BeatRow";
import FrameworkSelector from "@/components/novel/FrameworkSelector";
import FrameworkVisualization from "@/components/novel/FrameworkVisualization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNovelContext } from "@/contexts/NovelContext";
import type { BeatTone, CustomBeat } from "@/types/novel";
import { STORY_FRAMEWORKS, StoryFramework } from "@/lib/story-frameworks";

type VizMode = "linear" | "grid" | "circle" | "pyramid";

const vizOptions: { mode: VizMode; icon: React.ElementType; label: string }[] = [
  { mode: "linear", icon: LayoutList, label: "Linear" },
  { mode: "grid", icon: LayoutGrid, label: "Grid" },
  { mode: "circle", icon: Circle, label: "Circle" },
  { mode: "pyramid", icon: Triangle, label: "Pyramid" },
];

const TONE_COLORS: Record<BeatTone, string> = {
  action: "#ef4444",
  revelation: "#8b5cf6",
  emotional: "#ec4899",
  transition: "#6b7280",
  climax: "#f97316",
};

const TONE_LABELS: Record<BeatTone, string> = {
  action: "Action",
  revelation: "Revelation",
  emotional: "Emotional",
  transition: "Transition",
  climax: "Climax",
};

const BEAT_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#84cc16", "#ef4444", "#eab308"];

export function BlueprintPanel() {
  const { activeNovel, applyFramework, getActiveBeats, updateBeat, addCustomBeat, deleteBeat, reorderBeats } =
    useNovelContext();

  const [frameworkOpen, setFrameworkOpen] = useState(false);
  const [vizMode, setVizMode] = useState<VizMode>("linear");
  const [showFrameworkViz, setShowFrameworkViz] = useState(false);
  const [showBeats, setShowBeats] = useState(true);
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [showBeatNotes, setShowBeatNotes] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  if (!activeNovel) return null;

  const beats = getActiveBeats();
  const activeFramework = STORY_FRAMEWORKS.find((f) => f.id === activeNovel.frameworkId) || STORY_FRAMEWORKS[0];

  // ── Scene assignments ────────────────────────────────────────────────────────

  const allScenes = activeNovel.acts.flatMap((a) =>
    a.chapters.flatMap((c) => c.scenes.map((s) => ({ ...s, actTitle: a.title, chapterTitle: c.title }))),
  );

  const scenesPerBeat = (beatId: string) => allScenes.filter((s) => s.beatId === beatId);

  const filledBeatIds = new Set(allScenes.map((s) => s.beatId).filter((id): id is string => Boolean(id)));

  const totalWords = allScenes.reduce((s, sc) => s + sc.wordCount, 0);

  // ── Coverage ─────────────────────────────────────────────────────────────────

  const coveragePct = beats.length > 0 ? Math.round((filledBeatIds.size / beats.length) * 100) : 0;

  // ── Viz framework ─────────────────────────────────────────────────────────────

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

  // ── Framework select ──────────────────────────────────────────────────────────

  const handleFrameworkSelect = (fw: StoryFramework) => {
    applyFramework(fw.id);
  };

  // ── Auto-distribute percentages ───────────────────────────────────────────────

  const redistributeEvenly = () => {
    const pct = Math.floor(100 / beats.length);
    const remainder = 100 - pct * beats.length;
    beats.forEach((b, i) => {
      updateBeat(b.id, { percentage: i === 0 ? pct + remainder : pct });
    });
  };

  // ── Import beats from text ────────────────────────────────────────────────────

  const importFromText = () => {
    const lines = importText
      .split("\n")
      .map((l) => l.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const pct = Math.floor(100 / lines.length);
    // Add beats one by one
    lines.forEach((line, i) => {
      addCustomBeat();
    });
    setImportOpen(false);
    setImportText("");
  };

  // ── Framework export / import ─────────────────────────────────────────────────

  const exportFramework = () => {
    const data = { frameworkId: activeNovel.frameworkId, beats };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeFramework.shortName.replace(/\s+/g, "_")}_beats.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFrameworkJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (Array.isArray(json.beats)) {
          json.beats.forEach((b: Partial<CustomBeat>) => {
            if (b.title) addCustomBeat();
          });
        }
      } catch {
        // invalid JSON
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Beat timeline bar ─────────────────────────────────────────────────────────

  function BeatTimelineBar() {
    const total = beats.reduce((s, b) => s + b.percentage, 0) || 100;
    return (
      <div className="flex h-6 w-full overflow-hidden rounded-sm border border-border/60">
        {beats.map((b, i) => {
          const pct = (b.percentage / total) * 100;
          const color = b.color ?? BEAT_COLORS[i % BEAT_COLORS.length];
          const filled = filledBeatIds.has(b.id);
          return (
            <Tooltip key={b.id}>
              <TooltipTrigger asChild>
                <div
                  style={{
                    width: `${pct}%`,
                    background: filled ? color : `${color}44`,
                    borderRight: "1px solid rgba(255,255,255,0.2)",
                    minWidth: 2,
                  }}
                  aria-label={`${b.title}: ${b.percentage}%`}
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="font-semibold">{b.title}</p>
                <p>
                  {b.percentage}% · {scenesPerBeat(b.id).length} scenes
                </p>
                {!filled && <p className="text-amber-400">No scenes assigned</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Choose a structure template, edit beats, and visualize how your story maps to the blueprint.
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={exportFramework}
                  className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                  aria-label="Export beat sheet as JSON"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Export as JSON</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                  aria-label="Import beat sheet from JSON"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Import JSON</TooltipContent>
            </Tooltip>
            <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={importFrameworkJSON} />
          </div>
        </div>

        {/* Coverage summary */}
        <div className="flex items-center gap-3 rounded-sm border border-border/60 bg-card/50 px-3 py-2">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground">Beat Coverage</span>
              <span className="text-xs font-mono text-foreground">
                {filledBeatIds.size}/{beats.length} beats · {coveragePct}%
              </span>
            </div>
            <Progress value={coveragePct} className="h-1.5" />
          </div>
          {beats.some((b) => !filledBeatIds.has(b.id) && !b.optional) && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle
                  className="h-4 w-4 text-amber-400 shrink-0"
                  aria-label="Some required beats have no scenes"
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {beats.filter((b) => !filledBeatIds.has(b.id) && !b.optional).length} required beats have no scenes
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Beat timeline bar */}
        {beats.length > 0 && <BeatTimelineBar />}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFrameworkOpen(true)}
              className="flex items-center gap-1.5 rounded-sm border-2 border-border/70 bg-card/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-none transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Layers className="h-3.5 w-3.5 text-primary" aria-hidden />
              {activeFramework.shortName}
              <ChevronDown className="h-3 w-3" aria-hidden />
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
                    <v.icon className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Visualization */}
        <AnimatePresence>
          {showFrameworkViz && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-sm border-2 border-border/70 bg-card/30 p-4 shadow-none"
              role="img"
              aria-label={`${activeFramework.name} beat visualization`}
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

        {/* Beats list */}
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
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={redistributeEvenly}
                        className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                        aria-label="Redistribute beat percentages evenly"
                      >
                        <Shuffle className="h-3 w-3" aria-hidden />
                        Redistribute
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Set all beats to equal percentages</TooltipContent>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                  >
                    <Upload className="h-3 w-3" aria-hidden />
                    Import from text
                  </button>
                  <button
                    type="button"
                    onClick={() => addCustomBeat()}
                    className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                  >
                    <Plus className="h-3 w-3" aria-hidden />
                    Add Beat
                  </button>
                </div>
              </div>

              {/* Percentage validation warning */}
              {beats.length > 0 &&
                (() => {
                  const total = beats.reduce((s, b) => s + b.percentage, 0);
                  if (total > 110 || total < 90) {
                    return (
                      <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Beat percentages total {total}% (expected ~100%). Consider redistributing.
                      </div>
                    );
                  }
                  return null;
                })()}

              <div className="divide-y divide-border/20">
                {beats.map((beat, idx) => {
                  const sceneCount = scenesPerBeat(beat.id).length;
                  const isCovered = filledBeatIds.has(beat.id);
                  return (
                    <div key={beat.id} className="group relative">
                      {/* Scene count badge */}
                      <div className="absolute right-[120px] top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <span
                          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            isCovered ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {sceneCount} {sceneCount === 1 ? "scene" : "scenes"}
                          {!isCovered && !beat.optional && <AlertTriangle className="ml-1 h-2.5 w-2.5" aria-hidden />}
                        </span>
                      </div>

                      {/* Tone & color dot */}
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                        {beat.color && (
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: beat.color }}
                            aria-hidden
                          />
                        )}
                        {beat.tone && (
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: TONE_COLORS[beat.tone] }}
                            aria-label={`Tone: ${TONE_LABELS[beat.tone]}`}
                          />
                        )}
                      </div>

                      <BeatRow
                        beat={beat}
                        index={idx}
                        total={beats.length}
                        isEditing={editingBeatId === beat.id}
                        isFilled={isCovered}
                        onStartEdit={() => setEditingBeatId(beat.id)}
                        onStopEdit={() => setEditingBeatId(null)}
                        onUpdate={updateBeat}
                        onDelete={deleteBeat}
                        onAddAfter={() => addCustomBeat(beat.id)}
                        onMoveUp={() => idx > 0 && reorderBeats(idx, idx - 1)}
                        onMoveDown={() => idx < beats.length - 1 && reorderBeats(idx, idx + 1)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Word-count per beat summary */}
              {totalWords > 0 && beats.length > 0 && (
                <div className="border-t border-border/20 px-4 py-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Word distribution by beat
                  </p>
                  <div className="space-y-1">
                    {beats.map((b, i) => {
                      const scenes = scenesPerBeat(b.id);
                      const wc = scenes.reduce((s, sc) => s + sc.wordCount, 0);
                      const pct = totalWords > 0 ? Math.round((wc / totalWords) * 100) : 0;
                      const color = b.color ?? BEAT_COLORS[i % BEAT_COLORS.length];
                      if (wc === 0) return null;
                      return (
                        <div key={b.id} className="flex items-center gap-2">
                          <span className="w-32 truncate text-[11px] text-muted-foreground">{b.title}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="w-12 text-right text-[11px] font-mono text-muted-foreground">
                            {wc.toLocaleString()}w
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Framework selector */}
        <FrameworkSelector
          open={frameworkOpen}
          onOpenChange={setFrameworkOpen}
          currentFrameworkId={activeNovel.frameworkId}
          onSelect={handleFrameworkSelect}
        />

        {/* Import from text dialog */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Beats from Text</DialogTitle>
              <DialogDescription>
                Paste a bullet-point list of beat names. Each line becomes a new beat.
              </DialogDescription>
            </DialogHeader>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"- Opening image\n- Theme stated\n- Set-up\n- Catalyst"}
              rows={8}
              className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={importFromText}>
                <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Import {importText.split("\n").filter((l) => l.trim()).length} beats
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
