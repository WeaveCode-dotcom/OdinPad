import { BookmarkPlus, Download, History, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { fetchIdeaWebRevisions } from "@/lib/idea-web/service";
import { cn } from "@/lib/utils";
import type { IdeaWebEntryRevision, IdeaWebRevisionTrigger } from "@/types/idea-web";

function triggerLabel(t: IdeaWebRevisionTrigger): string {
  switch (t) {
    case "edit_session":
      return "Edit";
    case "status_change":
      return "Status";
    case "manual_checkpoint":
      return "Checkpoint";
    case "map_move":
      return "Map";
    case "system":
      return "System";
    default:
      return t;
  }
}

export function IdeaWebRevisionPanel({ entryId }: { entryId: string }) {
  const { user } = useAuth();
  const { checkpointIdeaWebEntry, deleteIdeaWebEntryRevisions, restoreIdeaWebFromSnapshot, refetchIdeaWeb } =
    useNovelContext();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<IdeaWebEntryRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const r = await fetchIdeaWebRevisions(user.id, entryId);
      setRows(r);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, entryId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const onExport = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `idea-web-revisions-${entryId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onRestore = async (rev: IdeaWebEntryRevision) => {
    setBusy(true);
    try {
      await restoreIdeaWebFromSnapshot(entryId, rev.snapshot);
      await refetchIdeaWeb();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onCheckpoint = async () => {
    setBusy(true);
    try {
      await checkpointIdeaWebEntry(entryId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onDeleteAll = async () => {
    setBusy(true);
    try {
      await deleteIdeaWebEntryRevisions(entryId);
      setRows([]);
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-border/50 pt-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <History className="h-3.5 w-3.5" />
              Thread history
            </Button>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={busy}
            onClick={() => void onCheckpoint()}
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Save checkpoint
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={rows.length === 0}
            onClick={onExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
            disabled={rows.length === 0 || busy}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete all
          </Button>
        </div>

        <CollapsibleContent className="mt-2 space-y-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading history…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              No saved revisions yet. Checkpoints and edits appear here.
            </p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2 text-xs">
              {rows.map((rev) => (
                <li
                  key={rev.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-sm px-1 py-1 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <span className={cn("mr-2 rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium")}>
                      {triggerLabel(rev.trigger)}
                    </span>
                    <span className="text-muted-foreground">{new Date(rev.createdAt).toLocaleString()}</span>
                    <span className="ml-2 truncate text-foreground/90" title={rev.snapshot.title}>
                      {rev.snapshot.title?.trim() || "Untitled"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 gap-1 px-2 text-[10px]"
                    disabled={busy}
                    onClick={() => void onRestore(rev)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all revisions?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes stored thread history for this idea. Your current text is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onDeleteAll()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
