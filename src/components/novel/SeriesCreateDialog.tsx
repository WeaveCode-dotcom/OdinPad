import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { createBookSeries, fetchBookSeriesForUser, type BookSeriesRow } from "@/lib/series-service";

export interface SeriesCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  analyticsSource: string;
  onSeriesCreated: (rows: BookSeriesRow[]) => void;
}

export function SeriesCreateDialog({
  open,
  onOpenChange,
  userId,
  analyticsSource,
  onSeriesCreated,
}: SeriesCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const submit = async () => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Series are saved to your account so you can link books to them.",
        variant: "destructive",
      });
      return;
    }
    const t = title.trim();
    if (!t) {
      toast({ title: "Enter a series title", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createBookSeries(userId, { title: t });
      const rows = await fetchBookSeriesForUser(userId);
      onSeriesCreated(rows);
      trackEvent("series_created", { source: analyticsSource });
      toast({
        title: "Series created",
        description: `"${t}" is ready — link books when you create or edit a project.`,
      });
      onOpenChange(false);
    } catch {
      toast({
        title: "Could not create series",
        description: "Check your connection and that the book_series table exists in Supabase.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New series</DialogTitle>
          <DialogDescription>
            Create a series on your account. Link books from New book (step 2) or when editing a project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground" htmlFor="series-create-title">
              Series title *
            </label>
            <Input
              ref={inputRef}
              id="series-create-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Thornhill Chronicles"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={creating || !title.trim()}
              onClick={() => void submit()}
            >
              {creating ? "Creating…" : "Create series"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
