import { LayoutGrid } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useNovelContext } from "@/contexts/NovelContext";
import type { Novel } from "@/types/novel";

function countScenes(novel: Novel): number {
  let n = 0;
  for (const act of novel.acts) {
    for (const ch of act.chapters) {
      n += ch.scenes.length;
    }
  }
  return n;
}

/** Non-generative heuristic: density of outline vs target length (Canvas.md: structural health stub). */
function computeHeuristicSnapshot(novel: Novel, target: number) {
  const words = novel.wordCount ?? 0;
  const scenes = countScenes(novel);
  const progress = target > 0 ? Math.min(100, Math.round((words / target) * 100)) : 0;
  const sceneDensity = scenes > 0 ? Math.min(100, Math.round((words / Math.max(scenes, 1) / 2000) * 100)) : 0;
  const pacingScore = Math.round(progress * 0.5 + sceneDensity * 0.5);
  const threadBalance = novel.canvas?.timeline?.rows?.length
    ? Math.min(100, 60 + novel.canvas.timeline.rows.length * 5)
    : 55;
  return { pacingScore, threadBalance, updatedAt: new Date().toISOString() };
}

export function ObservatoryPanel() {
  const { activeNovel, updateCanvas } = useNovelContext();

  const snap = activeNovel?.canvas?.observatory?.lastHealthSnapshot;

  const stats = useMemo(() => {
    if (!activeNovel) return null;
    const target = activeNovel.targetWordCount ?? 50000;
    return {
      scenes: countScenes(activeNovel),
      words: activeNovel.wordCount,
      target,
      threads: activeNovel.canvas?.timeline?.rows?.length ?? 1,
      atlasNodes: activeNovel.canvas?.atlas?.nodes?.length ?? 0,
    };
  }, [activeNovel]);

  const runSnapshot = () => {
    if (!activeNovel) return;
    const target = activeNovel.targetWordCount ?? 50000;
    const h = computeHeuristicSnapshot(activeNovel, target);
    updateCanvas((prev) => ({
      ...prev,
      observatory: {
        ...prev?.observatory,
        pinnedPanels: prev?.observatory?.pinnedPanels ?? ["binder", "blueprint"],
        lastHealthSnapshot: h,
      },
    }));
  };

  if (!activeNovel) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Observatory gives one place to see how Binder, Blueprint, Corkboard, Timeline, and Atlas relate to the same
          manuscript model. Updates here are non-generative heuristics only (no prose generation).
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-foreground">
          <li>All Canvas tools read and write the same novel JSON.</li>
          <li>Use Binder for canonical order; Timeline and Corkboard are planning overlays.</li>
        </ul>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Scenes", v: String(stats.scenes) },
            { k: "Words", v: stats.words.toLocaleString() },
            { k: "Target", v: stats.target.toLocaleString() },
            { k: "Threads", v: String(stats.threads) },
          ].map((row) => (
            <div key={row.k} className="rounded-md border border-border bg-card/60 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{row.k}</p>
              <p className="font-mono text-lg font-bold text-foreground">{row.v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={runSnapshot} className="gap-2">
          <LayoutGrid className="h-4 w-4" />
          Refresh structural snapshot
        </Button>
      </div>

      {snap && (
        <div className="rounded-md border-2 border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last snapshot</p>
          <p className="mt-2 text-sm text-foreground">
            Pacing index: <span className="font-mono font-bold">{snap.pacingScore}</span> / 100 · Thread balance:{" "}
            <span className="font-mono font-bold">{snap.threadBalance}</span> / 100
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(snap.updatedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
