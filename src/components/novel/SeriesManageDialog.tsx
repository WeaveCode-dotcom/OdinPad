import { useEffect, useRef, useState } from "react";

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { type BookSeriesRow, deleteBookSeries, fetchBookSeriesForUser, updateBookSeries } from "@/lib/series-service";
import type { Novel } from "@/types/novel";

export interface SeriesManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  series: BookSeriesRow | null;
  novels: Novel[];
  analyticsSource: string;
  onSeriesUpdated: (rows: BookSeriesRow[]) => void;
  onSeriesDeleted: (deletedId: string) => void;
  onRefreshNovelSeriesTitles: (seriesId: string, newTitle: string) => void;
}

export function SeriesManageDialog({
  open,
  onOpenChange,
  userId,
  series,
  novels,
  analyticsSource,
  onSeriesUpdated,
  onSeriesDeleted,
  onRefreshNovelSeriesTitles,
}: SeriesManageDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && series) {
      setTitle(series.title);
      setDescription(series.description ?? "");
      queueMicrotask(() => titleRef.current?.focus());
    }
  }, [open, series]);

  const linkedCount = series ? novels.filter((n) => n.seriesId === series.id).length : 0;

  const handleSave = async () => {
    if (!userId || !series) return;
    const t = title.trim();
    if (!t) {
      toast({ title: "Series title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateBookSeries(userId, series.id, {
        title: t,
        description: description.trim() || null,
      });
      const rows = await fetchBookSeriesForUser(userId);
      onSeriesUpdated(rows);
      if (t !== series.title) {
        onRefreshNovelSeriesTitles(series.id, t);
      }
      trackEvent("series_updated", { source: analyticsSource });
      toast({ title: "Series saved", description: `"${t}" was updated.` });
      onOpenChange(false);
    } catch {
      toast({
        title: "Could not save series",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !series) return;
    setDeleting(true);
    try {
      await deleteBookSeries(userId, series.id);
      const rows = await fetchBookSeriesForUser(userId);
      onSeriesUpdated(rows);
      onSeriesDeleted(series.id);
      trackEvent("series_deleted", { source: analyticsSource, linkedBooks: linkedCount });
      toast({
        title: "Series removed",
        description:
          linkedCount > 0
            ? `${linkedCount} book${linkedCount === 1 ? "" : "s"} unlinked from this series (books were not deleted).`
            : "Empty series deleted.",
      });
      setDeleteOpen(false);
      onOpenChange(false);
    } catch {
      toast({
        title: "Could not delete series",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage series</DialogTitle>
            <DialogDescription>
              Rename or describe this series. Deleting removes the series only — books stay in your library as
              standalone (volume order is cleared).
            </DialogDescription>
          </DialogHeader>
          {series && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground" htmlFor="series-manage-title">
                  Title *
                </label>
                <Input
                  ref={titleRef}
                  id="series-manage-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSave();
                  }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground" htmlFor="series-manage-desc">
                  Description (optional)
                </label>
                <Textarea
                  id="series-manage-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional blurb for your reference"
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete series…
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-teal-600 hover:bg-teal-700"
                    disabled={saving || !title.trim()}
                    onClick={() => void handleSave()}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{series?.title}”?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {linkedCount === 0
                  ? "This series has no linked books. It will be removed from your shelf."
                  : `${linkedCount} book${linkedCount === 1 ? "" : "s"} in this series will be unlinked. Books are not deleted; they become standalone and lose volume order on the shelf.`}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete series"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
