import type { Node } from "@xyflow/react";

/** Find a root node id (no incoming edges). Falls back to first node. */
export function findRootNodeId(nodeIds: string[], edges: { source: string; target: string }[]): string {
  const targets = new Set(edges.map((e) => e.target));
  const roots = nodeIds.filter((id) => !targets.has(id));
  return roots[0] ?? nodeIds[0] ?? "";
}

/** Tree layout from a root using BFS layers (horizontal centering per row). */
export function layoutTreeFromRoot(
  nodeIds: string[],
  edges: { source: string; target: string }[],
  rootId: string,
  opts?: { h: number; v: number },
): Map<string, { x: number; y: number }> {
  const h = opts?.h ?? 200;
  const v = opts?.v ?? 110;
  const children = new Map<string, string[]>();
  for (const e of edges) {
    const arr = children.get(e.source) ?? [];
    arr.push(e.target);
    children.set(e.source, arr);
  }
  const pos = new Map<string, { x: number; y: number }>();
  const layers: string[][] = [];
  let level = rootId ? [rootId] : [];
  const seen = new Set<string>();
  while (level.length) {
    layers.push(level);
    level.forEach((id) => seen.add(id));
    const next: string[] = [];
    for (const id of level) {
      for (const c of children.get(id) ?? []) {
        if (!seen.has(c)) next.push(c);
      }
    }
    level = next;
  }
  layers.forEach((layer, depth) => {
    layer.forEach((id, i) => {
      const x = (i - (layer.length - 1) / 2) * h;
      pos.set(id, { x, y: depth * v });
    });
  });
  for (const id of nodeIds) {
    if (!pos.has(id)) pos.set(id, { x: 0, y: 0 });
  }
  return pos;
}

/** Radial orbit positions around center. */
export function layoutRadialOrbit(
  nodeIds: string[],
  centerId: string,
  radius = 220,
): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  pos.set(centerId, { x: 0, y: 0 });
  const orbit = nodeIds.filter((id) => id !== centerId);
  const n = Math.max(orbit.length, 1);
  orbit.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / n;
    pos.set(id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });
  return pos;
}

export function mergePositions(nodes: Node[], positions: Map<string, { x: number; y: number }>): Node[] {
  return nodes.map((n) => {
    const p = positions.get(n.id);
    return p ? { ...n, position: p } : n;
  });
}
