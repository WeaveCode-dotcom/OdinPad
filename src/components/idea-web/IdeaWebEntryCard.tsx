import { motion, useReducedMotion } from "framer-motion";
import {
  Archive,
  ChevronDown,
  Leaf,
  Moon,
  Pin,
  PinOff,
  Scissors,
  Sprout,
  TrendingUp,
  Sparkles,
  Trash2,
} from "lucide-react";
import { memo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { entryCategory, IDEA_WEB_CATEGORIES } from "@/components/idea-web/idea-web-categories";
import { IdeaWebRevisionPanel } from "@/components/idea-web/IdeaWebRevisionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNovelContext } from "@/contexts/NovelContext";
import { ideaWebStatusLabel } from "@/lib/idea-web/status-labels";
import { cn } from "@/lib/utils";
import type { IdeaWebEntry, IdeaWebStatus } from "@/types/idea-web";
import type { Idea, Novel } from "@/types/novel";

const STATUSES: IdeaWebStatus[] = ["seed", "sprouting", "growing", "dormant", "harvested", "archived"];

/** Shape-based icon per status so status is discernible without color perception. */
const STATUS_ICONS: Record<IdeaWebStatus, React.ElementType> = {
  seed: Sprout,
  sprouting: Leaf,
  growing: TrendingUp,
  dormant: Moon,
  harvested: Scissors,
  archived: Archive,
};

export const IdeaWebEntryCard = memo(function IdeaWebEntryCard({
  entry,
  onUpdate,
  onDelete,
  novels,
  onPatchEntry,
  selectable,
  selected,
  onToggleSelect,
  defaultExpanded,
  onExpandChange,
}: {
  entry: IdeaWebEntry;
  onUpdate: (id: string, patch: Partial<Idea> & { title?: string }) => void;
  onDelete: (id: string) => void;
  novels?: Novel[];
  onPatchEntry?: (id: string, patch: Partial<{ novelId: string | null; status: IdeaWebStatus }>) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  defaultExpanded?: boolean;
  onExpandChange?: (id: string, expanded: boolean) => void;
}) {
  const navigate = useNavigate();
  const { openBookSandbox } = useNovelContext();
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const reduceMotion = useReducedMotion();

  const cat = IDEA_WEB_CATEGORIES.find((c) => c.value === entryCategory(entry)) || IDEA_WEB_CATEGORIES[4];
  const content = entry.body;
  const titleVal = entry.title === "New idea" ? "" : entry.title;
  const displayTitle = titleVal.trim() || "Untitled";
  const novelTitle = novels?.find((n) => n.id === entry.novelId)?.title;

  const stop = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <motion.div
      id={`idea-web-entry-${entry.id}`}
      layout
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, height: 0 }}
      className="group relative rounded-md border border-border/70 bg-card/80 shadow-sm transition-colors hover:border-border"
    >
      {/* Collapsed row */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse idea" : "Expand idea"}
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          onExpandChange?.(entry.id, next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const next = !expanded;
            setExpanded(next);
            onExpandChange?.(entry.id, next);
          }
        }}
        className={cn("flex cursor-pointer items-start gap-2 p-3 sm:gap-3", expanded && "border-b border-border/50")}
      >
        {selectable && (
          <div onClick={stop} className="pt-0.5">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect?.()}
              className="border border-border"
              aria-label="Select for harvest"
            />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className={cn("text-[10px] font-semibold uppercase", cat.color)}>
              {cat.label}
            </Badge>
            <Badge variant="outline" className="inline-flex items-center gap-1 text-[10px] font-normal">
              {(() => {
                const Icon = STATUS_ICONS[entry.status];
                return <Icon className="h-2.5 w-2.5" aria-hidden />;
              })()}
              {ideaWebStatusLabel(entry.status)}
            </Badge>
            {novelTitle && (
              <span className="max-w-[140px] truncate text-[10px] text-muted-foreground" title={novelTitle}>
                {novelTitle}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-foreground">{displayTitle}</p>
          {!expanded && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {content.trim() || "No notes yet."}
            </p>
          )}
          {entry.tags.length > 0 && !expanded && (
            <p className="text-[10px] text-muted-foreground">{entry.tags.map((t) => `#${t}`).join(" ")}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              stop(e);
              onUpdate(entry.id, { pinned: !entry.pinned });
            }}
            aria-label={entry.pinned ? "Unpin" : "Pin"}
          >
            {entry.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              stop(e);
              onDelete(entry.id);
            }}
            title="Archive idea (hidden from inbox; recoverable)"
            aria-label="Archive idea"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              stop(e);
              setExpanded((x) => !x);
            }}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : undefined}
          className="space-y-2 px-3 pb-3 pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={titleVal}
            onChange={(e) => onUpdate(entry.id, { title: e.target.value || "Untitled" })}
            placeholder="Title (optional)"
            className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={content}
            onChange={(e) => onUpdate(entry.id, { content: e.target.value })}
            placeholder="Write your idea here…"
            rows={6}
            className="min-h-[120px] max-h-[min(320px,50vh)] w-full resize-y overflow-y-auto rounded-md border border-border/60 bg-background p-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {entry.tags.length > 0 && (
            <p className="text-[10px] text-muted-foreground">{entry.tags.map((t) => `#${t}`).join(" ")}</p>
          )}

          {novels && onPatchEntry && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
              <span className="text-[10px] text-muted-foreground">Status</span>
              <Select
                value={entry.status}
                onValueChange={(v) => onPatchEntry(entry.id, { status: v as IdeaWebStatus })}
              >
                <SelectTrigger className="h-8 max-w-[160px] text-[10px]" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {ideaWebStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[10px] text-muted-foreground">Project</span>
              <Select
                value={entry.novelId ?? "__none__"}
                onValueChange={(v) => onPatchEntry(entry.id, { novelId: v === "__none__" ? null : v })}
              >
                <SelectTrigger className="h-8 min-w-[140px] max-w-[220px] text-[10px]" aria-label="Project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Inbox (unassigned)</SelectItem>
                  {novels.map((n) => (
                    <SelectItem key={n.id} value={n.id} className="text-xs">
                      {n.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Type</span>
            <Select
              value={entryCategory(entry)}
              onValueChange={(v) => onUpdate(entry.id, { category: v as Idea["category"] })}
            >
              <SelectTrigger className={cn("h-8 max-w-[200px] text-[10px]", cat.color)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IDEA_WEB_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {entry.novelId && (
            <div className="border-t border-border/50 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  openBookSandbox(entry.novelId);
                  navigate("/");
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Open in Sandbox
              </Button>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Opens this book and the Sandbox workspace (expansion tools).
              </p>
            </div>
          )}

          <IdeaWebRevisionPanel entryId={entry.id} />
        </motion.div>
      )}
    </motion.div>
  );
});
