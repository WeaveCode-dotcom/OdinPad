import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { MouseEvent } from "react";

import { LibraryBookCard } from "@/components/novel/LibraryBookCard";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types/novel";

interface SortableSeriesBookCardProps {
  novel: Novel;
  index: number;
  onOpen: () => void;
  onEdit: (e: MouseEvent) => void;
  onDelete: (e: MouseEvent) => void;
  prefetchWorkspace: () => void;
}

export function SortableSeriesBookCard({
  novel,
  index,
  onOpen,
  onEdit,
  onDelete,
  prefetchWorkspace,
}: SortableSeriesBookCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: novel.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative flex gap-0", isDragging && "z-20 opacity-90")}>
      <button
        type="button"
        className="touch-none flex w-9 shrink-0 items-center justify-center rounded-l-md border border-r-0 border-border bg-secondary text-muted-foreground hover:bg-accent"
        aria-label="Drag to reorder in series"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <LibraryBookCard
          novel={novel}
          index={index}
          onOpen={onOpen}
          onEdit={onEdit}
          onDelete={onDelete}
          prefetchWorkspace={prefetchWorkspace}
          className="rounded-l-none border-l-0"
        />
      </div>
    </div>
  );
}
