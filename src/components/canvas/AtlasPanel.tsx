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
import {
  Download,
  Eye,
  EyeOff,
  Gem,
  MapPin,
  Plus,
  Scroll,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNovelContext } from "@/contexts/NovelContext";
import type { AtlasEdge, AtlasEdgeType, AtlasNode, CodexEntry } from "@/types/novel";

function genId() {
  return `at_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Color maps ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<AtlasNode["type"], { bg: string; border: string; text: string }> = {
  character: { bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" },
  location: { bg: "#dcfce7", border: "#22c55e", text: "#14532d" },
  lore: { bg: "#fef9c3", border: "#eab308", text: "#713f12" },
  item: { bg: "#fce7f3", border: "#ec4899", text: "#831843" },
  faction: { bg: "#ede9fe", border: "#8b5cf6", text: "#3b0764" },
  theme: { bg: "#ffedd5", border: "#f97316", text: "#7c2d12" },
  custom: { bg: "#f3f4f6", border: "#6b7280", text: "#111827" },
};

const EDGE_TYPE_COLORS: Record<AtlasEdgeType, string> = {
  allied: "#22c55e",
  opposed: "#ef4444",
  romantic: "#ec4899",
  mentor: "#8b5cf6",
  family: "#3b82f6",
  professional: "#6b7280",
  rivals: "#f97316",
  custom: "#94a3b8",
};

const TYPE_LEGEND: { type: AtlasNode["type"]; label: string; Icon: React.ElementType }[] = [
  { type: "character", label: "Character", Icon: Users },
  { type: "location", label: "Location", Icon: MapPin },
  { type: "lore", label: "Lore", Icon: Scroll },
  { type: "item", label: "Item", Icon: Gem },
  { type: "faction", label: "Faction", Icon: Shield },
  { type: "theme", label: "Theme", Icon: Sparkles },
];

const EDGE_TYPES: { type: AtlasEdgeType; label: string }[] = [
  { type: "allied", label: "Allied" },
  { type: "opposed", label: "Opposed" },
  { type: "romantic", label: "Romantic" },
  { type: "mentor", label: "Mentor" },
  { type: "family", label: "Family" },
  { type: "professional", label: "Professional" },
  { type: "rivals", label: "Rivals" },
  { type: "custom", label: "Custom" },
];

// ── Conversion helpers ────────────────────────────────────────────────────────

function toFlowNodes(nodes: AtlasNode[], hiddenIds: Set<string>, degreeMap: Map<string, number>): Node[] {
  return nodes
    .filter((n) => !hiddenIds.has(n.id))
    .map((n) => {
      const col = TYPE_COLORS[n.type] ?? TYPE_COLORS.custom;
      const degree = degreeMap.get(n.id) ?? 0;
      const size = Math.max(60, Math.min(160, 80 + degree * 12));
      return {
        id: n.id,
        type: "default",
        position: { x: n.x, y: n.y },
        data: { label: n.label, atlasType: n.type },
        style: {
          border: `2px solid ${col.border}`,
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 11,
          background: col.bg,
          color: col.text,
          minWidth: size,
          maxWidth: 200,
          fontWeight: 600,
        },
      };
    });
}

function toFlowEdges(edges: AtlasEdge[], hiddenIds: Set<string>): Edge[] {
  return edges
    .filter((e) => !hiddenIds.has(e.source) && !hiddenIds.has(e.target))
    .map((e) => {
      const edgeColor = e.type ? EDGE_TYPE_COLORS[e.type] : "#94a3b8";
      const strokeWidth = e.weight ? 1 + e.weight : 1.5;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        markerEnd: e.bidirectional ? undefined : { type: "arrowclosed" as const },
        markerStart: e.bidirectional ? { type: "arrowclosed" as const } : undefined,
        style: { stroke: edgeColor, strokeWidth },
        labelStyle: { fontSize: 10, fill: "#475569" },
        labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.85 },
      };
    });
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
      ideaWebEntryId: p?.ideaWebEntryId,
      label: String((n.data as { label?: string }).label ?? p?.label ?? n.id),
      x: n.position.x,
      y: n.position.y,
      notes: p?.notes,
      pinned: p?.pinned,
    };
  });
  const nextEdges: AtlasEdge[] = flowEdges.map((e) => {
    const prevEdge = prevAtlas.find ? undefined : undefined; // edges not in prevAtlas, need from separate param
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === "string" ? e.label : undefined,
    };
  });
  return { nodes: nextNodes, edges: nextEdges };
}

function atlasEdgesFromFlow(flowEdges: Edge[], prevEdges: AtlasEdge[]): AtlasEdge[] {
  const byId = new Map(prevEdges.map((e) => [e.id, e]));
  return flowEdges.map((e) => {
    const prev = byId.get(e.id);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === "string" ? e.label : prev?.label,
      type: prev?.type,
      bidirectional: prev?.bidirectional,
      weight: prev?.weight,
    };
  });
}

// ── Inner ReactFlow ───────────────────────────────────────────────────────────

function AtlasFlow({
  atlasNodes,
  atlasEdges,
  hiddenIds,
  degreeMap,
  onGraphCommit,
  onNodeSelect,
}: {
  atlasNodes: AtlasNode[];
  atlasEdges: AtlasEdge[];
  hiddenIds: Set<string>;
  degreeMap: Map<string, number>;
  onGraphCommit: (nodes: AtlasNode[], edges: AtlasEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(atlasNodes, hiddenIds, degreeMap));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(atlasEdges, hiddenIds));
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    setNodes(toFlowNodes(atlasNodes, hiddenIds, degreeMap));
  }, [atlasNodes, hiddenIds, degreeMap, setNodes]);

  useEffect(() => {
    setEdges(toFlowEdges(atlasEdges, hiddenIds));
  }, [atlasEdges, hiddenIds, setEdges]);

  const commit = useCallback(() => {
    const { nodes: an } = atlasFromFlow(nodesRef.current, atlasNodes, edgesRef.current);
    const ae = atlasEdgesFromFlow(edgesRef.current, atlasEdges);
    onGraphCommit(an, ae);
  }, [atlasNodes, atlasEdges, onGraphCommit]);

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
      aria-label="Story atlas graph. Tab between nodes, arrow keys to nudge, Delete to remove."
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
          const col = TYPE_COLORS[(n.data as { atlasType?: AtlasNode["type"] })?.atlasType ?? "custom"];
          return col?.bg ?? "#f3f4f6";
        }}
        maskColor="hsl(var(--background) / 0.7)"
        style={{ border: "2px solid hsl(var(--border))", borderRadius: 6 }}
      />
    </ReactFlow>
  );
}

// ── Node detail / edit panel ──────────────────────────────────────────────────

function NodeDetailPanel({
  atlasNode,
  codexEntry,
  edges,
  onClose,
  onUpdateNode,
  onUpdateEdge,
}: {
  atlasNode: AtlasNode;
  codexEntry?: CodexEntry;
  edges: AtlasEdge[];
  onClose: () => void;
  onUpdateNode: (patch: Partial<AtlasNode>) => void;
  onUpdateEdge: (edgeId: string, patch: Partial<AtlasEdge>) => void;
}) {
  const col = TYPE_COLORS[atlasNode.type] ?? TYPE_COLORS.custom;
  const [notes, setNotes] = useState(atlasNode.notes ?? "");
  const [editLabel, setEditLabel] = useState(atlasNode.label);

  const relatedEdges = edges.filter((e) => e.source === atlasNode.id || e.target === atlasNode.id);

  return (
    <div
      role="region"
      aria-label={`Node detail: ${atlasNode.label}`}
      className="rounded-md border-2 border-border bg-card p-3 text-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-sm border"
            style={{ background: col.bg, borderColor: col.border }}
            aria-hidden
          />
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={() => onUpdateNode({ label: editLabel })}
            className="font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 min-w-0"
          />
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
            style={{ background: col.bg, color: col.text }}
          >
            {atlasNode.type}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Close node detail"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {codexEntry && (
        <div className="mb-3 space-y-1 text-xs text-muted-foreground">
          {codexEntry.description && <p>{codexEntry.description}</p>}
          {codexEntry.notes && <p className="italic">{codexEntry.notes}</p>}
          {codexEntry.tags && codexEntry.tags.length > 0 && <p>{codexEntry.tags.map((t) => `#${t}`).join(" ")}</p>}
        </div>
      )}

      {/* Node notes */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Atlas Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onUpdateNode({ notes: notes || undefined })}
          placeholder="Add notes about this node's role in the story…"
          rows={3}
          className="w-full resize-none rounded-sm border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Related edges */}
      {relatedEdges.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Relationships ({relatedEdges.length})
          </p>
          <div className="space-y-1">
            {relatedEdges.map((edge) => (
              <div key={edge.id} className="flex items-center gap-2 text-xs">
                <select
                  className="rounded-sm border border-border bg-background px-1 py-0.5 text-[11px]"
                  value={edge.type ?? "custom"}
                  onChange={(e) => onUpdateEdge(edge.id, { type: e.target.value as AtlasEdgeType })}
                  aria-label="Edge type"
                >
                  {EDGE_TYPES.map((et) => (
                    <option key={et.type} value={et.type}>
                      {et.label}
                    </option>
                  ))}
                </select>
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ background: edge.type ? EDGE_TYPE_COLORS[edge.type] : "#94a3b8" }}
                  aria-hidden
                />
                <span className="text-muted-foreground truncate flex-1">{edge.label || "(unlabeled)"}</span>
                <select
                  className="rounded-sm border border-border bg-background px-1 py-0.5 text-[11px]"
                  value={String(edge.weight ?? 1)}
                  onChange={(e) => onUpdateEdge(edge.id, { weight: Number(e.target.value) })}
                  aria-label="Edge weight"
                >
                  {[1, 2, 3, 4, 5].map((w) => (
                    <option key={w} value={w}>
                      w{w}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={edge.bidirectional ?? false}
                    onChange={(e) => onUpdateEdge(edge.id, { bidirectional: e.target.checked })}
                    className="h-3 w-3"
                  />
                  ⟷
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function AtlasPanel() {
  const { activeNovel, updateCanvas } = useNovelContext();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AtlasNode["type"] | "">("");
  const [orphanHighlight, setOrphanHighlight] = useState(false);

  const nodes = activeNovel?.canvas?.atlas?.nodes ?? [];
  const edges = activeNovel?.canvas?.atlas?.edges ?? [];

  // ── Degree centrality map ──────────────────────────────────────────────────────

  const degreeMap = useMemo(() => {
    const m = new Map<string, number>();
    nodes.forEach((n) => m.set(n.id, 0));
    edges.forEach((e) => {
      m.set(e.source, (m.get(e.source) ?? 0) + 1);
      m.set(e.target, (m.get(e.target) ?? 0) + 1);
    });
    return m;
  }, [nodes, edges]);

  // ── Orphaned nodes ─────────────────────────────────────────────────────────────

  const orphanedNodeIds = useMemo(() => {
    const connected = new Set<string>();
    edges.forEach((e) => {
      connected.add(e.source);
      connected.add(e.target);
    });
    return new Set(nodes.filter((n) => !connected.has(n.id)).map((n) => n.id));
  }, [nodes, edges]);

  // ── Stale codex references ────────────────────────────────────────────────────

  const codexIds = useMemo(() => new Set(activeNovel?.codexEntries.map((e) => e.id) ?? []), [activeNovel]);

  const staleNodes = useMemo(
    () => nodes.filter((n) => n.codexEntryId && !codexIds.has(n.codexEntryId)),
    [nodes, codexIds],
  );

  // ── Visible nodes (with filter + search) ──────────────────────────────────────

  const effectiveHiddenIds = useMemo(() => {
    const h = new Set(hiddenIds);
    if (typeFilter) nodes.filter((n) => n.type !== typeFilter).forEach((n) => h.add(n.id));
    if (search) {
      nodes.filter((n) => !n.label.toLowerCase().includes(search.toLowerCase())).forEach((n) => h.add(n.id));
    }
    if (orphanHighlight) {
      nodes.filter((n) => !orphanedNodeIds.has(n.id)).forEach((n) => h.add(n.id));
    }
    return h;
  }, [hiddenIds, nodes, typeFilter, search, orphanHighlight, orphanedNodeIds]);

  // ── Graph commit ───────────────────────────────────────────────────────────────

  const onGraphCommit = useCallback(
    (nextNodes: AtlasNode[], nextEdges: AtlasEdge[]) => {
      updateCanvas((prev) => ({
        ...prev,
        atlas: { nodes: nextNodes, edges: nextEdges },
      }));
    },
    [updateCanvas],
  );

  const updateNode = useCallback(
    (nodeId: string, patch: Partial<AtlasNode>) => {
      updateCanvas((prev) => ({
        ...prev,
        atlas: {
          nodes: (prev?.atlas?.nodes ?? []).map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
          edges: prev?.atlas?.edges ?? [],
        },
      }));
    },
    [updateCanvas],
  );

  const updateEdge = useCallback(
    (edgeId: string, patch: Partial<AtlasEdge>) => {
      updateCanvas((prev) => ({
        ...prev,
        atlas: {
          nodes: prev?.atlas?.nodes ?? [],
          edges: (prev?.atlas?.edges ?? []).map((e) => (e.id === edgeId ? { ...e, ...patch } : e)),
        },
      }));
    },
    [updateCanvas],
  );

  // ── Add from codex ────────────────────────────────────────────────────────────

  const addFromCodex = useCallback(
    (e: CodexEntry) => {
      if (nodes.some((n) => n.codexEntryId === e.id)) return;
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

  const addCustomNode = (type: AtlasNode["type"] = "custom") => {
    const id = genId();
    const n: AtlasNode = {
      id,
      type,
      label: "New Node",
      x: 100 + nodes.length * 20,
      y: 100 + nodes.length * 15,
    };
    onGraphCommit([...nodes, n], edges);
    setSelectedNodeId(id);
  };

  const clearGraph = () => {
    onGraphCommit([], []);
    setSelectedNodeId(null);
  };

  // ── Export as PNG ──────────────────────────────────────────────────────────────

  const exportPNG = () => {
    const svg = document.querySelector(".react-flow__renderer svg") as SVGElement | null;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const bbox = svg.getBoundingClientRect();
    canvas.width = bbox.width * 2;
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.scale(2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, bbox.width, bbox.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "atlas.png";
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  // ── Toggle visibility ─────────────────────────────────────────────────────────

  const toggleHidden = (nodeId: string) => {
    setHiddenIds((prev) => {
      const n = new Set(prev);
      n.has(nodeId) ? n.delete(nodeId) : n.add(nodeId);
      return n;
    });
  };

  if (!activeNovel) return null;

  const unplacedEntries = activeNovel.codexEntries.filter((e) => !nodes.some((n) => n.codexEntryId === e.id));

  const selectedAtlasNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedCodexEntry = selectedAtlasNode?.codexEntryId
    ? activeNovel.codexEntries.find((e) => e.id === selectedAtlasNode.codexEntryId)
    : undefined;

  // Graph density
  const density = nodes.length > 1 ? (edges.length / (nodes.length * (nodes.length - 1))).toFixed(3) : "0.000";

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex min-h-[500px] flex-col gap-3">
        {/* Instructions */}
        <p className="text-sm text-muted-foreground">
          Drag nodes to arrange, connect with edges by dragging from a handle. Select a node and press{" "}
          <kbd className="rounded border border-border px-1 text-[11px]">Delete</kbd> to remove.
        </p>

        {/* Stale codex warning */}
        {staleNodes.length > 0 && (
          <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
            {staleNodes.length} node{staleNodes.length > 1 ? "s" : ""} reference deleted Codex entries. Consider
            removing them.
          </div>
        )}

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
              placeholder="Search nodes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-sm border border-border bg-background pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Type filter */}
          <select
            className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AtlasNode["type"] | "")}
            aria-label="Filter by node type"
          >
            <option value="">All types</option>
            {TYPE_LEGEND.map((l) => (
              <option key={l.type} value={l.type}>
                {l.label}
              </option>
            ))}
          </select>

          {/* Orphan highlight */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setOrphanHighlight((v) => !v)}
                className={`rounded-sm px-2 py-1.5 text-xs transition-colors ${
                  orphanHighlight
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                }`}
              >
                Isolated ({orphanedNodeIds.size})
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Show only nodes with no edges</TooltipContent>
          </Tooltip>

          {/* Seed from Codex */}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={seedFromCodex}
            disabled={unplacedEntries.length === 0}
          >
            Place Codex entries
            {unplacedEntries.length > 0 && (
              <span className="ml-1.5 rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] text-white">
                {unplacedEntries.length}
              </span>
            )}
          </Button>

          {/* Add custom node */}
          <Button type="button" size="sm" variant="outline" onClick={() => addCustomNode("custom")} className="gap-1">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add Node
          </Button>

          {/* Quick-place unplaced entries */}
          {unplacedEntries.slice(0, 4).map((e) => {
            const col = TYPE_COLORS[e.type] ?? TYPE_COLORS.custom;
            return (
              <button
                key={e.id}
                type="button"
                className="rounded-md border px-2 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80"
                style={{ borderColor: col.border, background: col.bg, color: col.text }}
                onClick={() => addFromCodex(e)}
                aria-label={`Place ${e.name} in Atlas`}
              >
                + {e.name}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-1">
            {/* Graph density badge */}
            {nodes.length > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {nodes.length}n · {edges.length}e · ρ{density}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Nodes · Edges · Graph density</TooltipContent>
              </Tooltip>
            )}

            {/* Export PNG */}
            {nodes.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={exportPNG}
                    className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                    aria-label="Export graph as PNG"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Export as PNG</TooltipContent>
              </Tooltip>
            )}

            {nodes.length > 0 && (
              <Button type="button" size="sm" variant="ghost" className="gap-1 text-destructive" onClick={clearGraph}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Graph canvas */}
        <div className="h-[min(58vh,540px)] w-full rounded-md border-2 border-border bg-muted/20">
          <ReactFlowProvider>
            <AtlasFlow
              atlasNodes={nodes}
              atlasEdges={edges}
              hiddenIds={effectiveHiddenIds}
              degreeMap={degreeMap}
              onGraphCommit={onGraphCommit}
              onNodeSelect={setSelectedNodeId}
            />
          </ReactFlowProvider>
        </div>

        {/* Node detail panel */}
        {selectedNodeId && selectedAtlasNode && (
          <NodeDetailPanel
            atlasNode={selectedAtlasNode}
            codexEntry={selectedCodexEntry}
            edges={edges}
            onClose={() => setSelectedNodeId(null)}
            onUpdateNode={(patch) => updateNode(selectedNodeId, patch)}
            onUpdateEdge={updateEdge}
          />
        )}

        {/* Legend */}
        {nodes.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {TYPE_LEGEND.filter((l) => nodes.some((n) => n.type === l.type)).map(({ type, label, Icon }) => {
              const col = TYPE_COLORS[type];
              const count = nodes.filter((n) => n.type === type).length;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
                  className={`flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 transition-colors ${
                    typeFilter === type ? "bg-accent/20" : "hover:bg-accent/10"
                  }`}
                  aria-pressed={typeFilter === type}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-sm border"
                    style={{ background: col.bg, borderColor: col.border }}
                    aria-hidden
                  />
                  <Icon className="h-3 w-3" style={{ color: col.text }} aria-hidden />
                  <span className="text-[11px] text-muted-foreground">
                    {label} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Edge type legend */}
        {edges.some((e) => e.type) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Edges:</span>
            {EDGE_TYPES.filter((et) => edges.some((e) => e.type === et.type)).map(({ type, label }) => (
              <span key={type} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-0.5 rounded"
                  style={{ background: EDGE_TYPE_COLORS[type] }}
                  aria-hidden
                />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </span>
            ))}
          </div>
        )}

        {nodes.length === 0 && (
          <div className="rounded-sm border-2 border-dashed border-border/50 bg-muted/10 py-8 text-center">
            <p className="text-sm text-muted-foreground">No nodes yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Place Codex entries" or "Add Node" to start building your relationship graph.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
