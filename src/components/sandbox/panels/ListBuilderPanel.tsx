import { Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VirtualList } from "@/components/ui/virtual-list";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import {
  createListItem,
  createSandboxList,
  deleteListItem,
  deleteSandboxList,
  fetchListItems,
  fetchSandboxLists,
  recordSandboxGamificationEvent,
  updateListItem,
} from "@/lib/sandbox/service";
import type { SandboxList, SandboxListItem } from "@/types/sandbox";

const LIST_TYPES: { id: string; label: string }[] = [
  { id: "character_names", label: "Character names" },
  { id: "plot_points", label: "Plot points" },
  { id: "worldbuilding", label: "Worldbuilding" },
  { id: "dialogue_snippets", label: "Dialogue snippets" },
  { id: "sensory_details", label: "Sensory details" },
];

function scopeNovelId(scope: "all" | "unassigned" | string): string | null {
  if (scope === "all") return null;
  if (scope === "unassigned") return null;
  return scope;
}

export function ListBuilderPanel({ novelScope }: { novelScope: "all" | "unassigned" | string }) {
  const { user } = useAuth();
  const [lists, setLists] = useState<SandboxList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [items, setItems] = useState<SandboxListItem[]>([]);
  const [newLine, setNewLine] = useState("");
  const filter = novelScope === "all" ? "all" : novelScope === "unassigned" ? null : novelScope;

  const loadLists = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await fetchSandboxLists(user.id, filter);
      setLists(rows);
    } catch {
      toast({ title: "Lists unavailable", variant: "destructive" });
    }
  }, [user?.id, filter]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  const loadItems = useCallback(async () => {
    if (!user?.id || !activeListId) {
      setItems([]);
      return;
    }
    try {
      const rows = await fetchListItems(user.id, activeListId);
      setItems(rows);
    } catch {
      setItems([]);
    }
  }, [user?.id, activeListId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const onCreateList = async (listType: string) => {
    if (!user?.id) return;
    try {
      const l = await createSandboxList({
        userId: user.id,
        novelId: scopeNovelId(novelScope),
        name: LIST_TYPES.find((t) => t.id === listType)?.label ?? "List",
        listType,
      });
      setLists((prev) => [l, ...prev]);
      setActiveListId(l.id);
      void recordSandboxGamificationEvent(user.id, "sandbox_list_created", { listType });
      trackEvent("sandbox_list_new", { listType });
    } catch {
      toast({ title: "Could not create list", variant: "destructive" });
    }
  };

  const onAddItem = async () => {
    if (!user?.id || !activeListId || !newLine.trim()) return;
    try {
      const it = await createListItem({
        userId: user.id,
        listId: activeListId,
        content: newLine.trim(),
      });
      setItems((prev) => [...prev, it]);
      setNewLine("");
      void recordSandboxGamificationEvent(user.id, "list_item", {});
    } catch {
      toast({ title: "Could not add line", variant: "destructive" });
    }
  };

  const toggleFav = async (it: SandboxListItem) => {
    if (!user?.id) return;
    try {
      await updateListItem(user.id, it.id, { favorite: !it.favorite });
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, favorite: !it.favorite } : x)));
    } catch {
      /* ignore */
    }
  };

  const onRemoveItem = async (id: string) => {
    if (!user?.id) return;
    try {
      await deleteListItem(user.id, id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      toast({ title: "Remove failed", variant: "destructive" });
    }
  };

  const onDeleteList = async () => {
    if (!user?.id || !activeListId) return;
    try {
      await deleteSandboxList(user.id, activeListId);
      setActiveListId(null);
      await loadLists();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const activeList = lists.find((l) => l.id === activeListId);
  const LIST_SIDEBAR_VIRTUAL_THRESHOLD = 28;
  const ITEMS_VIRTUAL_THRESHOLD = 50;

  return (
    <div className="flex min-h-[400px] flex-col gap-3 md:flex-row">
      <aside className="w-full shrink-0 space-y-2 border-b border-border pb-3 md:w-52 md:border-b-0 md:border-r md:pb-0 md:pr-3">
        <Select onValueChange={(v) => void onCreateList(v)}>
          <SelectTrigger className="border border-border text-xs">
            <SelectValue placeholder="New list…" />
          </SelectTrigger>
          <SelectContent>
            {LIST_TYPES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="max-h-56 text-xs">
          {lists.length > LIST_SIDEBAR_VIRTUAL_THRESHOLD ? (
            <VirtualList items={lists} estimateRowHeight={44} maxHeight="14rem">
              {(l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setActiveListId(l.id)}
                  className={`mb-1 w-full rounded-sm border px-2 py-1.5 text-left ${
                    l.id === activeListId ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/60"
                  }`}
                >
                  {l.name}
                  <span className="ml-1 text-muted-foreground">({l.listType})</span>
                </button>
              )}
            </VirtualList>
          ) : (
            <div className="overflow-y-auto">
              {lists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setActiveListId(l.id)}
                  className={`mb-1 w-full rounded-sm border px-2 py-1.5 text-left ${
                    l.id === activeListId ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/60"
                  }`}
                >
                  {l.name}
                  <span className="ml-1 text-muted-foreground">({l.listType})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {!activeList ? (
          <p className="text-sm text-muted-foreground">Create a list type above, then add lines.</p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{activeList.name}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive h-7"
                onClick={() => void onDeleteList()}
              >
                Delete list
              </Button>
            </div>
            <div className="mb-2 flex gap-2">
              <Input
                value={newLine}
                onChange={(e) => setNewLine(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void onAddItem()}
                placeholder="Add a line…"
                className="border border-border"
              />
              <Button type="button" size="sm" onClick={() => void onAddItem()}>
                Add
              </Button>
            </div>
            <div className="max-h-[min(50vh,420px)] rounded-md border border-border p-2">
              {items.length > ITEMS_VIRTUAL_THRESHOLD ? (
                <VirtualList items={items} estimateRowHeight={40} maxHeight="min(50vh,420px)">
                  {(it) => (
                    <div className="flex items-start gap-2 rounded-sm px-2 py-1 hover:bg-muted/40">
                      <button
                        type="button"
                        className="mt-0.5 text-muted-foreground hover:text-primary"
                        onClick={() => void toggleFav(it)}
                        title="Favorite"
                      >
                        <Star className={`h-4 w-4 ${it.favorite ? "fill-primary text-primary" : ""}`} />
                      </button>
                      <span className="flex-1 text-sm">{it.content}</span>
                      <button
                        type="button"
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                        onClick={() => void onRemoveItem(it.id)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </VirtualList>
              ) : (
                <div className="space-y-1 overflow-y-auto">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-start gap-2 rounded-sm px-2 py-1 hover:bg-muted/40">
                      <button
                        type="button"
                        className="mt-0.5 text-muted-foreground hover:text-primary"
                        onClick={() => void toggleFav(it)}
                        title="Favorite"
                      >
                        <Star className={`h-4 w-4 ${it.favorite ? "fill-primary text-primary" : ""}`} />
                      </button>
                      <span className="flex-1 text-sm">{it.content}</span>
                      <button
                        type="button"
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                        onClick={() => void onRemoveItem(it.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {items.length === 0 && <p className="text-xs text-muted-foreground">No lines yet.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
