import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { CustomBeat } from "@/types/novel";

export function BeatRow({
  beat,
  index,
  total,
  isEditing,
  isFilled,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onAddAfter,
  onMoveUp,
  onMoveDown,
}: {
  beat: CustomBeat;
  index: number;
  total: number;
  isEditing: boolean;
  isFilled?: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (id: string, patch: Partial<CustomBeat>) => void;
  onDelete: (id: string) => void;
  onAddAfter: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [localTitle, setLocalTitle] = useState(beat.title);
  const [localDesc, setLocalDesc] = useState(beat.description);
  const [localPct, setLocalPct] = useState(beat.percentage);

  const save = () => {
    onUpdate(beat.id, { title: localTitle, description: localDesc, percentage: localPct });
    onStopEdit();
  };

  const cancel = () => {
    setLocalTitle(beat.title);
    setLocalDesc(beat.description);
    setLocalPct(beat.percentage);
    onStopEdit();
  };

  return (
    <div className="group px-4 py-2.5 hover:bg-accent/5 transition-colors">
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="flex-1 rounded-sm border-2 border-border bg-background px-2 py-1 text-sm font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="number"
              min={1}
              max={100}
              value={localPct}
              onChange={(e) => setLocalPct(Number(e.target.value))}
              className="w-16 rounded-sm border-2 border-border bg-background px-2 py-1 text-xs text-center font-medium text-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-ring"
              title="Story %"
            />
            <span className="text-xs text-muted-foreground">%</span>
            <button
              type="button"
              onClick={save}
              aria-label="Save beat"
              className="rounded p-1 text-primary hover:bg-primary/10 transition-colors"
            >
              <Check className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={cancel}
              aria-label="Cancel editing"
              className="rounded p-1 text-muted-foreground hover:bg-accent/10 transition-colors"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <textarea
            value={localDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
            placeholder="Beat description…"
            rows={2}
            className="w-full resize-none rounded-sm border-2 border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground shadow-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              aria-label="Move beat up"
              className="disabled:opacity-20 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="h-3 w-3 rotate-180" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === total - 1}
              aria-label="Move beat down"
              className="disabled:opacity-20 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="h-3 w-3" aria-hidden />
            </button>
          </div>

          <span className="w-5 text-center text-xs font-mono text-muted-foreground/60 shrink-0">{index + 1}</span>

          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-foreground">{beat.title}</span>
            {beat.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{beat.description}</p>}
          </div>

          <span className="shrink-0 text-xs font-mono text-muted-foreground">{beat.percentage}%</span>

          {beat.tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {t}
            </Badge>
          ))}

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={onStartEdit}
              aria-label="Edit beat"
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            >
              <Pencil className="h-3 w-3" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onAddAfter}
              aria-label="Add beat after"
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            >
              <Plus className="h-3 w-3" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onDelete(beat.id)}
              aria-label="Delete beat"
              className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
