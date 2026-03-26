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
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { invokeIdeaWebGroq } from "@/lib/idea-web/groq-editorial";
import { computeMapEditorialHints } from "@/lib/sandbox/editorial-map";
import {
  createMapEdge,
  createSandboxMap,
  deleteSandboxMap,
  fetchMapEdges,
  fetchMapNodes,
  fetchSandboxMaps,
  updateSandboxMap,
  upsertMapNode,
} from "@/lib/sandbox/service";
import { useSandboxMapRealtime } from "@/lib/sandbox/useSandboxRealtime";
import { findRootNodeId, layoutRadialOrbit, layoutTreeFromRoot, mergePositions } from "@/lib/sandbox/visual-modes";
import type { SandboxMap, SandboxMapEdge, SandboxMapNode } from "@/types/sandbox";

function scopeFilter(scope: "all" | "unassigned" | string): "all" | string | null {
  if (scope === "all") return "all";
  if (scope === "unassigned") return null;
  return scope;
}

function toFlowNodes(nodes: SandboxMapNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: "default",
    position: { x: n.x, y: n.y },
    data: { label: n.content || "…" },
    style: {
      border: "1px solid hsl(var(--border))",
      borderRadius: 8,
      padding: 8,
      fontSize: 12,
      background: "hsl(var(--card))",
      maxWidth: 220,
    },
  }));
}

function toFlowEdges(edges: SandboxMapEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    label: e.label ?? undefined,
    style: { stroke: "hsl(var(--muted-foreground) / 0.5)", strokeWidth: 1.5 },
  }));
}

