import { useMemo } from "react";

import type { IdeaWebEntry } from "@/types/idea-web";

const STATUSES = ["seed", "sprouting", "growing", "dormant", "harvested", "archived"] as const;

export function IdeaWebGardenWidget({ entries }: { entries: IdeaWebEntry[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of STATUSES) c[s] = 0;
    for (const e of entries) {
      const k = e.status ?? "seed";
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Idea Web</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <span
            key={s}
            className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium capitalize text-foreground"
          >
            {s}: {counts[s] ?? 0}
          </span>
        ))}
      </div>
    </div>
  );
}
