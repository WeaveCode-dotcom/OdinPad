import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { createIdeaWebEntry } from "@/lib/idea-web/service";

export type HarvestDestination = "idea_web" | "codex" | "clipboard";

export function SandboxHarvestDialog({
  open,
  onOpenChange,
  defaultText = "",
  onHarvestSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultText?: string;
  /** Fired when content is saved to Idea Web or Codex (not clipboard). */
  onHarvestSuccess?: () => void;
}) {
  const { user } = useAuth();
  const { novels, addCodexEntry, activeNovel, refetchIdeaWeb } = useNovelContext();
  const [text, setText] = useState(defaultText);
  const [novelId, setNovelId] = useState<string>("");
  const [dest, setDest] = useState<HarvestDestination>("idea_web");
  const [codexType, setCodexType] = useState<"character" | "location" | "lore" | "faction" | "item">("lore");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!user?.id || !text.trim()) {
      toast({ title: "Add text to harvest", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (dest === "clipboard") {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
        trackEvent("sandbox_harvest", { dest: "clipboard" });
        onOpenChange(false);
        return;
      }
      if (dest === "idea_web") {
        await createIdeaWebEntry({
          userId: user.id,
          novelId: novelId || null,
          title: "Harvested from Sandbox",
          body: text.slice(0, 12000),
          ideaType: "misc",
          metadata: { source: "sandbox_harvest" },
        });
        await refetchIdeaWeb();
        toast({ title: "Saved to Idea Web" });
        trackEvent("sandbox_harvest", { dest: "idea_web" });
        onOpenChange(false);
        return;
      }
      if (dest === "codex") {
        const targetId = novelId || activeNovel?.id;
        if (!targetId || targetId !== activeNovel?.id) {
          toast({
            title: "Open the target book first",
            description: "From the dashboard, open the book you want, then harvest again.",
            variant: "destructive",
          });
          return;
        }
        const titleLine = text.split("\n")[0]?.slice(0, 120) || "Harvested note";
        addCodexEntry(codexType, titleLine);
        toast({
          title: "Codex stub added",
          description: "Switch to your book and open Story Wiki to edit the new entry.",
        });
        trackEvent("sandbox_harvest", { dest: "codex", type: codexType });
        onHarvestSuccess?.();
        onOpenChange(false);
      }
    } catch {
      toast({ title: "Harvest failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Harvest from Sandbox</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Promote a fragment to Idea Web, a Codex stub, or copy for your manuscript.
        </p>
        <div className="grid gap-2">
          <Label>Destination</Label>
          <Select value={dest} onValueChange={(v) => setDest(v as HarvestDestination)}>
            <SelectTrigger className="border border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idea_web">Idea Web entry</SelectItem>
              <SelectItem value="codex">Story Wiki (codex) stub</SelectItem>
              <SelectItem value="clipboard">Clipboard (for Manuscript)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {dest === "idea_web" && (
          <div className="grid gap-1">
            <Label>Attach to project (optional)</Label>
            <Select value={novelId || "__global__"} onValueChange={(v) => setNovelId(v === "__global__" ? "" : v)}>
              <SelectTrigger className="border border-border">
                <SelectValue placeholder="Global inbox" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">Global inbox</SelectItem>
                {novels.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {dest === "codex" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>Project</Label>
              <Select value={novelId || activeNovel?.id || ""} onValueChange={setNovelId}>
                <SelectTrigger className="border border-border">
                  <SelectValue placeholder="Book" />
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
            <div>
              <Label>Codex type</Label>
              <Select value={codexType} onValueChange={(v) => setCodexType(v as typeof codexType)}>
                <SelectTrigger className="border border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="character">Character</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="lore">Lore</SelectItem>
                  <SelectItem value="faction">Faction</SelectItem>
                  <SelectItem value="item">Item</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div className="grid gap-1">
          <Label>Content</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="border border-border" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void run()}>
            Harvest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
