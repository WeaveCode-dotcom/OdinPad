import type { SandboxMapEdge, SandboxMapNode } from "@/types/sandbox";

export type MapEditorialHint = {
  kind: "orphan" | "cluster" | "contradiction";
  message: string;
  nodeIds?: string[];
};

/** Non-generative hints from graph structure only (no story text generation). */
export function computeMapEditorialHints(nodes: SandboxMapNode[], edges: SandboxMapEdge[]): MapEditorialHint[] {
  const hints: MapEditorialHint[] = [];
  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.sourceNodeId);
    connected.add(e.targetNodeId);
  }
  const orphans = nodes.filter((n) => !connected.has(n.id) && nodes.length > 1);
  if (orphans.length > 0) {
    hints.push({
      kind: "orphan",
      message: `${orphans.length} node(s) have no connections—link them or merge.`,
      nodeIds: orphans.map((n) => n.id),
    });
  }

  const byStatus = new Map<string, SandboxMapNode[]>();
  for (const n of nodes) {
    const s = n.status || "unset";
    const arr = byStatus.get(s) ?? [];
    arr.push(n);
    byStatus.set(s, arr);
  }
  for (const [status, group] of byStatus) {
    if (status !== "unset" && group.length >= 3) {
      hints.push({
        kind: "cluster",
        message: `Many nodes share status “${status}”—a possible motif or act cluster.`,
        nodeIds: group.map((n) => n.id),
      });
    }
  }

  return hints;
}
