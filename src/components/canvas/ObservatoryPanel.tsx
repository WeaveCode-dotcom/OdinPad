import { AlertTriangle, CheckCircle, Download, Info, LayoutGrid, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNovelContext } from "@/contexts/NovelContext";
import type { HealthSnapshot, Novel, Scene } from "@/types/novel";

// ── Non-generative metric computation ────────────────────────────────────────

function countAllScenes(novel: Novel): Scene[] {
  return novel.acts.flatMap((a) => a.chapters.flatMap((c) => c.scenes));
}

function computeMetrics(novel: Novel, beats: { id: string; title: string }[]) {
  const scenes = countAllScenes(novel);
  const words = novel.wordCount ?? 0;
  const target = novel.targetWordCount ?? 50000;
  const progress = target > 0 ? Math.min(100, Math.round((words / target) * 100)) : 0;

  // Status breakdown
  const statusBreakdown: Record<Scene["status"], number> = {
    draft: 0,
    "in-progress": 0,
    complete: 0,
    revision: 0,
  };
  scenes.forEach((s) => {
    statusBreakdown[s.status]++;
  });

  // POV distribution
  const povCounts: Record<string, number> = {};
  const povWords: Record<string, number> = {};
  scenes.forEach((s) => {
    if (s.pov) {
      povCounts[s.pov] = (povCounts[s.pov] ?? 0) + 1;
      povWords[s.pov] = (povWords[s.pov] ?? 0) + s.wordCount;
    }
  });

  // Beat coverage
  const filledBeatIds = new Set(scenes.map((s) => s.beatId).filter(Boolean));
  const beatCoverage = beats.length > 0 ? Math.round((filledBeatIds.size / beats.length) * 100) : 100;
  const uncoveredBeats = beats.filter((b) => !filledBeatIds.has(b.id));

  // Scene length stats
  const sceneWcs = scenes.map((s) => s.wordCount).filter((w) => w > 0);
  const avgSceneWc = sceneWcs.length > 0 ? Math.round(sceneWcs.reduce((a, b) => a + b, 0) / sceneWcs.length) : 0;
  const maxSceneWc = sceneWcs.length > 0 ? Math.max(...sceneWcs) : 0;
  const minSceneWc = sceneWcs.length > 0 ? Math.min(...sceneWcs) : 0;

  // Scene length histogram buckets (0-500, 500-1000, 1000-2000, 2000-4000, 4000+)
  const buckets = [0, 500, 1000, 2000, 4000, Infinity];
  const histogram = buckets.slice(0, -1).map((lo, i) => ({
    label: i === buckets.length - 2 ? `${lo}+` : `${lo}–${buckets[i + 1]}`,
    count: sceneWcs.filter((w) => w >= lo && w < buckets[i + 1]).length,
  }));

  // Per-chapter scene count
  const chaptersData = novel.acts.flatMap((act) =>
    act.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      actTitle: act.title,
      sceneCount: ch.scenes.length,
      wordCount: ch.scenes.reduce((s, sc) => s + sc.wordCount, 0),
      hasSummary: Boolean(ch.summary),
      completePct:
        ch.scenes.length > 0
          ? Math.round((ch.scenes.filter((s) => s.status === "complete").length / ch.scenes.length) * 100)
          : 0,
    })),
  );

  const avgScenesPerCh = chaptersData.length > 0 ? (scenes.length / chaptersData.length).toFixed(1) : "0";

  // Act balance
  const actData = novel.acts.map((act, i) => ({
    id: act.id,
    title: act.title,
    wordCount: act.chapters.reduce((s, ch) => s + ch.scenes.reduce((ss, sc) => ss + sc.wordCount, 0), 0),
    sceneCount: act.chapters.reduce((s, ch) => s + ch.scenes.length, 0),
  }));

  // Chapters without summaries
  const chapsNoSummary = chaptersData.filter((c) => !c.hasSummary).length;

  // Orphan scenes (no beat, no POV, no summary)
  const orphanScenes = scenes.filter((s) => !s.beatId && !s.pov && !s.summary);

  // Codex coverage
  const codexCount = novel.codexEntries.length;
  const codexInScenes = novel.codexEntries.filter((e) =>
    scenes.some((s) => s.characters.includes(e.name) || s.location === e.name || (s.codexRefs ?? []).includes(e.id)),
  ).length;
  const codexCoverage = codexCount > 0 ? Math.round((codexInScenes / codexCount) * 100) : 0;

  // Atlas stats
  const atlasNodes = novel.canvas?.atlas?.nodes?.length ?? 0;
  const atlasEdges = novel.canvas?.atlas?.edges?.length ?? 0;
  const atlasDensity = atlasNodes > 1 ? Number((atlasEdges / (atlasNodes * (atlasNodes - 1))).toFixed(3)) : 0;

  // Consecutive same-POV detection
  const consecutivePovMax: Record<string, number> = {};
  let curPov = "";
  let curStreak = 0;
  scenes.forEach((s) => {
    if (s.pov && s.pov === curPov) {
      curStreak++;
      consecutivePovMax[s.pov] = Math.max(consecutivePovMax[s.pov] ?? 0, curStreak);
    } else {
      curPov = s.pov ?? "";
      curStreak = 1;
      if (s.pov) consecutivePovMax[s.pov] = Math.max(consecutivePovMax[s.pov] ?? 0, 1);
    }
  });

  // Scenes without summary
  const scenesNoSummary = scenes.filter((s) => !s.summary).length;

  // Missing POV
  const scenesNoPov = scenes.filter((s) => !s.pov).length;

  // Status inconsistency: complete but zero words
  const completeZeroWords = scenes.filter((s) => s.status === "complete" && s.wordCount === 0);

  // Thread gap detection
  const timelineRows = novel.canvas?.timeline?.rows ?? [];
  const timelineCards = novel.canvas?.timeline?.cards ?? [];
  const chapterCount = chaptersData.length;
  const threadGaps: { rowName: string; gaps: number }[] = [];
  timelineRows.forEach((row) => {
    let gapCount = 0;
    let lastFilled = -1;
    let gapStart = -1;
    for (let ci = 0; ci < chapterCount; ci++) {
      const cell = timelineCards.find((c) => c.rowId === row.id && c.columnIndex === ci);
      if (cell) {
        if (gapStart !== -1 && ci - lastFilled > 3) gapCount++;
        lastFilled = ci;
        gapStart = -1;
      } else if (gapStart === -1 && lastFilled !== -1) {
        gapStart = ci;
      }
    }
    if (gapCount > 0) threadGaps.push({ rowName: row.name, gaps: gapCount });
  });

  // Pacing score
  const sceneDensity =
    scenes.length > 0 ? Math.min(100, Math.round((words / Math.max(scenes.length, 1) / 2000) * 100)) : 0;
  const pacingScore = Math.round(progress * 0.5 + sceneDensity * 0.5);

  // Thread balance
  const threadBalance =
    timelineRows.length > 0
      ? (() => {
          const counts = timelineRows.map((r) => timelineCards.filter((c) => c.rowId === r.id).length);
          const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
          const stdDev = Math.sqrt(counts.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / counts.length);
          return Math.max(0, Math.min(100, Math.round(100 - stdDev * 10)));
        })()
      : 55;

  return {
    scenes,
    words,
    target,
    progress,
    statusBreakdown,
    povCounts,
    povWords,
    beatCoverage,
    uncoveredBeats,
    filledBeatIds,
    avgSceneWc,
    maxSceneWc,
    minSceneWc,
    histogram,
    chaptersData,
    avgScenesPerCh,
    actData,
    chapsNoSummary,
    orphanScenes,
    codexCoverage,
    codexInScenes,
    codexCount,
    atlasNodes,
    atlasEdges,
    atlasDensity,
    consecutivePovMax,
    scenesNoSummary,
    scenesNoPov,
    completeZeroWords,
    threadGaps,
    pacingScore,
    threadBalance,
  };
}

