import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { Lock, RefreshCw, Search, Unlock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNovelContext } from "@/contexts/NovelContext";
import type { CorkboardCard, CorkboardState, Scene } from "@/types/novel";

function genId() {
  return `cc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Color-coding helpers ───────────────────────────────────────────────────────

const STATUS_HEX: Record<Scene["status"], string> = {
  draft: "#6b7280",
  "in-progress": "#3b82f6",
  complete: "#22c55e",
  revision: "#f59e0b",
};

const BEAT_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#84cc16", "#ef4444", "#eab308"];

const POV_PALETTE = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#84cc16", "#ef4444", "#eab308", "#06b6d4"];

// ── Size presets ──────────────────────────────────────────────────────────────

const CARD_SIZES = {
  sm: { width: 120, fontSize: 10, padding: 6 },
  md: { width: 180, fontSize: 12, padding: 10 },
  lg: { width: 260, fontSize: 13, padding: 14 },
} as const;

type CardSize = keyof typeof CARD_SIZES;
type ColorMode = CorkboardState["colorMode"];

// ── Node builder ──────────────────────────────────────────────────────────────

function cardsToNodes(
  cards: CorkboardCard[],
  allScenes: Map<string, Scene>,
  beats: { id: string; title: string; color?: string }[],
  actColorMap: Map<string, string>,
  povColorMap: Map<string, string>,
  colorMode: ColorMode,
  search: string,
  cardSize: CardSize,
): Node[] {
  const beatColorMap = new Map(beats.map((b, i) => [b.id, b.color ?? BEAT_COLORS[i % BEAT_COLORS.length]]));

  return cards.map((c) => {
    const scene = c.sceneId ? allScenes.get(c.sceneId) : undefined;
    const sz = CARD_SIZES[cardSize];
    const matched = search
      ? c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.summary ?? "").toLowerCase().includes(search.toLowerCase())
      : true;

    let borderColor = "hsl(var(--border))";
    let bg = "hsl(var(--card))";

    if (colorMode === "status" && scene) {
      borderColor = STATUS_HEX[scene.status];
      bg = `${STATUS_HEX[scene.status]}18`;
    } else if (colorMode === "beat" && scene?.beatId) {
      const bc = beatColorMap.get(scene.beatId);
      if (bc) {
        borderColor = bc;
        bg = `${bc}18`;
      }
    } else if (colorMode === "pov" && scene?.pov) {
      const pc = povColorMap.get(scene.pov);
      if (pc) {
        borderColor = pc;
        bg = `${pc}18`;
      }
    } else if (colorMode === "act" && c.sceneId) {
      const ac = actColorMap.get(c.sceneId);
      if (ac) {
        borderColor = ac;
        bg = `${ac}18`;
      }
    } else if (colorMode === "custom" && c.color) {
      borderColor = c.color;
      bg = `${c.color}18`;
    }

    // Status dot label for status/pov/beat badges
    const statusDot = scene ? `● ` : "";
    const statusLabel = scene ? scene.status : "";
    const povLabel = scene?.pov ? ` · ${scene.pov.slice(0, 12)}` : "";
    const beatLabel = scene?.beatId ? ` · ${beats.find((b) => b.id === scene.beatId)?.title?.slice(0, 12) ?? ""}` : "";

    const labelLines = [c.title];
    if (c.summary && cardSize !== "sm") {
      labelLines.push(c.summary.slice(0, cardSize === "lg" ? 120 : 60));
    }
    if (cardSize !== "sm" && scene) {
      labelLines.push(`${statusLabel}${povLabel}${beatLabel}`);
    }

    return {
      id: c.id,
      type: "default",
      position: { x: c.x, y: c.y },
      data: { label: labelLines.join("\n") },
      draggable: !c.locked,
      style: {
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        padding: sz.padding,
        fontSize: sz.fontSize,
        background: bg,
        color: "hsl(var(--foreground))",
        minWidth: sz.width,
        maxWidth: sz.width,
        opacity: search && !matched ? 0.25 : 1,
        whiteSpace: "pre-wrap" as const,
        lineHeight: 1.4,
      },
    };
  });
}

// ── Inner ReactFlow component ─────────────────────────────────────────────────

function CorkboardFlow({
  cards,
  allScenes,
  beats,
  actColorMap,
  povColorMap,
  colorMode,
  search,
  cardSize,
  onPositionsCommit,
}: {
  cards: CorkboardCard[];
  allScenes: Map<string, Scene>;
  beats: { id: string; title: string; color?: string }[];
  actColorMap: Map<string, string>;
  povColorMap: Map<string, string>;
  colorMode: ColorMode;
  search: string;
  cardSize: CardSize;
  onPositionsCommit: (updates: { id: string; x: number; y: number }[]) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    cardsToNodes(cards, allScenes, beats, actColorMap, povColorMap, colorMode, search, cardSize),
  );
  const [, , onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    setNodes(cardsToNodes(cards, allScenes, beats, actColorMap, povColorMap, colorMode, search, cardSize));
  }, [cards, allScenes, beats, actColorMap, povColorMap, colorMode, search, cardSize, setNodes]);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2 }), 100);
    return () => clearTimeout(t);
  }, [cards.length, fitView]);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onPositionsCommit([{ id: node.id, x: node.position.x, y: node.position.y }]);
    },
    [onPositionsCommit],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const selected = nodesRef.current.filter((n) => n.selected);
      if (selected.length === 0) return;
      e.preventDefault();
      const step = e.shiftKey ? 50 : 10;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      const updates: { id: string; x: number; y: number }[] = [];
      setNodes((nds) =>
        nds.map((n) => {
          if (!n.selected) return n;
          const next = { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
          updates.push({ id: n.id, x: next.position.x, y: next.position.y });
          return next;
        }),
      );
      if (updates.length > 0) onPositionsCommit(updates);
    },
    [onPositionsCommit, setNodes],
  );

  return (
    <ReactFlow
      aria-label="Scene corkboard. Tab between cards, arrow keys to nudge. Shift for larger steps."
      nodes={nodes}
      edges={[]}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onKeyDown={onKeyDown}
      deleteKeyCode="Delete"
      fitView
      onlyRenderVisibleElements
      proOptions={{ hideAttribution: true }}
      minZoom={0.1}
      maxZoom={2}
    >
      <Background gap={16} />
      <Controls showZoom showFitView showInteractive={false} />
      <MiniMap
        nodeColor="hsl(var(--card))"
        maskColor="hsl(var(--background) / 0.7)"
        style={{ border: "2px solid hsl(var(--border))", borderRadius: 6 }}
      />
    </ReactFlow>
  );
}

// ── Outer panel ───────────────────────────────────────────────────────────────

export function CorkboardPanel() {
  const { activeNovel, updateCanvas, getActiveBeats } = useNovelContext();

  const [search, setSearch] = useState("");
  const [colorMode, setColorMode] = useState<ColorMode>("status");
  const [cardSize, setCardSize] = useState<CardSize>("md");

  const cards = useMemo(() => activeNovel?.canvas?.corkboard?.cards ?? [], [activeNovel]);
  const beats = useMemo(() => getActiveBeats(), [getActiveBeats]);

  // ── Build lookup maps ──────────────────────────────────────────────────────────

  const allScenesMap = useMemo(() => {
    if (!activeNovel) return new Map<string, Scene>();
    const m = new Map<string, Scene>();
    for (const act of activeNovel.acts) {
      for (const ch of act.chapters) {
        for (const s of ch.scenes) {
          m.set(s.id, s);
        }
      }
    }
    return m;
  }, [activeNovel]);

  // Map sceneId → act color
  const actColorMap = useMemo(() => {
    if (!activeNovel) return new Map<string, string>();
    const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#84cc16"];
    const m = new Map<string, string>();
    activeNovel.acts.forEach((act, ai) => {
      const color = act.color ?? COLORS[ai % COLORS.length];
      act.chapters.forEach((ch) => {
        ch.scenes.forEach((s) => m.set(s.id, color));
      });
    });
    return m;
  }, [activeNovel]);

  // Map POV → color
  const povColorMap = useMemo(() => {
    const povs = Array.from(
      new Set(
        Array.from(allScenesMap.values())
          .map((s) => s.pov)
          .filter(Boolean) as string[],
      ),
    );
    const m = new Map<string, string>();
    povs.forEach((pov, i) => m.set(pov, POV_PALETTE[i % POV_PALETTE.length]));
    return m;
  }, [allScenesMap]);

  // ── Commit position changes ────────────────────────────────────────────────────

  const onPositionsCommit = useCallback(
    (updates: { id: string; x: number; y: number }[]) => {
      updateCanvas((prev) => {
        const list = [...(prev?.corkboard?.cards ?? [])];
        for (const u of updates) {
          const idx = list.findIndex((c) => c.id === u.id);
          if (idx >= 0) list[idx] = { ...list[idx], x: u.x, y: u.y };
        }
        return { ...prev, corkboard: { ...(prev?.corkboard ?? { cards: [] }), cards: list } };
      });
    },
    [updateCanvas],
  );

  // ── Sync from outline ─────────────────────────────────────────────────────────

  const syncFromOutline = useCallback(() => {
    if (!activeNovel) return;
    const next: CorkboardCard[] = [];
    let i = 0;
    for (const act of activeNovel.acts) {
      for (const ch of act.chapters) {
        for (const s of ch.scenes) {
          const col = i % 5;
          const row = Math.floor(i / 5);
          next.push({
            id: genId(),
            sceneId: s.id,
            title: s.title,
            summary: `${act.title} · ${ch.title}`,
            x: col * 210,
            y: row * 140,
          });
          i += 1;
        }
      }
    }
    updateCanvas((prev) => ({ ...prev, corkboard: { ...(prev?.corkboard ?? {}), cards: next } }));
  }, [activeNovel, updateCanvas]);

  if (!activeNovel) return null;

  // ── Matched card count for search display ─────────────────────────────────────

  const matchedCount = search
    ? cards.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          (c.summary ?? "").toLowerCase().includes(search.toLowerCase()),
      ).length
    : cards.length;

  // ── Color mode legend ─────────────────────────────────────────────────────────

  const LegendItems = () => {
    if (colorMode === "status") {
      return (
        <>
          {(Object.entries(STATUS_HEX) as [Scene["status"], string][]).map(([s, hex]) => (
            <span key={s} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: hex }} aria-hidden />
              <span className="text-[11px] text-muted-foreground">{s}</span>
            </span>
          ))}
        </>
      );
    }
    if (colorMode === "pov") {
      return (
        <>
          {Array.from(povColorMap.entries())
            .slice(0, 6)
            .map(([pov, hex]) => (
              <span key={pov} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: hex }} aria-hidden />
                <span className="text-[11px] text-muted-foreground">{pov.slice(0, 14)}</span>
              </span>
            ))}
        </>
      );
    }
    if (colorMode === "beat") {
      return (
        <>
          {beats.slice(0, 6).map((b, i) => {
            const hex = b.color ?? BEAT_COLORS[i % BEAT_COLORS.length];
            return (
              <span key={b.id} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: hex }} aria-hidden />
                <span className="text-[11px] text-muted-foreground">{b.title.slice(0, 16)}</span>
              </span>
            );
          })}
        </>
      );
    }
    if (colorMode === "act") {
      const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#84cc16"];
      return (
        <>
          {activeNovel.acts.map((act, ai) => {
            const hex = act.color ?? COLORS[ai % COLORS.length];
            return (
              <span key={act.id} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: hex }} aria-hidden />
                <span className="text-[11px] text-muted-foreground">{act.title}</span>
              </span>
            );
          })}
        </>
      );
    }
    return null;
  };

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex min-h-[440px] flex-col gap-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[160px]">
            <Search
              className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search cards…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-sm border border-border bg-background pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                {matchedCount}/{cards.length}
              </span>
            )}
          </div>

          {/* Color mode */}
          <select
            className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
            value={colorMode ?? "status"}
            onChange={(e) => {
              const v = e.target.value as ColorMode;
              setColorMode(v);
              updateCanvas((prev) => ({
                ...prev,
                corkboard: { ...(prev?.corkboard ?? { cards: [] }), colorMode: v },
              }));
            }}
            aria-label="Card color mode"
          >
            <option value="status">Color by Status</option>
            <option value="beat">Color by Beat</option>
            <option value="pov">Color by POV</option>
            <option value="act">Color by Act</option>
          </select>

          {/* Card size */}
          <div className="flex items-center gap-0.5 rounded-sm border border-border bg-background p-0.5">
            {(["sm", "md", "lg"] as CardSize[]).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setCardSize(sz)}
                className={`rounded px-2 py-1 text-xs transition-colors ${cardSize === sz ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {sz.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={syncFromOutline} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Sync from outline
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="h-[min(62vh,560px)] w-full rounded-md border-2 border-border bg-muted/20">
          <ReactFlowProvider>
            <CorkboardFlow
              cards={cards}
              allScenes={allScenesMap}
              beats={beats}
              actColorMap={actColorMap}
              povColorMap={povColorMap}
              colorMode={colorMode ?? "status"}
              search={search}
              cardSize={cardSize}
              onPositionsCommit={onPositionsCommit}
            />
          </ReactFlowProvider>
        </div>

        {/* Legend */}
        {cards.length > 0 && colorMode !== "custom" && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {colorMode === "status" ? "Status" : colorMode === "beat" ? "Beat" : colorMode === "pov" ? "POV" : "Act"}:
            </span>
            <LegendItems />
          </div>
        )}

        {cards.length === 0 && (
          <div className="rounded-sm border-2 border-dashed border-border/50 bg-muted/10 py-8 text-center">
            <p className="text-sm text-muted-foreground">No cards yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Sync from outline" to generate cards from your scenes.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
