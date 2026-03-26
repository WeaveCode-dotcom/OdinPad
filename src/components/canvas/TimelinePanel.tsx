import { Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { useNovelContext } from "@/contexts/NovelContext";

function genId() {
  return `tl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function TimelinePanel() {
  // Item 11: pull in active scene so we can highlight its cell
  const { activeNovel, activeSceneId, updateCanvas } = useNovelContext();

  const flatChapters = useMemo(() => {
    if (!activeNovel) return [];
    const chapters: { id: string; title: string; actTitle: string }[] = [];
    for (const act of activeNovel.acts) {
      for (const ch of act.chapters) {
        chapters.push({ id: ch.id, title: ch.title, actTitle: act.title });
      }
    }
    return chapters;
  }, [activeNovel]);

  const scenesByChapterId = useCallback(
    (chapterId: string) => {
      if (!activeNovel) return [];
      for (const act of activeNovel.acts) {
        const ch = act.chapters.find((c) => c.id === chapterId);
        if (ch) return ch.scenes;
      }
      return [];
    },
    [activeNovel],
  );

  const rows = activeNovel?.canvas?.timeline?.rows?.length
    ? activeNovel.canvas.timeline.rows
    : [{ id: "main", name: "Main plot", order: 0 }];

  const cards = activeNovel?.canvas?.timeline?.cards ?? [];

  const setCellScene = (rowId: string, columnIndex: number, sceneId: string | "") => {
    updateCanvas((prev) => {
      const baseRows = prev?.timeline?.rows?.length
        ? prev.timeline.rows
        : [{ id: "main", name: "Main plot", order: 0 }];
      const filtered = [...(prev?.timeline?.cards ?? [])].filter(
        (c) => !(c.rowId === rowId && c.columnIndex === columnIndex),
      );
      const nextCards = sceneId ? [...filtered, { id: genId(), rowId, sceneId, columnIndex }] : filtered;
      return {
        ...prev,
        timeline: {
          rows: baseRows,
          cards: nextCards,
          columnMode: "chapter",
        },
      };
    });
  };

  const addRow = () => {
    updateCanvas((prev) => {
      const baseRows = [...(prev?.timeline?.rows ?? [{ id: "main", name: "Main plot", order: 0 }])];
      const id = genId();
      baseRows.push({ id, name: `Thread ${baseRows.length + 1}`, order: baseRows.length });
      return {
        ...prev,
        timeline: {
          rows: baseRows,
          cards: prev?.timeline?.cards ?? [],
          columnMode: "chapter",
        },
      };
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

  if (!activeNovel) return null;

  if (flatChapters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add acts and chapters in Binder to use the chapter-based timeline grid.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Assign which scene belongs to each plot thread for each chapter. One scene per cell.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add plot thread
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="sticky left-0 z-10 min-w-[120px] border-r border-border bg-muted/40 px-2 py-2 text-left font-semibold">
                Thread
              </th>
              {flatChapters.map((col, colIdx) => (
                <th
                  key={col.id}
                  className="min-w-[120px] border-r border-border px-2 py-2 text-left font-medium last:border-r-0"
                >
                  <span className="block truncate">{col.title}</span>
                  <span className="text-[10px] text-muted-foreground">{col.actTitle}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                <td className="sticky left-0 z-10 border-r border-border bg-card px-2 py-2 font-medium">
                  <div className="flex items-center gap-1">
                    <span className="truncate">{row.name}</span>
                    {row.id !== "main" && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(row.id)}
                        aria-label="Remove thread"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </td>
                {flatChapters.map((col, colIdx) => {
                  const scenes = scenesByChapterId(col.id);
                  const cell = cards.find((c) => c.rowId === row.id && c.columnIndex === colIdx);
                  // Item 11: highlight the cell whose scene is currently being edited
                  const isActiveScene = Boolean(activeSceneId && cell?.sceneId === activeSceneId);
                  return (
                    <td
                      key={`${row.id}-${col.id}`}
                      className={`border-r border-border px-1 py-1 align-top last:border-r-0 ${
                        isActiveScene ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : ""
                      }`}
                    >
                      <label className="sr-only" htmlFor={`tl-${row.id}-${colIdx}`}>
                        Scene for {row.name} in {col.title}
                        {isActiveScene ? " (currently editing)" : ""}
                      </label>
                      <select
                        id={`tl-${row.id}-${colIdx}`}
                        className="w-full max-w-[200px] rounded border border-input bg-background px-1 py-1 text-xs"
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