function exportSvg(nodes: Node[], edges: Edge[], name: string): void {
  const pad = 40;
  let minX = 0;
  let minY = 0;
  let maxX = 400;
  let maxY = 300;
  for (const n of nodes) {
    const x = n.position.x;
    const y = n.position.y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + 200);
    maxY = Math.max(maxY, y + 80);
  }
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  const lines = edges
    .map((e) => {
      const s = nodes.find((n) => n.id === e.source);
      const t = nodes.find((n) => n.id === e.target);
      if (!s || !t) return "";
      const x1 = s.position.x - minX + pad + 80;
      const y1 = s.position.y - minY + pad + 24;
      const x2 = t.position.x - minX + pad + 80;
      const y2 = t.position.y - minY + pad + 24;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-width="1.5"/>`;
    })
    .join("\n");
  const rects = nodes
    .map((n) => {
      const x = n.position.x - minX + pad;
      const y = n.position.y - minY + pad;
      const label = String((n.data as { label?: string }).label ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;");
      return `<rect x="${x}" y="${y}" width="160" height="48" rx="6" fill="#faf8f5" stroke="#ccc"/><text x="${x + 8}" y="${y + 28}" font-size="11" font-family="system-ui">${label.slice(0, 80)}</text>`;
    })
    .join("\n");
  const svg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${lines}${rects}</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name.replace(/\s+/g, "-").slice(0, 40)}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
  trackEvent("sandbox_map_export_svg", {});
}

export function VisualSandboxPanel({ novelScope }: { novelScope: "all" | "unassigned" | string }) {
  const { user } = useAuth();
  const { ideaWebEntries } = useNovelContext();
  const [maps, setMaps] = useState<SandboxMap[]>([]);
  const [mapId, setMapId] = useState<string | null>(null);
  const [dbNodes, setDbNodes] = useState<SandboxMapNode[]>([]);
  const [dbEdges, setDbEdges] = useState<SandboxMapEdge[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const editorialHints = useMemo(
    () => computeMapEditorialHints(dbNodes, dbEdges).map((h) => h.message),
    [dbNodes, dbEdges],
  );

  const filter = scopeFilter(novelScope);

  const loadMaps = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await fetchSandboxMaps(user.id, filter);
      setMaps(rows);
    } catch {
      toast({ title: "Maps unavailable", variant: "destructive" });
    }
  }, [user?.id, filter]);

  useEffect(() => {
    void loadMaps();
  }, [loadMaps]);

  const hydrateMap = useCallback(async () => {
    if (!user?.id || !mapId) {
      setDbNodes([]);
      setDbEdges([]);
      setNodes([]);
      setEdges([]);
      return;
    }
    try {
      const [n, e] = await Promise.all([fetchMapNodes(user.id, mapId), fetchMapEdges(user.id, mapId)]);
      setDbNodes(n);
      setDbEdges(e);
      setNodes(toFlowNodes(n));
      setEdges(toFlowEdges(e));
    } catch {
      toast({ title: "Could not load map", variant: "destructive" });
    }
  }, [user?.id, mapId, setNodes, setEdges]);

  useEffect(() => {
    void hydrateMap();
  }, [hydrateMap]);

  useSandboxMapRealtime(mapId, hydrateMap);

  const schedulePersistNodes = useCallback(() => {
    if (!user?.id || !mapId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      let wrote = false;
      for (const n of nodes) {
        const prev = dbNodes.find((d) => d.id === n.id);
        if (!prev) continue;
        try {
          await upsertMapNode(user.id, {
            id: n.id,
            mapId,
            x: n.position.x,
            y: n.position.y,
            content: String((n.data as { label?: string }).label ?? prev.content),
            nodeType: prev.nodeType,
            linkedIdeaId: prev.linkedIdeaId,
            linkedCodexId: prev.linkedCodexId,
            color: prev.color,
            status: prev.status,
            metadata: prev.metadata,
          });
          wrote = true;
        } catch {
          /* ignore */
        }
      }
      if (wrote) setLastSavedAt(Date.now());
    }, 900);
  }, [user?.id, mapId, nodes, dbNodes]);

  useEffect(() => {
    schedulePersistNodes();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [nodes, schedulePersistNodes]);

  const onConnect = useCallback(
    async (c: Connection) => {
      if (!user?.id || !mapId || !c.source || !c.target) return;
      setEdges((eds) => addEdge({ ...c, style: { strokeWidth: 1.5 } }, eds));
      try {
        await createMapEdge({
          userId: user.id,
          mapId,
          sourceNodeId: c.source,
          targetNodeId: c.target,
        });
        await hydrateMap();
      } catch (e) {
        console.warn(e);
      }
    },
    [user?.id, mapId, setEdges, hydrateMap],
  );

  const activeMap = maps.find((m) => m.id === mapId);

  const onNewMap = async () => {
    if (!user?.id) return;
    const novelId = novelScope === "all" || novelScope === "unassigned" ? null : novelScope;
    try {
      const m = await createSandboxMap({
        userId: user.id,
        novelId,
        name: "Untitled map",
        mapType: "mindmap",
      });
      const center = await upsertMapNode(user.id, {
        mapId: m.id,
        x: 0,
        y: 0,
        content: "Core idea",
        nodeType: "root",
      });
      setMaps((prev) => [m, ...prev]);
      setMapId(m.id);
      setDbNodes([center]);
      setNodes(toFlowNodes([center]));
      setEdges([]);
      trackEvent("sandbox_map_new", {});
    } catch {
      toast({ title: "Could not create map", variant: "destructive" });
    }
  };

  const addNode = async () => {
    if (!user?.id || !mapId) return;
    const n = await upsertMapNode(user.id, {
      mapId,
      x: 120 + Math.random() * 80,
      y: 80 + Math.random() * 80,
      content: "New node",
      nodeType: "idea",
    });
    setDbNodes((prev) => [...prev, n]);
    setNodes((nds) => [...nds, ...toFlowNodes([n])]);
  };

  const importIdea = async (entryId: string) => {
    const e = ideaWebEntries.find((x) => x.id === entryId);
    if (!user?.id || !mapId || !e) return;
    const label = (e.title || e.body).slice(0, 120);
    const n = await upsertMapNode(user.id, {
      mapId,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      content: label,
      nodeType: "idea",
      linkedIdeaId: e.id,
    });
    setDbNodes((prev) => [...prev, n]);
    setNodes((nds) => [...nds, ...toFlowNodes([n])]);
  };

  const setMapType = async (mapType: string) => {
    if (!user?.id || !mapId) return;
    await updateSandboxMap(user.id, mapId, { mapType });
    setMaps((prev) => prev.map((m) => (m.id === mapId ? { ...m, mapType } : m)));
  };

  const applyTreeLayout = () => {
    if (nodes.length === 0) return;
    const root = findRootNodeId(
      nodes.map((n) => n.id),
      edges.map((e) => ({ source: e.source, target: e.target })),
    );
    const pos = layoutTreeFromRoot(
      nodes.map((n) => n.id),
      edges.map((e) => ({ source: e.source, target: e.target })),
      root || nodes[0].id,
    );
    setNodes(mergePositions(nodes, pos));
  };

  const applyRadialLayout = () => {
    if (nodes.length === 0) return;
    const center = nodes[0].id;
    const pos = layoutRadialOrbit(
      nodes.map((n) => n.id),
      center,
      240,
    );
    setNodes(mergePositions(nodes, pos));
  };

  const runAiMap = async () => {
    if (!user?.id) return;
    setAiLoading(true);
    try {
      const summary = nodes
        .map((n) => String((n.data as { label?: string }).label ?? ""))
        .filter(Boolean)
        .slice(0, 40)
        .join("\n");
      const { text } = await invokeIdeaWebGroq("map_editorial", [], {
        map: { nodesSummary: summary || "(empty map)" },
      });
      toast({ title: "Map editorial", description: text.slice(0, 200) });
      trackEvent("sandbox_map_ai", {});
    } catch (err) {
      toast({
        title: "Editorial unavailable",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const onDeleteMap = async () => {
    if (!user?.id || !mapId) return;
    try {
      await deleteSandboxMap(user.id, mapId);
      setMapId(null);
      await loadMaps();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={mapId ?? ""} onValueChange={(v) => setMapId(v || null)}>
          <SelectTrigger className="w-[200px] border border-border">
            <SelectValue placeholder="Choose a map" />
          </SelectTrigger>
          <SelectContent>
            {maps.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={() => void onNewMap()}>
          New map
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void addNode()}>
          Add node
        </Button>
        <Select onValueChange={(v) => void importIdea(v)}>
          <SelectTrigger className="w-[180px] border border-border text-xs">
            <SelectValue placeholder="Import Idea Web…" />
          </SelectTrigger>
          <SelectContent>
            {ideaWebEntries.slice(0, 80).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {(e.title || e.body).slice(0, 40)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeMap?.mapType ?? "mindmap"} onValueChange={(v) => void setMapType(v)}>
          <SelectTrigger className="w-[140px] border border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mindmap">Mind map</SelectItem>
            <SelectItem value="tree">Tree</SelectItem>
            <SelectItem value="affinity">Affinity</SelectItem>
            <SelectItem value="radial">Radial</SelectItem>
            <SelectItem value="flowchart">Flowchart</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" size="sm" variant="secondary" onClick={applyTreeLayout}>
          Tree layout
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={applyRadialLayout}>
          Radial layout
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => mapId && exportSvg(nodes, edges, activeMap?.name ?? "map")}
        >
          Export SVG
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={aiLoading} onClick={() => void runAiMap()}>
          {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "AI map questions"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => void onDeleteMap()}>
          Delete map
        </Button>
      </div>
      {lastSavedAt != null && (
        <p className="text-[11px] text-muted-foreground">
          Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      {editorialHints.length > 0 && (
        <ul className="list-inside list-disc text-[11px] text-muted-foreground">
          {editorialHints.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
      <div className="h-[min(65vh,560px)] w-full rounded-lg border border-border bg-muted/20 [&_.react-flow__attribution]:hidden">
        {mapId ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">Create or select a map.</p>
        )}
      </div>
    </div>
  );
}
