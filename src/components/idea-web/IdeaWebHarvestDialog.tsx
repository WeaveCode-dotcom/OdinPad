import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { clearDraft, loadDraft, saveDraft } from "@/lib/form-drafts";
import { createNovelWithOptions } from "@/lib/novel-store";

export function IdeaWebHarvestDialog({
  open,
  onOpenChange,
  entryIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entryIds: string[];
  onDone?: () => void;
}) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { novels, harvestIdeaWebEntries, importNovel, ideaWebEntries, setActiveNovel } = useNovelContext();
  const { schedule } = useUndoableAction();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [targetId, setTargetId] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [prefillPremise, setPrefillPremise] = useState(false);
  const [addCodex, setAddCodex] = useState(true);
  const [harvestShelfLabel, setHarvestShelfLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftNotice, setDraftNotice] = useState<{ savedAt: number } | null>(null);

  const harvestFormId = useMemo(() => `idea_web_harvest_${[...entryIds].sort().join("_")}`, [entryIds]);

  const selectedEntries = useMemo(
    () =>
      entryIds
        .map((id) => ideaWebEntries.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => e != null),
    [entryIds, ideaWebEntries],
  );

  const destinationTitle = useMemo(() => {
    if (mode === "existing") {
      const n = novels.find((x) => x.id === targetId);
      return n?.title ?? "this project";
    }
    return newTitle.trim() || "New novel";
  }, [mode, novels, targetId, newTitle]);

  const suggestedPremise = useMemo(
    () =>
      selectedEntries
        .map((e) => e.body.trim())
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 8000),
    [selectedEntries],
  );

  useEffect(() => {
    if (!open) return;
    const d = loadDraft(user?.id, harvestFormId);
    if (d?.data && (d.data.mode === "existing" || d.data.mode === "new")) {
      setDraftNotice({ savedAt: d.savedAt });
      setMode(d.data.mode === "new" ? "new" : "existing");
      setTargetId(d.data.targetId ?? "");
      setNewTitle(d.data.newTitle ?? "");
      setNewAuthor(d.data.newAuthor ?? "");
      setPrefillPremise(d.data.prefillPremise === "1");
      setAddCodex(d.data.addCodex !== "0");
      setHarvestShelfLabel(d.data.harvestShelfLabel ?? "");
    } else {
      setDraftNotice(null);
      const t =
        selectedEntries[0]?.title?.trim() && selectedEntries[0].title !== "New idea"
          ? selectedEntries[0].title.slice(0, 120)
          : "New novel";
      setNewTitle(t);
      setNewAuthor(profile?.display_name?.trim() || "Author");
      setPrefillPremise(false);
      if (novels.length === 0) setMode("new");
    }
  }, [open, harvestFormId, selectedEntries, novels.length, profile?.display_name, user?.id]);

  useEffect(() => {
    if (!open || !user?.id) return;
    const t = window.setTimeout(() => {
      saveDraft(user.id, harvestFormId, {
        mode,
        targetId,
        newTitle,
        newAuthor,
        prefillPremise: prefillPremise ? "1" : "0",
        addCodex: addCodex ? "1" : "0",
        harvestShelfLabel,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [open, user?.id, harvestFormId, mode, targetId, newTitle, newAuthor, prefillPremise, addCodex, harvestShelfLabel]);

  const commitHarvest = async () => {
    if (entryIds.length === 0) {
      toast({ title: "No ideas selected", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const shelfOpts = { addCodexStubs: addCodex, harvestShelfLabel: harvestShelfLabel.trim() || undefined };
      let harvestNovelId: string;
      if (mode === "existing") {
        if (!targetId) {
          toast({ title: "Pick a project", variant: "destructive" });
          return;
        }
        harvestNovelId = targetId;
        await harvestIdeaWebEntries(entryIds, targetId, shelfOpts);
      } else {
        const title = newTitle.trim() || "New novel";
        const author = newAuthor.trim() || "Author";
        const novel = createNovelWithOptions(title, author, {
          premise: prefillPremise && suggestedPremise ? suggestedPremise : undefined,
        });
        importNovel(novel);
        harvestNovelId = novel.id;
        await harvestIdeaWebEntries(entryIds, novel.id, shelfOpts);
      }
      clearDraft(user?.id, harvestFormId);
      setDraftNotice(null);
      const harvestTitle =
        mode === "existing"
          ? (novels.find((n) => n.id === harvestNovelId)?.title ?? "your project")
          : newTitle.trim() || "New novel";
      toast({
        title: "Harvested",
        description: `${entryIds.length} idea${entryIds.length === 1 ? "" : "s"} linked to "${harvestTitle}"`,
        action: (
          <ToastAction
            altText="Open project"
            onClick={() => {
              setActiveNovel(harvestNovelId);
              navigate("/");
            }}
          >
            Open project
          </ToastAction>
        ),
      });
      onOpenChange(false);
      onDone?.();
    } catch {
      toast({ title: "Harvest failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onHarvestClick = () => {
    if (entryIds.length === 0) {
      toast({ title: "No ideas selected", variant: "destructive" });
      return;
    }
    if (mode === "existing" && novels.length > 0 && !targetId) {
      toast({ title: "Pick a project", variant: "destructive" });
      return;
    }
    schedule(commitHarvest, { message: "Harvest will run in a few seconds…", undoLabel: "Undo" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Harvest to project</DialogTitle>
        </DialogHeader>
        <p id="harvest-dialog-desc" className="text-sm text-muted-foreground">
          Move {entryIds.length} selected idea(s) into a manuscript. Status becomes &quot;harvested&quot; and links to
          this book.
        </p>
        {draftNotice && (
          <p className="text-xs text-muted-foreground">
            Unsaved form draft saved {new Date(draftNotice.savedAt).toLocaleString()}.{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                clearDraft(user?.id, harvestFormId);
                setDraftNotice(null);
              }}
            >
              Discard draft
            </button>
          </p>
        )}
        <div
          className="rounded-md border border-teal-600/30 bg-teal-50/80 px-3 py-2 text-sm text-teal-950 dark:bg-teal-950/30 dark:text-teal-50"
          role="status"
        >
          <span className="font-semibold">Destination: </span>
          <span>{destinationTitle}</span>
          {harvestShelfLabel.trim() ? (
            <span className="block text-xs font-normal opacity-90">Shelf / tag: {harvestShelfLabel.trim()}</span>
          ) : null}
        </div>
        <div className="grid gap-3 py-2">
          {novels.length > 0 && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "existing" ? "default" : "outline"}
                onClick={() => setMode("existing")}
              >
                Existing book
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "new" ? "default" : "outline"}
                onClick={() => setMode("new")}
              >
                Create new book
              </Button>
            </div>
          )}

          {mode === "existing" && novels.length > 0 && (
            <div className="grid gap-1">
              <Label>Destination project</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="border border-border">
                  <SelectValue placeholder="Choose a book" />
                </SelectTrigger>
                <SelectContent>
                  {novels.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(mode === "new" || novels.length === 0) && (
            <>
              <div className="grid gap-1">
                <Label htmlFor="iw-harvest-title">New book title</Label>
                <Input
                  id="iw-harvest-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Working title"
                  className="border border-border"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="iw-harvest-author">Author name</Label>
                <Input
                  id="iw-harvest-author"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Pen name"
                  className="border border-border"
                />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={prefillPremise}
                  onCheckedChange={(v) => setPrefillPremise(Boolean(v))}
                  className="mt-0.5"
                />
                <span>Prefill premise from selected idea bodies (you can edit the book later).</span>
              </label>
            </>
          )}

          <div className="grid gap-1">
            <Label htmlFor="iw-harvest-shelf">Optional shelf or tag</Label>
            <Input
              id="iw-harvest-shelf"
              value={harvestShelfLabel}
              onChange={(e) => setHarvestShelfLabel(e.target.value)}
              placeholder="e.g. Act I, subplot"
              className="border border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              Stored on harvested ideas so you remember why you moved them.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={addCodex} onCheckedChange={(v) => setAddCodex(Boolean(v))} />
            Add Codex stubs for character / world ideas
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="border border-border" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="border border-border"
            disabled={busy}
            onClick={onHarvestClick}
            aria-describedby="harvest-dialog-desc"
          >
            {busy ? "Working…" : "Harvest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
