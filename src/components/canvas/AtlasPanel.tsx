import "@xyflow/react/dist/style.css";

import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Gem, MapPin, Scroll, Shield, Sparkles, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useNovelContext } from "@/contexts/NovelContext";
import type { AtlasEdge, AtlasNode, CodexEntry } from "@/types/novel";

function genId() {
  return `at_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const TYPE_COLORS: Record<AtlasNode["type"], { bg: string; border: string; text: string }> = {
  character: { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" },
  location: { bg: "#dcfce7", border: "#22c55e", text: "#14532d" },
  lore: { bg: "#fef9c3", border: "#eab308", text: "#713f12" },
  item: { bg: "#fce7f3", border: "#ec4899", text: "#831843" },
  faction: { bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" },
  theme: { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" },
  custom: { bg: "#f3f4f6", border: "#6b7280", text: "#111827" },
};

const TYPE_LEGEND: { type: AtlasNode["type"]; label: string; Icon: React.ElementType }[] = [
  { type: "character", label: "Character", Icon: Users },
  { type: "location", label: "Location", Icon: MapPin },
  { type: "lore", label: "Lore", Icon: Scroll },
  { type: "item", label: "Item", Icon: Gem },
  { type: "faction", label: "Faction", Icon: Shield },
  { type: "theme", label: "Theme", Icon: Sparkles },
];

function toFlowNodes(nodes: AtlasNode[]): Node[] {
  return nodes.map((n) => {
    const col = TYPE_COLORS[n.type] ?? TYPE_COLORS.custom;
    return {
      id: n.id,
      type: "default",
      position: { x: n.x, y: n.y },
      data: { label: n.label },
      style: {
        border: `2px solid ${col.border}`,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 11,
        background: col.bg,
        color: col.text,
        maxWidth: 180,
        fontWeight: 600,
      },
    };
  });
}

function toFlowEdges(edges: AtlasEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    style: { stroke: "#94a3b8" },
    labelStyle: { fontSize: 10, fill: "#475569" },
    labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.85 },
  }));
}

function atlasFromFlow(
  flowNodes: Node[],
  prevAtlas: AtlasNode[],
  flowEdges: Edge[],
): { nodes: AtlasNode[]; edges: AtlasEdge[] } {
  const byId = new Map(prevAtlas.map((n) => [n.id, n]));
  const nextNodes: AtlasNode[] = flowNodes.map((n) => {
    const p = byId.get(n.id);
    return {
      id: n.id,
      type: p?.type ?? "custom",
      codexEntryId: p?.codexEntryId,
      label: String((n.data as { label?: string }).label ?? p?.label ?? n.id),
      x: n.position.x,
      y: n.position.y,
    };
  });
  const nextEdges: AtlasEdge[] = flowEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
  }));
  return { nodes: nextNodes, edges: nextEdges };
}

function AtlasFlow({
  atlasNodes,
  atlasEdges,
  onGraphCommit,
  onNodeSelect,
}: {
  atlasNodes: AtlasNode[];
  atlasEdges: AtlasEdge[];
  onGraphCommit: (nodes: AtlasNode[], edges: AtlasEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(atlasNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(atlasEdges));
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    setNodes(toFlowNodes(atlasNodes));
  }, [atlasNodes, setNodes]);

  useEffect(() => {
    setEdges(toFlowEdges(atlasEdges));
  }, [atlasEdges, setEdges]);

  const commit = useCallback(() => {
    const { nodes: an, edges: ae } = atlasFromFlow(nodesRef.current, atlasNodes, edgesRef.current);
    onGraphCommit(an, ae);
  }, [atlasNodes, onGraphCommit]);

  const onConnect = useCallback(
    (c: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...c, id: genId() }, eds);
        edgesRef.current = next;
        queueMicrotask(commit);
        return next;
      });
    },
    [commit, setEdges],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setNodes((nds) => {
        const next = nds.map((n) => (n.id === node.id ? { ...n, position: node.position } : n));
        nodesRef.current = next;
        return next;
      });
      queueMicrotask(commit);
    },
    [commit, setNodes],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      setNodes((nds) => {
        const next = nds.filter((n) => !deleted.some((d) => d.id === n.id));
        nodesRef.current = next;
        return next;
      });
      queueMicrotask(commit);
    },
    [commit, setNodes],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      setEdges((eds) => {
        const next = eds.filter((e) => !deleted.some((d) => d.id === e.id));
        edgesRef.current = next;
        queueMicrotask(commit);
        return next;
      });
    },
    [commit, setEdges],
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
      setNodes((nds) => {
        const next = nds.map((n) =>
          n.selected ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n,
        );
        nodesRef.current = next;
        return next;
      });
      queueMicrotask(commit);
    },
    [commit, setNodes],
  );

  return (
    <ReactFlow
      aria-label="Story atlas graph. Tab between nodes, arrow keys to nudge (Shift for larger step), Delete to remove."
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      onKeyDown={onKeyDown}
      onNodeClick={(_, node) => onNodeSelect(node.id)}
      onPaneClick={() => onNodeSelect(null)}
      onSelectionChange={({ nodes: sel }) => {
        if (sel.length === 1 && sel[0]) onNodeSelect(sel[0].id);
        else if (sel.length === 0) onNodeSelect(null);
      }}
      deleteKeyCode="Delete"
      fitView
      onlyRenderVisibleElements
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} />
      <Controls showZoom showFitView showInteractive={false} />
      <MiniMap
        nodeColor={(n) => {
          const col = TYPE_COLORS[(n.data as { type?: AtlasNode["type"] })?.type ?? "custom"];
          return col?.bg ?? "#f3f4f6";
        }}
        maskColor="hsl(var(--background) / 0.7)"
        style={{ border: "2px solid hsl(var(--border))", borderRadius: 6 }}
      />
    </ReactFlow>
  );
}

export function AtlasPanel() {
  const { activeNovel, updateCanvas } = useNovelContext();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodes = activeNovel?.canvas?.atlas?.nodes ?? [];
  const edges = activeNovel?.canvas?.atlas?.edges ?? [];

  const onGraphCommit = useCallback(
    (nextNodes: AtlasNode[], nextEdges: AtlasEdge[]) => {
      updateCanvas((prev) => ({
        ...prev,
        atlas: { nodes: nextNodes, edges: nextEdges },
      }));
    },
    [updateCanvas],
  );

  const addFromCodex = useCallback(
    (e: CodexEntry) => {
      const alreadyPlaced = nodes.some((n) => n.codexEntryId === e.id);
      if (alreadyPlaced) return;
      const id = genId();
      const n: AtlasNode = {
        id,
        type: e.type,
        codexEntryId: e.id,
        label: e.name,
        x: 40 + nodes.length * 30,
        y: 40 + nodes.length * 20,
      };
      onGraphCommit([...nodes, n], edges);
    },
    [nodes, edges, onGraphCommit],
  );

  const seedFromCodex = () => {
    if (!activeNovel) return;
    const existingByCodex = new Set(nodes.map((n) => n.codexEntryId).filter(Boolean));
    const toAdd = activeNovel.codexEntries.filter((e) => !existingByCodex.has(e.id));
    if (toAdd.length === 0) return;
    const newNodes: AtlasNode[] = toAdd.map((e, i) => ({
      id: genId(),
      type: e.type,
      codexEntryId: e.id,
      label: e.name,
      x: (i % 5) * 190 + 40,
      y: Math.floor(i / 5) * 130 + 40,
    }));
    onGraphCommit([...nodes, ...newNodes], edges);
  };

  const clearGraph = () => {
    onGraphCommit([], []);
  };

  if (!activeNovel) return null;

  const unplacedEntries = activeNovel.codexEntries.filter((e) => !nodes.some((n) => n.codexEntryId === e.id));

  return (
    <div className="flex min-h-[480px] flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Drag nodes to arrange, connect with edges by dragging from a handle. Select a node and press{" "}
        <kbd className="rounded border border-border px-1 text-[11px]">Delete</kbd> to remove it. Use{" "}
        <kbd className="rounded border border-border px-1 text-[11px]">Tab</kbd> to move between nodes,{" "}
        <kbd className="rounded border border-border px-1 text-[11px]">↑ ↓ ← →</kbd> to nudge selected nodes, and{" "}
        <kbd className="rounded border border-border px-1 text-[11px]">Enter</kbd> to select / deselect.
      </p>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={seedFromCodex}
          disabled={unplacedEntries.length === 0}
        >
          Place all Codex entries
          {unplacedEntries.length > 0 && (
            <span className="ml-1.5 rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] text-white">
              {unplacedEntries.length}
            </span>
          )}
        </Button>
        {unplacedEntries.slice(0, 6).map((e) => {
          const col = TYPE_COLORS[e.type] ?? TYPE_COLORS.custom;
          return (
            <button
              key={e.id}
              type="button"
              className="rounded-md border px-2 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80"
              style={{ borderColor: col.border, background: col.bg, color: col.text }}
              onClick={() => addFromCodex(e)}
            >
              + {e.name}
            </button>
          );
        })}
        {nodes.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto gap-1 text-destructive"
            onClick={clearGraph}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Clear
          </Button>
        )}
      </div>

      {/* Graph canvas */}
      <div className="h-[min(58vh,520px)] w-full rounded-md border-2 border-border bg-muted/20">
        <ReactFlowProvider>
          <AtlasFlow
            atlasNodes={nodes}
            atlasEdges={edges}
            onGraphCommit={onGraphCommit}
            onNodeSelect={setSelectedNodeId}
          />
        </ReactFlowProvider>
      </div>

      {/* Node detail panel — shown when a node is selected (click or keyboard Enter) */}
      {selectedNodeId &&
        (() => {
          const atlasNode = nodes.find((n) => n.id === selectedNodeId);
          const codexEntry = atlasNode?.codexEntryId
            ? activeNovel.codexEntries.find((e) => e.id === atlasNode.codexEntryId)
            : undefined;
          if (!atlasNode) return null;
          const col = TYPE_COLORS[atlasNode.type] ?? TYPE_COLORS.custom;
          return (
            <div
              role="region"
              aria-label={`Node detail: ${atlasNode.label}`}
              className="rounded-md border-2 border-border bg-card p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-sm border"
                    style={{ background: col.bg, borderColor: col.border }}
                    aria-hidden
                  />
                  <span className="font-semibold text-foreground">{atlasNode.label}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                    style={{ background: col.bg, color: col.text }}
                  >
                    {atlasNode.type}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(null)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Close node detail"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              {codexEntry && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {codexEntry.description && <p>{codexEntry.description}</p>}
                  {codexEntry.notes && <p className="italic">{codexEntry.notes}</p>}
                  {codexEntry.tags && codexEntry.tags.length > 0 && (
                    <p>{codexEntry.tags.map((t) => `#${t}`).join(" ")}</p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

      {/* Legend */}
      {nodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {TYPE_LEGEND.filter((l) => nodes.some((n) => n.type === l.type)).map(({ type, label, Icon }) => {
            const col = TYPE_COLORS[type];
            return (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-sm border"
                  style={{ background: col.bg, borderColor: col.border }}
                />
                <Icon className="h-3 w-3" style={{ color: col.text }} aria-hidden />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
