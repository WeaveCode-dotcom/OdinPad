const MAX_SNAPSHOTS = 10;
const KEY = (sceneId: string) => `odinpad_snapshots_${sceneId}`;

export interface SceneSnapshot {
  id: string;
  label: string;
  content: string;
  wordCount: number;
  createdAt: string;
}

export function loadSnapshots(sceneId: string): SceneSnapshot[] {
  try {
    const raw = localStorage.getItem(KEY(sceneId));
    if (!raw) return [];
    return JSON.parse(raw) as SceneSnapshot[];
  } catch {
    return [];
  }
}

export function saveSnapshot(sceneId: string, content: string, label?: string): SceneSnapshot {
  const snap: SceneSnapshot = {
    id: crypto.randomUUID(),
    label: label ?? new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    createdAt: new Date().toISOString(),
  };
  const existing = loadSnapshots(sceneId);
  const updated = [snap, ...existing].slice(0, MAX_SNAPSHOTS);
  try {
    localStorage.setItem(KEY(sceneId), JSON.stringify(updated));
  } catch {
    /* quota exceeded — silent */
  }
  return snap;
}

export function deleteSnapshot(sceneId: string, snapId: string): void {
  const updated = loadSnapshots(sceneId).filter((s) => s.id !== snapId);
  try {
    localStorage.setItem(KEY(sceneId), JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

// ── Minimal line diff ─────────────────────────────────────────────────────────

export type DiffLine = { kind: "eq" | "add" | "del"; text: string };

/** Compute a line-level diff between two strings. Uses simple LCS patience sort. */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const result: DiffLine[] = [];

  // dp[i][j] = LCS length for a[0..i-1], b[0..j-1]
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  let i = m;
  let j = n;
  const stack: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      stack.push({ kind: "eq", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ kind: "add", text: b[j - 1] });
      j--;
    } else {
      stack.push({ kind: "del", text: a[i - 1] });
      i--;
    }
  }
  stack.reverse().forEach((l) => result.push(l));
  return result;
}
