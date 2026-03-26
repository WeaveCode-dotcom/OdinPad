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
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useNovelContext } from "@/contexts/NovelContext";
import type { CorkboardCard } from "@/types/novel";

function genId() {
  return `cc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function cardsToNodes(cards: CorkboardCard[]): Node[] {
  return cards.map((c) => ({
    id: c.id,
    type: "default",
    position: { x: c.x, y: c.y },
    data: {
      label: c.summary ? `${c.title}\n${c.summary}` : c.title,
    },
    style: {
      border: "2px solid hsl(var(--border))",
      borderRadius: 8,
      padding: 10,
      fontSize: 12,
      background: "hsl(var(--card))",
      minWidth: 140,
      maxWidth: 220,
    },
  }));
}

function CorkboardFlow({
  cards,
  onPositionsCommit,
}: {
  cards: CorkboardCard[];
  onPositionsCommit: (updates: { id: string; x: number; y: number }[]) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(cardsToNodes(cards));
  const [, , onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    setNodes(cardsToNodes(cards));
  }, [cards, setNodes]);

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
      aria-label="Scene corkboard. Tab between cards, arrow keys to nudge (Shift for larger step), Delete to remove."
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
      minZoom={0.2}
      maxZoom={1.5}
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

export function CorkboardPanel() {
  const { activeNovel, updateCanvas } = useNovelContext();

  const cards = useMemo(() => activeNovel?.canvas?.corkboard?.cards ?? [], [activeNovel?.canvas?.corkboard?.cards]);

  const onPositionsCommit = useCallback(
    (updates: { id: string; x: number; y: number }[]) => {
      updateCanvas((prev) => {
        const list = [...(prev?.corkboard?.cards ?? [])];
        for (const u of updates) {
          const idx = list.findIndex((c) => c.id === u.id);
          if (idx >= 0) list[idx] = { ...list[idx], x: u.x, y: u.y };
        }
        return { ...prev, corkboard: { cards: list } };
      });
    },
    [updateCanvas],
  );

  const syncFromOutline = useCallback(() => {
    if (!activeNovel) return;
    const next: CorkboardCard[] = [];
    let i = 0;
    for (const act of activeNovel.acts) {
      for (const ch of act.chapters) {
        for (const s of ch.scenes) {
          const col = i % 4;
          const row = Math.floor(i / 4);
          next.push({
            id: genId(),
            sceneId: s.id,
            title: s.title,
            summary: `${act.title} · ${ch.title}`,
            x: col * 220,
            y: row * 130,
          });
          i += 1;
        }
      }
    }
    updateCanvas((prev) => ({ ...prev, corkboard: { cards: next } }));
  }, [activeNovel, updateCanvas]);

  if (!activeNovel) return null;

  return (
    <div className="flex min-h-[420px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Visual index cards for scenes. Drag cards to arrange; use sync to rebuild from your outline.
        </p>
        <Button type="button" size="sm" variant="secondary" onClick={syncFromOutline}>
          Sync from outline
        </Button>
      </div>
      <div className="h-[min(60vh,520px)] w-full rounded-md border-2 border-border bg-muted/20">
        <ReactFlowProvider>
          <CorkboardFlow cards={cards} onPositionsCommit={onPositionsCommit} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
