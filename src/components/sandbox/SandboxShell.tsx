import { Sparkles, Wheat } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import BrainstormView from "@/components/novel/BrainstormView";
import { BraindumpPanel } from "@/components/sandbox/panels/BraindumpPanel";
import { ConversationalBrainstormPanel } from "@/components/sandbox/panels/ConversationalBrainstormPanel";
import { ExpansionCanvasPanel } from "@/components/sandbox/panels/ExpansionCanvasPanel";
import { ListBuilderPanel } from "@/components/sandbox/panels/ListBuilderPanel";
import { PromptEnginePanel } from "@/components/sandbox/panels/PromptEnginePanel";
import { VisualSandboxPanel } from "@/components/sandbox/panels/VisualSandboxPanel";
import { SandboxHarvestDialog } from "@/components/sandbox/SandboxHarvestDialog";
import { SandboxInsightsCard } from "@/components/sandbox/SandboxInsightsCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNovelContext } from "@/contexts/NovelContext";

export type NovelScope = "all" | "unassigned" | string;

type SandboxShellProps = {
  /** When set, scope is fixed to this book: no project switcher, no route changes. Used inside NovelWorkspace Sandbox mode. */
  lockedNovelId?: string;
};

export function SandboxShell({ lockedNovelId }: SandboxShellProps) {
  const navigate = useNavigate();
  const { novels, setActiveNovel, activeNovel, setMode, goToDashboard } = useNovelContext();
  const inBook = Boolean(lockedNovelId);

  const [scope, setScope] = useState<NovelScope>(() => lockedNovelId ?? "all");
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [scratch, setScratch] = useState("");
  const [sessionSummaryOpen, setSessionSummaryOpen] = useState(false);
  const [sessionStats, setSessionStats] = useState({ harvests: 0, tabSwitches: 0 });
  const scratchTouchedRef = useRef(false);
  const skipTabCountRef = useRef(true);

  useEffect(() => {
    if (lockedNovelId) setScope(lockedNovelId);
  }, [lockedNovelId]);

  const scopeLabel = useMemo(() => {
    if (inBook) {
      return novels.find((n) => n.id === lockedNovelId)?.title ?? "This book";
    }
    if (scope === "all") return "All projects";
    if (scope === "unassigned") return "Unassigned only";
    return novels.find((n) => n.id === scope)?.title ?? "Project";
  }, [scope, novels, inBook, lockedNovelId]);

  const onScopeChange = (v: string) => {
    if (inBook) return;
    if (v === "all" || v === "unassigned") {
      setScope(v);
      return;
    }
    setScope(v);
    setActiveNovel(v);
  };

  const title = "Sandbox";
  const subtitle = inBook
    ? `Expansion tools for this book · ${scopeLabel}`
    : `Creative expansion engine · ${scopeLabel}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!inBook && (
            <Select value={scope} onValueChange={onScopeChange}>
              <SelectTrigger className="w-[220px] border border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                <SelectItem value="unassigned">Unassigned only</SelectItem>
                {novels.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => setHarvestOpen(true)}>
            Harvest…
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setSessionSummaryOpen(true)}>
            End session
          </Button>
        </div>
      </div>

      <SandboxInsightsCard />

      <ResizablePanelGroup direction="horizontal" className="min-h-[520px] rounded-lg border border-border">
        <ResizablePanel defaultSize={72} minSize={45}>
          <Tabs
            defaultValue="braindump"
            className="flex h-full min-h-[480px] flex-col p-3"
            onValueChange={() => {
              if (skipTabCountRef.current) {
                skipTabCountRef.current = false;
                return;
              }
              setSessionStats((s) => ({ ...s, tabSwitches: s.tabSwitches + 1 }));
            }}
          >
            <TabsList className="mb-3 flex h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
              <TabsTrigger value="braindump" className="text-xs">
                Braindump
              </TabsTrigger>
              <TabsTrigger value="lists" className="text-xs">
                List builder
              </TabsTrigger>
              <TabsTrigger value="visual" className="text-xs">
                Visual
              </TabsTrigger>
              <TabsTrigger value="prompts" className="text-xs">
                Prompt engine
              </TabsTrigger>
              <TabsTrigger value="expansion" className="text-xs">
                Expansion
              </TabsTrigger>
              <TabsTrigger value="conversation" className="text-xs">
                Conversation
              </TabsTrigger>
              {inBook && (
                <TabsTrigger value="quicknotes" className="text-xs">
                  Quick notes
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="braindump" className="mt-0 flex-1 overflow-auto">
              <BraindumpPanel novelScope={scope} />
            </TabsContent>
            <TabsContent value="lists" className="mt-0 flex-1 overflow-auto">
              <ListBuilderPanel novelScope={scope} />
            </TabsContent>
            <TabsContent value="visual" className="mt-0 flex-1 overflow-auto">
              <VisualSandboxPanel novelScope={scope} />
            </TabsContent>
            <TabsContent value="prompts" className="mt-0 flex-1 overflow-auto">
              <PromptEnginePanel novelScope={scope} />
            </TabsContent>
            <TabsContent value="expansion" className="mt-0 flex-1 overflow-auto">
              <ExpansionCanvasPanel novelScope={scope} />
            </TabsContent>
            <TabsContent value="conversation" className="mt-0 flex-1 overflow-auto">
              <ConversationalBrainstormPanel novelScope={scope} />
            </TabsContent>
            {inBook && (
              <TabsContent value="quicknotes" className="mt-0 flex-1 overflow-hidden">
                <BrainstormView />
              </TabsContent>
            )}
          </Tabs>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={28} minSize={18}>
          <div className="flex h-full flex-col gap-2 border-l border-border bg-muted/10 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Wheat className="h-4 w-4" />
              Split · Manuscript scratch
            </div>
            <p className="text-[10px] text-muted-foreground">
              Side space for paste from Sandbox. Active book: {activeNovel?.title ?? "—"}
            </p>
            <textarea
              value={scratch}
              onChange={(e) => {
                if (e.target.value.trim()) scratchTouchedRef.current = true;
                setScratch(e.target.value);
              }}
              placeholder="Notes for your next drafting session…"
              className="min-h-[200px] flex-1 resize-none rounded-md border border-border bg-background p-2 text-sm"
            />
            {inBook ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => setMode("canvas")}>
                  Switch to Canvas
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => goToDashboard()}>
                  All books
                </Button>
              </div>
            ) : (
              <Button type="button" size="sm" variant="secondary" onClick={() => navigate("/")}>
                Open workspace
              </Button>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <SandboxHarvestDialog
        open={harvestOpen}
        onOpenChange={setHarvestOpen}
        onHarvestSuccess={() => setSessionStats((s) => ({ ...s, harvests: s.harvests + 1 }))}
      />

      <Dialog open={sessionSummaryOpen} onOpenChange={setSessionSummaryOpen}>
        <DialogContent className="border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sandbox session</DialogTitle>
          </DialogHeader>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Harvests completed: {sessionStats.harvests}</li>
            <li>Other tools opened: {sessionStats.tabSwitches}</li>
            <li>Scratch pad: {scratchTouchedRef.current ? "has notes" : "empty"}</li>
          </ul>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (scratch.trim()) {
                  void navigator.clipboard.writeText(scratch);
                }
              }}
            >
              Copy scratch
            </Button>
            <Button type="button" onClick={() => navigate("/inbox")}>
              Open Idea Web
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
