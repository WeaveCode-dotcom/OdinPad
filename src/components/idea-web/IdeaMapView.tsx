import "@xyflow/react/dist/style.css";

import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import {
  createIdeaWebLink,
  createIdeaWebRevision,
  snapshotFromIdeaWebEntry,
  updateIdeaWebEntry,
} from "@/lib/idea-web/service";
import type { IdeaWebEntry } from "@/types/idea-web";

function entryLabel(e: IdeaWebEntry): string {
  const t = e.title?.trim();
  if (t && t !== "New idea" && t !== "Untitled") return t.slice(0, 48);
  return (e.body || "Idea").slice(0, 48);
}

/** `novelId`: project id, `null` for unassigned only, `'all'` for every visible entry. */
export function IdeaMapView({
  novelId,
  entryIdsFilter,
}: {
  novelId: string | null | "all";
  /** When `novelId` is `'all'`, restrict to these entry ids (e.g. inbox list filters). */
  entryIdsFilter?: string[] | null;
}) {
  const { user } = useAuth();
  const { ideaWebEntries, ideaWebLinks, refetchIdeaWeb } = useNovelContext();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entries = useMemo(() => {
    let list =
      novelId === "all"
        ? ideaWebEntries
        : novelId === null
          ? ideaWebEntries.filter((e) => e.novelId === null)
          : ideaWebEntries.filter((e) => e.novelId === novelId);
    if (novelId === "all" && entryIdsFilter != null) {
      if (entryIdsFilter.length === 0) {
        list = [];
      } else {
        const allow = new Set(entryIdsFilter);
        list = list.filter((e) => allow.has(e.id));
      }
    }
    return list;
  }, [ideaWebEntries, novelId, entryIdsFilter]);

  const initialNodes = useMemo(() => {
    return entries.map((e, i) => {
      const pos = (e.metadata?.mapPos as { x: number; y: number } | undefined) ?? {
        x: (i % 4) * 200,
        y: Math.floor(i / 4) * 100,
      };
      return {
        id: e.id,
        type: "default",
        position: pos,
        data: { label: entryLabel(e) },
        style: {
          border: "1px solid hsl(var(--border))",
          borderRadius: 8,
          padding: 8,
          fontSize: 12,
          background: "hsl(var(--card))",
          maxWidth: 220,
          boxShadow: "0 1px 2px rgb(0 0 0 / 0.06)",
        },
      } satisfies Node;
    });
  }, [entries]);

  const initialEdges = useMemo(() => {
    const ids = new Set(entries.map((e) => e.id));
    return ideaWebLinks
      .filter((l) => ids.has(l.fromEntryId) && ids.has(l.toEntryId))
      .map(
        (l) =>
          ({
            id: l.id,
            source: l.fromEntryId,
            target: l.toEntryId,
            style: { stroke: "hsl(var(--muted-foreground) / 0.45)", strokeWidth: 1.5 },
          }) satisfies Edge,
      );
  }, [ideaWebLinks, entries]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const persistLayout = useCallback(async () => {
    if (!user?.id) return;
    for (const n of nodes) {
      const ent = entries.find((e) => e.id === n.id);
      if (!ent) continue;
      const metadata = { ...ent.metadata, mapPos: n.position };
      await updateIdeaWebEntry(user.id, n.id, { metadata });
      const nextEntry: IdeaWebEntry = { ...ent, metadata };
      try {
        await createIdeaWebRevision(user.id, n.id, "map_move", snapshotFromIdeaWebEntry(nextEntry));
      } catch (e) {
        console.warn("Idea Web map revision skipped", e);
      }
    }
    await refetchIdeaWeb();
  }, [user?.id, nodes, entries, refetchIdeaWeb]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persistLayout(), 800);
  }, [persistLayout]);

  const onConnect = useCallback(
    async (c: Connection) => {
      if (!user?.id || !c.source || !c.target) return;
      setEdges((eds) =>
        addEdge({ ...c, style: { stroke: "hsl(var(--muted-foreground) / 0.45)", strokeWidth: 1.5 } }, eds),
      );
      try {
        await createIdeaWebLink({ userId: user.id, fromEntryId: c.source, toEntryId: c.target, kind: "manual" });
        await refetchIdeaWeb();
      } catch (e) {
        console.warn(e);
      }
    },
    [user?.id, refetchIdeaWeb, setEdges],
  );

  const mapKeyboardId = "idea-map-keyboard-hint";

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {novelId === "all" && entryIdsFilter != null && entryIdsFilter.length === 0
          ? "No ideas match the current filters. Adjust filters or add ideas."
          : "Add ideas to see the map."}
      </p>
    );
  }

  return (
    <div className="flex h-[min(70vh,560px)] w-full flex-col overflow-hidden rounded-lg border border-border bg-muted/30">
      <p id={mapKeyboardId} className="sr-only">
        Idea map: Tab moves focus between ideas and links. When an idea is focused, use arrow keys to nudge it, or drag
        with the pointer. Hold Space while dragging to pan the canvas. Connect ideas by dragging from one idea&apos;s
        handle to another.
      </p>
      {novelId === "all" && entryIdsFilter != null && entryIdsFilter.length > 0 && (
        <p className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          Map shows ideas that match your current inbox filters (same set as list/grid).
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border border-border text-xs"
          onClick={() => void persistLayout()}
        >
          Save layout
        </Button>
        <span className="text-[10px] text-muted-foreground" aria-hidden>
          Drag nodes. Connect handles to link ideas.
        </span>
      </div>
      <div className="min-h-0 flex-1 [&_.react-flow__attribution]:hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          aria-label="Idea Web map"
          aria-describedby={mapKeyboardId}
          nodesFocusable
          edgesFocusable
          onNodesChange={(e) => {
            onNodesChange(e);
            scheduleSave();
          }}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