// ── Mini bar chart ────────────────────────────────────────────────────────────

function MiniBarChart({
  data,
  color = "#3b82f6",
}: {
  data: { label: string; value: number; color?: string }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => (
        <Tooltip key={i}>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${Math.max(4, (d.value / max) * 64)}px`,
                  background: d.color ?? color,
                  opacity: d.value === 0 ? 0.2 : 1,
                }}
              />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            {d.label}: {d.value}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  color,
  warning,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  warning?: boolean;
}) {
  return (
    <div className={`rounded-md border bg-card/60 px-3 py-2 ${warning ? "border-amber-500/40" : "border-border"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-mono text-lg font-bold ${color ?? "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Insight row ───────────────────────────────────────────────────────────────

type InsightSeverity = "red" | "amber" | "blue";

interface Insight {
  id: string;
  severity: InsightSeverity;
  message: string;
  panel?: string;
}

function InsightRow({
  insight,
  dismissed,
  onDismiss,
}: {
  insight: Insight;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  if (dismissed) return null;
  const colors = {
    red: "border-red-500/30 bg-red-500/5 text-red-400",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-400",
  };
  return (
    <div className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-xs ${colors[insight.severity]}`}>
      {insight.severity === "red" ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
      ) : insight.severity === "amber" ? (
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
      ) : (
        <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
      )}
      <span className="flex-1">
        {insight.message}
        {insight.panel ? ` (→ ${insight.panel})` : ""}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 opacity-60 hover:opacity-100"
        aria-label="Dismiss insight"
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ObservatoryPanel() {
  const { activeNovel, updateCanvas, getActiveBeats } = useNovelContext();
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  const beats = useMemo(() => getActiveBeats(), [getActiveBeats]);

  const metrics = useMemo(() => (activeNovel ? computeMetrics(activeNovel, beats) : null), [activeNovel, beats]);

  const snap = activeNovel?.canvas?.observatory?.lastHealthSnapshot;
  const snapshots = activeNovel?.canvas?.observatory?.snapshots ?? [];

  const runSnapshot = () => {
    if (!activeNovel || !metrics) return;
    const h: HealthSnapshot = {
      id: `snap_${Date.now()}`,
      pacingScore: metrics.pacingScore,
      threadBalance: metrics.threadBalance,
      createdAt: new Date().toISOString(),
      sceneCount: metrics.scenes.length,
      wordCount: metrics.words,
      beatCoverage: metrics.beatCoverage,
      statusBreakdown: {
        draft: metrics.statusBreakdown.draft,
        "in-progress": metrics.statusBreakdown["in-progress"],
        complete: metrics.statusBreakdown.complete,
        revision: metrics.statusBreakdown.revision,
      },
    };
    updateCanvas((prev) => {
      const existing = prev?.observatory?.snapshots ?? [];
      const trimmed = [...existing.slice(-9), h]; // keep up to 10
      return {
        ...prev,
        observatory: {
          ...prev?.observatory,
          pinnedPanels: prev?.observatory?.pinnedPanels ?? ["binder", "blueprint"],
          lastHealthSnapshot: { pacingScore: h.pacingScore, threadBalance: h.threadBalance, updatedAt: h.createdAt },
          snapshots: trimmed,
        },
      };
    });
  };

  const exportReport = () => {
    if (!activeNovel || !metrics) return;
    const lines = [
      `# OdinPad Observatory Report — ${activeNovel.title}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "## Summary",
      `- Scenes: ${metrics.scenes.length}`,
      `- Words: ${metrics.words.toLocaleString()} / ${metrics.target.toLocaleString()} target (${metrics.progress}%)`,
      `- Beat coverage: ${metrics.beatCoverage}%`,
      `- Pacing score: ${metrics.pacingScore}/100`,
      `- Thread balance: ${metrics.threadBalance}/100`,
      "",
      "## Status Breakdown",
      ...Object.entries(metrics.statusBreakdown).map(([k, v]) => `- ${k}: ${v}`),
      "",
      "## POV Distribution",
      ...Object.entries(metrics.povWords).map(([k, v]) => `- ${k}: ${v.toLocaleString()} words`),
      "",
      "## Issues",
      metrics.completeZeroWords.length > 0
        ? `- ${metrics.completeZeroWords.length} scenes marked "complete" have 0 words`
        : "",
      metrics.orphanScenes.length > 0
        ? `- ${metrics.orphanScenes.length} orphan scenes (no beat, POV, or summary)`
        : "",
      metrics.uncoveredBeats.length > 0 ? `- ${metrics.uncoveredBeats.length} required beats have no scenes` : "",
    ].filter((l) => l !== "");
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `observatory-${activeNovel.title.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeNovel || !metrics) return null;

  // ── Build insight list ─────────────────────────────────────────────────────────

  const insights: Insight[] = [];

  if (metrics.completeZeroWords.length > 0) {
    insights.push({
      id: "complete-zero-words",
      severity: "amber",
      message: `${metrics.completeZeroWords.length} scene${metrics.completeZeroWords.length > 1 ? "s" : ""} marked "complete" have 0 words`,
      panel: "Binder",
    });
  }
  if (metrics.uncoveredBeats.length > 0) {
    insights.push({
      id: "uncovered-beats",
      severity: metrics.uncoveredBeats.length > 3 ? "red" : "amber",
      message: `${metrics.uncoveredBeats.length} beat${metrics.uncoveredBeats.length > 1 ? "s" : ""} have no assigned scenes`,
      panel: "Blueprint",
    });
  }
  if (metrics.orphanScenes.length > 0) {
    insights.push({
      id: "orphan-scenes",
      severity: "amber",
      message: `${metrics.orphanScenes.length} orphan scene${metrics.orphanScenes.length > 1 ? "s" : ""} (no beat, POV, or summary)`,
      panel: "Binder",
    });
  }
  if (metrics.threadGaps.length > 0) {
    metrics.threadGaps.forEach((tg) => {
      insights.push({
        id: `thread-gap-${tg.rowName}`,
        severity: "amber",
        message: `Thread "${tg.rowName}" has ${tg.gaps} gap${tg.gaps > 1 ? "s" : ""} (3+ consecutive empty chapters)`,
        panel: "Timeline",
      });
    });
  }
  if (metrics.chapsNoSummary > 0) {
    insights.push({
      id: "no-chapter-summary",
      severity: "blue",
      message: `${metrics.chapsNoSummary} chapter${metrics.chapsNoSummary > 1 ? "s" : ""} have no summary`,
      panel: "Binder",
    });
  }
  if (metrics.scenesNoSummary > 0) {
    insights.push({
      id: "no-scene-summary",
      severity: "blue",
      message: `${metrics.scenesNoSummary} scene${metrics.scenesNoSummary > 1 ? "s" : ""} have no synopsis`,
      panel: "Binder",
    });
  }
  const maxConsecPov = Object.entries(metrics.consecutivePovMax).filter(([, v]) => v >= 4);
  if (maxConsecPov.length > 0) {
    maxConsecPov.forEach(([pov, n]) => {
      insights.push({
        id: `consec-pov-${pov}`,
        severity: "amber",
        message: `POV "${pov}" has ${n} consecutive scenes — reader may lose other threads`,
        panel: "Binder",
      });
    });
  }
  if (metrics.progress > 0 && metrics.beatCoverage < 50) {
    insights.push({
      id: "low-beat-coverage",
      severity: "red",
      message: `Only ${metrics.beatCoverage}% of beats have scenes — story may not hit all structural beats`,
      panel: "Blueprint",
    });
  }
  if (metrics.words < metrics.target * 0.8 && metrics.statusBreakdown.complete > metrics.scenes.length * 0.9) {
    insights.push({
      id: "word-count-warning",
      severity: "red",
      message: `90%+ of scenes are complete but word count is only ${metrics.progress}% of target`,
    });
  }

  const dismissInsight = (id: string) => setDismissedInsights((prev) => new Set([...prev, id]));

  const activeInsights = insights.filter((i) => !dismissedInsights.has(i.id));
  const redCount = activeInsights.filter((i) => i.severity === "red").length;
  const amberCount = activeInsights.filter((i) => i.severity === "amber").length;

  // ── POV chart data ─────────────────────────────────────────────────────────────

  const POV_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#84cc16"];
  const povEntries = Object.entries(metrics.povWords).sort(([, a], [, b]) => b - a);

  // ── Status donut segments (faked as a horizontal bar) ────────────────────────

  const STATUS_HEX: Record<Scene["status"], string> = {
    draft: "#6b7280",
    "in-progress": "#3b82f6",
    complete: "#22c55e",
    revision: "#f59e0b",
  };
  const totalStatusScenes = metrics.scenes.length;

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">
              Structural health dashboard — all metrics are non-generative heuristics.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={exportReport} className="gap-1.5">
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export report
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={runSnapshot} className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Snapshot
            </Button>
          </div>
        </div>

        {/* Issues feed */}
        {activeInsights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">Issues</h3>
              {redCount > 0 && (
                <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                  {redCount} critical
                </span>
              )}
              {amberCount > 0 && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                  {amberCount} warnings
                </span>
              )}
            </div>
            {activeInsights.map((insight) => (
              <InsightRow
                key={insight.id}
                insight={insight}
                dismissed={dismissedInsights.has(insight.id)}
                onDismiss={() => dismissInsight(insight.id)}
              />
            ))}
          </div>
        )}

        {/* Primary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Scenes" value={metrics.scenes.length} sub={`avg ${metrics.avgScenesPerCh}/ch`} />
          <MetricCard
            label="Words"
            value={metrics.words.toLocaleString()}
            sub={`${metrics.progress}% of target`}
            warning={metrics.progress < 50 && metrics.statusBreakdown.complete > 0}
          />
          <MetricCard label="Target" value={metrics.target.toLocaleString()} />
          <MetricCard
            label="Threads"
            value={activeNovel.canvas?.timeline?.rows?.length ?? 1}
            sub={`${metrics.threadGaps.length} gaps`}
          />
        </div>

        {/* Word count progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Word count progress</span>
            <span className="text-xs font-mono text-foreground">
              {metrics.words.toLocaleString()} / {metrics.target.toLocaleString()}
            </span>
          </div>
          <Progress value={metrics.progress} className="h-2" />
        </div>

        {/* Beat coverage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Beat coverage (Blueprint adherence)</span>
            <span className="text-xs font-mono text-foreground">
              {metrics.filledBeatIds.size}/{beats.length} — {metrics.beatCoverage}%
            </span>
          </div>
          <Progress value={metrics.beatCoverage} className="h-2" />
          {metrics.uncoveredBeats.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {metrics.uncoveredBeats.slice(0, 5).map((b) => (
                <span key={b.id} className="rounded-sm bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                  {b.title}
                </span>
              ))}
              {metrics.uncoveredBeats.length > 5 && (
                <span className="text-[10px] text-muted-foreground">+{metrics.uncoveredBeats.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        {/* Scene status breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Scene Status Breakdown
          </h3>
          {totalStatusScenes > 0 ? (
            <>
              <div className="flex h-4 w-full overflow-hidden rounded-sm">
                {(Object.entries(metrics.statusBreakdown) as [Scene["status"], number][]).map(([s, count]) => {
                  const pct = (count / totalStatusScenes) * 100;
                  return (
                    <Tooltip key={s}>
                      <TooltipTrigger asChild>
                        <div
                          className="h-full"
                          style={{ width: `${pct}%`, background: STATUS_HEX[s], minWidth: pct > 0 ? 2 : 0 }}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        {s}: {count} ({Math.round(pct)}%)
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {(Object.entries(metrics.statusBreakdown) as [Scene["status"], number][]).map(([s, count]) => (
                  <span key={s} className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: STATUS_HEX[s] }}
                      aria-hidden
                    />
                    <span className="text-muted-foreground">{s}: </span>
                    <span className="font-mono text-foreground">{count}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No scenes yet.</p>
          )}
        </div>

        {/* POV distribution */}
        {povEntries.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">POV Distribution</h3>
            <div className="space-y-1.5">
              {povEntries.map(([pov, wc], i) => {
                const pct = metrics.words > 0 ? Math.round((wc / metrics.words) * 100) : 0;
                const color = POV_COLORS[i % POV_COLORS.length];
                const isMajority = pct > 60;
                return (
                  <div key={pov} className="flex items-center gap-2">
                    <span className="w-28 truncate text-[11px] text-muted-foreground">{pov}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="w-20 text-right text-[11px] font-mono text-foreground">
                      {wc.toLocaleString()}w
                    </span>
                    {isMajority && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-label="POV imbalance" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          {pov} accounts for {pct}% of words — potential POV imbalance
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scene length histogram */}
        {metrics.scenes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Scene Word Count Distribution
              <span className="ml-2 font-mono font-normal text-foreground">
                avg {metrics.avgSceneWc}w · max {metrics.maxSceneWc}w
              </span>
            </h3>
            <MiniBarChart data={metrics.histogram.map((h) => ({ label: h.label, value: h.count }))} color="#3b82f6" />
          </div>
        )}

        {/* Act balance */}
        {metrics.actData.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Act Word-Count Balance
            </h3>
            <div className="space-y-1.5">
              {metrics.actData.map((act, i) => {
                const pct = metrics.words > 0 ? Math.round((act.wordCount / metrics.words) * 100) : 0;
                const idealPct = Math.round(100 / metrics.actData.length);
                const isUnbalanced = Math.abs(pct - idealPct) > 15;
                const ACT_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316"];
                return (
                  <div key={act.id} className="flex items-center gap-2">
                    <span className="w-28 truncate text-[11px] text-muted-foreground">{act.title}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: ACT_COLORS[i % ACT_COLORS.length] }}
                      />
                    </div>
                    <span className="w-24 text-right text-[11px] font-mono text-foreground">
                      {act.wordCount.toLocaleString()}w ({pct}%)
                    </span>
                    {isUnbalanced && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-label="Act imbalance" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          Expected ~{idealPct}% — this act is {Math.abs(pct - idealPct)}% off
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chapter scene counts */}
        {metrics.chaptersData.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chapter Completion</h3>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {metrics.chaptersData.map((ch) => (
                <div key={ch.id} className="flex items-center gap-2">
                  <span className="w-32 truncate text-[11px] text-muted-foreground">{ch.title}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${ch.completePct}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground w-16 text-right">
                    {ch.completePct}% · {ch.sceneCount}sc
                  </span>
                  {!ch.hasSummary && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground/60" aria-label="No chapter summary" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">No chapter summary</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atlas stats */}
        {metrics.atlasNodes > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Atlas Nodes" value={metrics.atlasNodes} />
            <MetricCard label="Relationships" value={metrics.atlasEdges} />
            <MetricCard label="Graph Density" value={`ρ ${metrics.atlasDensity}`} sub="edges ÷ (n×(n-1))" />
          </div>
        )}

        {/* Codex coverage */}
        {metrics.codexCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Codex Entry Coverage</span>
              <span className="text-xs font-mono text-foreground">
                {metrics.codexInScenes}/{metrics.codexCount} entries — {metrics.codexCoverage}%
              </span>
            </div>
            <Progress value={metrics.codexCoverage} className="h-1.5" />
          </div>
        )}

        {/* Heuristic scores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-card/60 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pacing Score</p>
            <p className="font-mono text-lg font-bold text-foreground">
              {metrics.pacingScore}
              <span className="text-xs text-muted-foreground">/100</span>
            </p>
            <Progress value={metrics.pacingScore} className="h-1 mt-1" />
          </div>
          <div className="rounded-md border border-border bg-card/60 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Thread Balance</p>
            <p className="font-mono text-lg font-bold text-foreground">
              {metrics.threadBalance}
              <span className="text-xs text-muted-foreground">/100</span>
            </p>
            <Progress value={metrics.threadBalance} className="h-1 mt-1" />
          </div>
        </div>

        {/* Snapshot history */}
        {snapshots.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Snapshot History ({snapshots.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-1 text-left text-[10px] font-semibold text-muted-foreground">Date</th>
                    <th className="px-2 py-1 text-right text-[10px] font-semibold text-muted-foreground">Words</th>
                    <th className="px-2 py-1 text-right text-[10px] font-semibold text-muted-foreground">Scenes</th>
                    <th className="px-2 py-1 text-right text-[10px] font-semibold text-muted-foreground">Beat%</th>
                    <th className="px-2 py-1 text-right text-[10px] font-semibold text-muted-foreground">Pacing</th>
                  </tr>
                </thead>
                <tbody>
                  {[...snapshots].reverse().map((s, i) => {
                    const prev = [...snapshots].reverse()[i + 1];
                    const wdelta = prev?.wordCount !== undefined ? (s.wordCount ?? 0) - prev.wordCount : 0;
                    return (
                      <tr key={s.id} className="border-b border-border/40 last:border-0">
                        <td className="px-2 py-1 text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-1 text-right font-mono">
                          {(s.wordCount ?? 0).toLocaleString()}
                          {wdelta !== 0 && (
                            <span className={`ml-1 text-[10px] ${wdelta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {wdelta > 0 ? "+" : ""}
                              {wdelta}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right font-mono">{s.sceneCount ?? "—"}</td>
                        <td className="px-2 py-1 text-right font-mono">{s.beatCoverage ?? "—"}%</td>
                        <td className="px-2 py-1 text-right font-mono">{s.pacingScore ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Last snapshot timestamp */}
        {snap && (
          <p className="text-[11px] text-muted-foreground">
            Last snapshot: {new Date(snap.updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
