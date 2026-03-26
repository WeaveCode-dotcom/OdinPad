import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { clearDraft, loadDraft, saveDraft } from "@/lib/form-drafts";
import { createIdeaWebEntry } from "@/lib/idea-web/service";

const DRAFT_FORM = "idea_web_quick_capture";

/** Global listener + modal for Cmd/Ctrl+Shift+I — always saves to inbox first (`novel_id` null). */
export function IdeaWebQuickCaptureHost() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("odinpad:idea-web-quick-capture", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("odinpad:idea-web-quick-capture", onOpen);
    };
  }, [user]);

  return <IdeaWebQuickCaptureDialog open={open} onOpenChange={setOpen} />;
}

export function IdeaWebQuickCaptureDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const { refetchIdeaWeb } = useNovelContext();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftNotice, setDraftNotice] = useState<{ savedAt: number } | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setBody("");
    setTagsRaw("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const d = loadDraft(user?.id, DRAFT_FORM);
    if (d?.data && (d.data.title || d.data.body || d.data.tagsRaw)) {
      setDraftNotice({ savedAt: d.savedAt });
      reset();
    } else {
      setDraftNotice(null);
      reset();
    }
  }, [open, user?.id, reset]);

  useEffect(() => {
    if (!open || !user?.id) return;
    const t = window.setTimeout(() => {
      if (title.trim() || body.trim() || tagsRaw.trim()) {
        saveDraft(user.id, DRAFT_FORM, { title, body, tagsRaw });
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [open, user?.id, title, body, tagsRaw]);

  const save = async () => {
    const text = body.trim();
    if (!text && !title.trim()) {
      toast({ title: "Add a title or body", variant: "destructive" });
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      const tags = tagsRaw
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      await createIdeaWebEntry({
        userId: user.id,
        novelId: null,
        title: title.trim() || text.slice(0, 120) || "Untitled",
        body: text,
        tags,
        ideaType: "misc",
      });
      trackEvent("idea_web_quick_capture", { scope: "inbox" });
      await refetchIdeaWeb();
      clearDraft(user?.id, DRAFT_FORM);
      setDraftNotice(null);
      toast({ title: "Saved to Idea Web inbox", description: "Assign to a project from Idea Web when you’re ready." });
      onOpenChange(false);
    } catch (e) {
      console.warn(e);
      toast({ title: "Could not save", description: "Try again or check your connection.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Quick capture</DialogTitle>
        </DialogHeader>
        {draftNotice && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-950"
            role="status"
          >
            <span>Unsaved draft from {new Date(draftNotice.savedAt).toLocaleString()}</span>
            <span className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => {
                  const d = loadDraft(user?.id, DRAFT_FORM);
                  if (d?.data) {
                    setTitle(d.data.title ?? "");
                    setBody(d.data.body ?? "");
                    setTagsRaw(d.data.tagsRaw ?? "");
                  }
                  setDraftNotice(null);
                }}
              >
                Resume draft
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  clearDraft(user?.id, DRAFT_FORM);
                  setDraftNotice(null);
                  reset();
                }}
              >
                Discard
              </Button>
            </span>
          </div>
        )}
        <div className="grid gap-3 py-2">
          <div className="grid gap-1">
            <Label htmlFor="iw-title">Title</Label>
            <Input
              id="iw-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short label"
              className="border border-border"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="iw-body">Idea</Label>
            <textarea
              id="iw-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What’s on your mind?"
              rows={4}
              className="min-h-[100px] w-full resize-y border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="iw-tags">Tags (comma-separated)</Label>
            <Input
              id="iw-tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="fantasy, twist, character"
              className="border border-border"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Goes to your Idea Web inbox. You can attach a project there.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="border border-border" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="border border-border" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
