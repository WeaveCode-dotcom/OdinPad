import { Check, GripVertical, Palette, Plus, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNovelContext } from "@/contexts/NovelContext";
import type { Scene, TimelineRow } from "@/types/novel";

function genId() {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const STATUS_BG: Record<Scene["status"], string> = {
  draft: "bg-muted-foreground/30",
  "in-progress": "bg-primary/60",
  complete: "bg-emerald-500/70",
  revision: "bg-amber-500/70",
};

const STATUS_LABEL: Record<Scene["status"], string> = {
  draft: "Draft",
  "in-progress": "In Progress",
  complete: "Complete",
  revision: "Revision",
};

const THREAD_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#84cc16",
  "#ef4444",
  "#eab308",
  "#06b6d4",
  "#a855f7",
];

export function TimelinePanel() {
  const { activeNovel, activeSceneId, updateCanvas } = useNovelContext();

  // ── Local state ───────────────────────────────────────────────────────────────
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowName, setEditingRowName] = useState("");
  const [colorPickerRowId, setColorPickerRowId] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ rowId: string; colIdx: number } | null>(null);
  const [rowDragFrom, setRowDragFrom] = useState<number | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────────────

  const flatChapters = useMemo(() => {
    if (!activeNovel) return [];
    const chapters: { id: string; title: string; actTitle: string; actId: string; actIdx: number }[] = [];
    activeNovel.acts.forEach((act, ai) => {
      act.chapters.forEach((ch) => {
        chapters.push({ id: ch.id, title: ch.title, actTitle: act.title, actId: act.id, actIdx: ai });
      });
    });
    return chapters;
  }, [activeNovel]);

  const scenesByChapterId = useCallback(
    (chapterId: string): Scene[] => {
      if (!activeNovel) return [];
      for (const act of activeNovel.acts) {
        const ch = act.chapters.find((c) => c.id === chapterId);
        if (ch) return ch.scenes;
      }
      return [];
    },
    [activeNovel],
  );

  const allSceneMap = useMemo(() => {
    if (!activeNovel) return new Map<string, Scene>();
    const m = new Map<string, Scene>();
    activeNovel.acts.forEach((a) => a.chapters.forEach((ch) => ch.scenes.forEach((s) => m.set(s.id, s))));
    return m;
  }, [activeNovel]);

  const rows: TimelineRow[] = activeNovel?.canvas?.timeline?.rows?.length
    ? activeNovel.canvas.timeline.rows
    : [{ id: "main", name: "Main plot", order: 0 }];

  const cards = activeNovel?.canvas?.timeline?.cards ?? [];

  // ── Derived: thread gap warnings ──────────────────────────────────────────────

  const threadGaps = useMemo(() => {
    const gaps: Record<string, number[]> = {};
    rows.forEach((row) => {
      const gaps_in_row: number[] = [];
      let lastFilled = -1;
      let gapStart = -1;
      flatChapters.forEach((_, ci) => {
        const cell = cards.find((c) => c.rowId === row.id && c.columnIndex === ci);
        if (cell) {
          if (gapStart !== -1 && ci - lastFilled > 3) gaps_in_row.push(gapStart);
          lastFilled = ci;
          gapStart = -1;
        } else {
          if (gapStart === -1 && lastFilled !== -1) gapStart = ci;
        }
      });
      if (gaps_in_row.length) gaps[row.id] = gaps_in_row;
    });
    return gaps;
  }, [rows, cards, flatChapters]);

  // ── Act boundaries for column grouping ───────────────────────────────────────

  const actBoundaries = useMemo(() => {
    if (!activeNovel) return new Map<number, string>();
    const m = new Map<number, string>();
    let colIdx = 0;
    activeNovel.acts.forEach((act) => {
      m.set(colIdx, act.title);
      colIdx += act.chapters.length;
    });
    return m;
  }, [activeNovel]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const setCellScene = (rowId: string, columnIndex: number, sceneId: string | "") => {
    updateCanvas((prev) => {
      const baseRows = prev?.timeline?.rows?.length
        ? prev.timeline.rows
        : [{ id: "main", name: "Main plot", order: 0 }];
      const filtered = [...(prev?.timeline?.cards ?? [])].filter(
        (c) => !(c.rowId === rowId && c.columnIndex === columnIndex),
      );
      const nextCards = sceneId ? [...filtered, { id: genId(), rowId, sceneId, columnIndex }] : filtered;
      return { ...prev, timeline: { rows: baseRows, cards: nextCards, columnMode: "chapter" } };
    });
  };

  const addRow = () => {
    updateCanvas((prev) => {
      const baseRows = [...(prev?.timeline?.rows ?? [{ id: "main", name: "Main plot", order: 0 }])];
      const id = genId();
      const color = THREAD_PALETTE[baseRows.length % THREAD_PALETTE.length];
      baseRows.push({ id, name: `Thread ${baseRows.length + 1}`, order: baseRows.length, color });
      return { ...prev, timeline: { rows: baseRows, cards: prev?.timeline?.cards ?? [], columnMode: "chapter" } };
    });
  };

  const removeRow = (rowId: string) => {
    if (rowId === "main") return;
    updateCanvas((prev) => {
      const baseRows = (prev?.timeline?.rows ?? []).filter((r) => r.id !== rowId);
      const nextCards = (prev?.timeline?.cards ?? []).filter((c) => c.rowId !== rowId);
      return {
        ...prev,
        timeline: {
          rows: baseRows.length ? baseRows : [{ id: "main", name: "Main plot", order: 0 }],
          cards: nextCards,
          columnMode: "chapter",
        },
      };
    });
  };

  const renameRow = (rowId: string, name: string) => {
    updateCanvas((prev) => ({
      ...prev,
      timeline: {
        rows: (prev?.timeline?.rows ?? []).map((r) => (r.id === rowId ? { ...r, name } : r)),
        cards: prev?.timeline?.cards ?? [],
        columnMode: "chapter",
      },
    }));
  };

  const colorRow = (rowId: string, color: string) => {
    updateCanvas((prev) => ({
      ...prev,
      timeline: {
        rows: (prev?.timeline?.rows ?? []).map((r) => (r.id === rowId ? { ...r, color } : r)),
        cards: prev?.timeline?.cards ?? [],
        columnMode: "chapter",
      },
    }));
    setColorPickerRowId(null);
  };

  const reorderRows = (from: number, to: number) => {
    updateCanvas((prev) => {
      const baseRows = [...(prev?.timeline?.rows ?? [])];
      const [moved] = baseRows.splice(from, 1);
      baseRows.splice(to, 0, moved);
      return {
        ...prev,
        timeline: {
          rows: baseRows.map((r, i) => ({ ...r, order: i })),
          cards: prev?.timeline?.cards ?? [],
          columnMode: "chapter",
        },
      };
    });
  };

  // ── Keyboard navigation ────────────────────────────────────────────────────────

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    const rowCount = rows.length;
    const colCount = flatChapters.length;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        setFocusedCell({ rowId: rows[rowIdx].id, colIdx: Math.min(colCount - 1, colIdx + 1) });
        break;
      case "ArrowLeft":
        e.preventDefault();
        setFocusedCell({ rowId: rows[rowIdx].id, colIdx: Math.max(0, colIdx - 1) });
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedCell({ rowId: rows[Math.min(rowCount - 1, rowIdx + 1)].id, colIdx });
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedCell({ rowId: rows[Math.max(0, rowIdx - 1)].id, colIdx });
        break;
    }
  };

  if (!activeNovel) return null;

  if (flatChapters.length === 0) {
    return (
      <div className="rounded-sm border-2 border-dashed border-border/50 bg-muted/10 py-10 text-center">
        <p className="text-sm text-muted-foreground">Add acts and chapters in Binder to use the timeline grid.</p>
      </div>
    );
  }

  const ACT_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#84cc16"];

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Assign scenes to plot threads for each chapter. Cells are colored by scene status.
        </p>

        {/* Gap warnings */}
        {Object.keys(threadGaps).length > 0 && (
          <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
            <span className="font-semibold">Thread gaps detected: </span>
            {Object.entries(threadGaps).map(([rowId, gaps]) => {
              const row = rows.find((r) => r.id === rowId);
              return (
                <span key={rowId}>
                  "{row?.name}" has {gaps.length} gap{gaps.length > 1 ? "s" : ""}.{" "}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            Add plot thread
          </Button>
        </div>

        {/* Thread balance bar */}
        {rows.length > 1 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Thread coverage</p>
            <div className="flex h-3 w-full overflow-hidden rounded-sm border border-border/50">
              {rows.map((row, ri) => {
                const filled = cards.filter((c) => c.rowId === row.id).length;
                const pct = flatChapters.length > 0 ? (filled / flatChapters.length) * 100 : 0;
                const color = row.color ?? THREAD_PALETTE[ri % THREAD_PALETTE.length];
                return (
                  <Tooltip key={row.id}>
                    <TooltipTrigger asChild>
                      <div
                        className="h-full"
                        style={{
                          width: `${100 / rows.length}%`,
                          background: `${color}44`,
                          borderRight: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {row.name}: {filled}/{flatChapters.length} chapters ({Math.round(pct)}%)
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] border-collapse text-xs" role="grid">
            <thead>
              {/* Act separator row */}
              {activeNovel.acts.length > 1 && (
                <tr className="border-b border-border/40">
                  <th className="sticky left-0 z-10 min-w-[140px] border-r border-border bg-muted/40 px-2 py-1" />
                  {flatChapters.map((col, ci) => {
                    const actLabel = actBoundaries.get(ci);
                    const actIdx = activeNovel.acts.findIndex((a) => a.id === col.actId);
                    const color = activeNovel.acts[actIdx]?.color ?? ACT_COLORS[actIdx % ACT_COLORS.length];
                    return actLabel ? (
                      <th
                        key={col.id}
                        colSpan={activeNovel.acts.find((a) => a.id === col.actId)?.chapters.length ?? 1}
                        className="border-r border-border px-2 py-1 text-left text-[10px] font-semibold last:border-r-0"
                        style={{ color }}
                      >
                        {actLabel}
                      </th>
                    ) : null;
                  })}
                </tr>
              )}

              {/* Chapter headers */}
              <tr className="border-b border-border bg-muted/40">
                <th className="sticky left-0 z-10 min-w-[140px] border-r border-border bg-muted/40 px-2 py-2 text-left font-semibold">
                  Thread
                </th>
                {flatChapters.map((col, ci) => {
                  const chSceneCount = scenesByChapterId(col.id).length;
                  return (
                    <th
                      key={col.id}
                      className="min-w-[120px] border-r border-border px-2 py-2 text-left font-medium last:border-r-0"
                    >
                      <span className="block truncate">{col.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {col.actTitle} · {chSceneCount} sc
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const rowColor = row.color ?? THREAD_PALETTE[rowIdx % THREAD_PALETTE.length];
                const hasGap = Boolean(threadGaps[row.id]);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-b-0"
                    draggable
                    onDragStart={() => setRowDragFrom(rowIdx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (rowDragFrom !== null && rowDragFrom !== rowIdx) reorderRows(rowDragFrom, rowIdx);
                      setRowDragFrom(null);
                    }}
                    role="row"
                  >
                    {/* Thread header cell */}
                    <td
                      className="sticky left-0 z-10 border-r border-border bg-card px-2 py-2 font-medium"
                      role="rowheader"
                    >
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab shrink-0" aria-hidden />
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: rowColor }}
                          aria-hidden
                        />
                        {editingRowId === row.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              autoFocus
                              value={editingRowName}
                              onChange={(e) => setEditingRowName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  renameRow(row.id, editingRowName);
                                  setEditingRowId(null);
                                }
                                if (e.key === "Escape") setEditingRowId(null);
                              }}
                              className="flex-1 min-w-0 rounded-sm border border-border bg-background px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                renameRow(row.id, editingRowName);
                                setEditingRowId(null);
                              }}
                              className="rounded p-0.5 text-primary hover:bg-primary/10"
                              aria-label="Save thread name"
                            >
                              <Check className="h-3 w-3" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRowId(null)}
                              className="rounded p-0.5 text-muted-foreground"
                              aria-label="Cancel"
                            >
                              <X className="h-3 w-3" aria-hidden />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onDoubleClick={() => {
                              setEditingRowId(row.id);
                              setEditingRowName(row.name);
                            }}
                            className={`truncate text-left text-xs flex-1 ${hasGap ? "text-amber-400" : ""}`}
                            title="Double-click to rename"
                          >
                            {row.name}
                            {hasGap && " ⚠"}
                          </button>
                        )}

                        {/* Color picker */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setColorPickerRowId(colorPickerRowId === row.id ? null : row.id)}
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                            aria-label="Change thread color"
                          >
                            <Palette className="h-3 w-3" aria-hidden />
                          </button>
                          {colorPickerRowId === row.id && (
                            <div className="absolute left-0 top-5 z-50 flex flex-wrap gap-1 rounded-sm border border-border bg-card p-2 shadow-lg w-28">
                              {THREAD_PALETTE.map((hex) => (
                                <button
                                  key={hex}
                                  type="button"
                                  onClick={() => colorRow(row.id, hex)}
                                  className="h-4 w-4 rounded-full border border-white/20 hover:scale-110 transition-transform"
                                  style={{ background: hex }}
                                  aria-label={`Set color ${hex}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {row.id !== "main" && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => removeRow(row.id)}
                            aria-label={`Remove thread ${row.name}`}
                          >
                            <Trash2 className="h-3 w-3" aria-hidden />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Scene cells */}
                    {flatChapters.map((col, colIdx) => {
                      const scenes = scenesByChapterId(col.id);
                      const cell = cards.find((c) => c.rowId === row.id && c.columnIndex === colIdx);
                      const isActiveScene = Boolean(activeSceneId && cell?.sceneId === activeSceneId);
                      const cellScene = cell?.sceneId ? allSceneMap.get(cell.sceneId) : undefined;
                      const isFocused = focusedCell?.rowId === row.id && focusedCell?.colIdx === colIdx;

                      return (
                        <td
                          key={`${row.id}-${col.id}`}
                          role="gridcell"
                          tabIndex={isFocused ? 0 : -1}
                          onFocus={() => setFocusedCell({ rowId: row.id, colIdx })}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                          className={`border-r border-border px-1 py-1 align-top last:border-r-0 ${
                            isActiveScene ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : ""
                          } ${isFocused ? "outline outline-2 outline-primary/50 outline-offset-[-1px]" : ""}`}
                        >
                          {/* Scene pill */}
                          {cellScene && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`mb-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white/90 ${STATUS_BG[cellScene.status]}`}
                                  style={{ background: rowColor + "44" }}
                                >
                                  <span
                                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_BG[cellScene.status]}`}
                                    aria-hidden
                                  />
                                  <span className="truncate">{cellScene.title.slice(0, 20)}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs max-w-xs">
                                <p className="font-semibold">{cellScene.title}</p>
                                <p className="text-muted-foreground">
                                  {STATUS_LABEL[cellScene.status]}
                                  {cellScene.pov ? ` · ${cellScene.pov}` : ""}
                                </p>
                                {cellScene.summary && <p className="mt-1">{cellScene.summary.slice(0, 120)}</p>}
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <label className="sr-only" htmlFor={`tl-${row.id}-${colIdx}`}>
                            Scene for {row.name} in {col.title}
                            {isActiveScene ? " (currently editing)" : ""}
                          </label>
                          <select
                            id={`tl-${row.id}-${colIdx}`}
                            className="w-full max-w-[200px] rounded border border-input bg-background px-1 py-0.5 text-[11px]"
                            value={cell?.sceneId ?? ""}
                            onChange={(e) => setCellScene(row.id, colIdx, e.target.value)}
                          >
                            <option value="">—</option>
                            {scenes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Thread legend */}
        {rows.length > 1 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {rows.map((row, ri) => (
              <span key={row.id} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: row.color ?? THREAD_PALETTE[ri % THREAD_PALETTE.length] }}
                  aria-hidden
                />
                <span className="text-[11px] text-muted-foreground">{row.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
