import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { type BookSeriesRow, createBookSeries, fetchBookSeriesForUser } from "@/lib/series-service";

interface BookSeriesPickerProps {
  userId: string | undefined;
  value: string;
  onChange: (seriesId: string, seriesTitle?: string) => void;
}

export function BookSeriesPicker({ userId, value, onChange }: BookSeriesPickerProps) {
  const [list, setList] = useState<BookSeriesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setList([]);
      setLoadFailed(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    try {
      const rows = await fetchBookSeriesForUser(userId);
      setList(rows);
    } catch (e) {
      setList([]);
      setLoadFailed(true);
      console.warn("OdinPad: could not load book_series (table missing, network, or RLS).", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!userId || !title) {
      toast({ title: "Sign in to create a series", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const row = await createBookSeries(userId, { title });
      setNewTitle("");
      setList((prev) => [...prev, row].sort((a, b) => a.title.localeCompare(b.title)));
      onChange(row.id, row.title);
      toast({ title: "Series created", description: row.title });
    } catch {
      toast({ title: "Could not create series", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      {loadFailed && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-950 dark:text-amber-100">
          Series list unavailable. You can still create the book; apply the{" "}
          <code className="rounded bg-black/5 px-1">book_series</code> migration in Supabase to enable series, or try
          again later.
        </p>
      )}
      <div>
        <label className="mb-1.5 block text-sm text-muted-foreground">Series</label>
        <Select
          value={value || "__none__"}
          onValueChange={(v) => {
            if (v === "__none__") onChange("");
            else {
              const row = list.find((r) => r.id === v);
              onChange(v, row?.title);
            }
          }}
          disabled={!userId || (loading && !loadFailed)}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                !userId
                  ? "Sign in to link a series"
                  : loading && !loadFailed
                    ? "Loading…"
                    : loadFailed
                      ? "Standalone (no series)"
                      : "Standalone (no series)"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Standalone (no series)</SelectItem>
            {list.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {userId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-xs text-muted-foreground">New series</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Series title"
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1"
            disabled={creating || !newTitle.trim()}
            onClick={() => void handleCreate()}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
