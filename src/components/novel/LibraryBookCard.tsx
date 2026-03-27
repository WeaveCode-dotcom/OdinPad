import { motion } from "framer-motion";
import { BookOpen, Clock, Pencil, Trash2 } from "lucide-react";
import { memo, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { getCoverDisplayUrl } from "@/lib/novel-cover";
import { getNovelWordCount } from "@/lib/novel-metrics";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types/novel";

interface LibraryBookCardProps {
  novel: Novel;
  index: number;
  onOpen: () => void;
  onEdit: (e: MouseEvent) => void;
  onDelete: (e: MouseEvent) => void;
  prefetchWorkspace: () => void;
  /** Merged onto the outer card container (e.g. drag row layout). */
  className?: string;
}

export const LibraryBookCard = memo(function LibraryBookCard({
  novel,
  index,
  onOpen,
  onEdit,
  onDelete,
  prefetchWorkspace,
  className,
}: LibraryBookCardProps) {
  const totalWords = getNovelWordCount(novel);
  const totalScenes = novel.acts.reduce(
    (sum, act) => sum + act.chapters.reduce((cSum, ch) => cSum + ch.scenes.length, 0),
    0,
  );
  const coverUrl = getCoverDisplayUrl(novel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onMouseEnter={prefetchWorkspace}
      onClick={onOpen}
      className={cn(
        "group flex cursor-pointer gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="relative h-[7.25rem] w-[4.75rem] shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
        {coverUrl ? (
          <img src={coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
            <BookOpen className="h-6 w-6 text-muted-foreground/60" aria-hidden />
            <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Cover</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-tight text-foreground group-hover:underline">{novel.title}</h3>
            {novel.subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{novel.subtitle}</p>}
            <p className="mt-1 text-sm text-muted-foreground">{novel.author}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              aria-label="Edit book"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onDelete}
              aria-label="Delete book"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <span className="hidden rounded-md bg-secondary px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground sm:inline">
              {totalWords.toLocaleString()} w
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">{novel.genre ?? "—"}</span>
          <span aria-hidden>·</span>
          <span>{novel.status ?? "drafting"}</span>
          {novel.seriesPosition != null && (
            <>
              <span aria-hidden>·</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                Vol. {novel.seriesPosition}
              </span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>
            {novel.acts.length} acts · {totalScenes} scenes
          </span>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(novel.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground sm:hidden">{totalWords.toLocaleString()} words</p>
      </div>
    </motion.div>
  );
});
