import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VirtualList } from "@/components/ui/virtual-list";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { invokeIdeaWebGroq } from "@/lib/idea-web/groq-editorial";
import { createIdeaWebEntry } from "@/lib/idea-web/service";
import {
  createBraindumpSession,
  deleteBraindumpSession,
  fetchBraindumpSessions,
  recordSandboxGamificationEvent,
  updateBraindumpSession,
} from "@/lib/sandbox/service";
import type { IdeaWebEntry } from "@/types/idea-web";
import type { SandboxBraindumpSession } from "@/types/sandbox";

function novelScopeToFilter(scope: "all" | "unassigned" | string): string | null | "all" {
  if (scope === "all") return "all";
  if (scope === "unassigned") return null;
  return scope;
}

export function BraindumpPanel({ novelScope }: { novelScope: "all" | "unassigned" | string }) {
  const { user } = useAuth();
  const { ideaWebEntries, refetchIdeaWeb } = useNovelContext();
  const [sessions, setSessions] = useState<SandboxBraindumpSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filter = novelScopeToFilter(novelScope);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await fetchBraindumpSessions(user.id, filter);
      setSessions(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[Sandbox] fetchBraindumpSessions failed:", e);
      const hint =
        /relation|does not exist|42P01/i.test(msg) || /schema cache/i.test(msg)
          ? "The sandbox tables are missing on this Supabase project. Run the migration file 20260323120000_sandbox_tables.sql (SQL Editor or npm run supabase:push)."
          : "Check the browser console for details. If tables are missing, apply the Sandbox migration to the same project as VITE_SUPABASE_URL.";
      toast({
        title: "Braindump unavailable",
        description: `${hint} (${msg.slice(0, 120)}${msg.length > 120 ? "…" : ""})`,
        variant: "destructive",
      });
    }
  }, [user?.id, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sessions.length === 0) {
      setActiveId(null);
      setTitle("");
      setBody("");
      return;
    }
    const still = activeId && sessions.some((s) => s.id === activeId);
    if (!still) {
      const s = sessions[0];
      setActiveId(s.id);
      setTitle(s.title);
      setBody(s.body);
    }
  }, [sessions, activeId]);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) ?? null, [sessions, activeId]);

  const scheduleSave = useCallback(() => {
    if (!user?.id || !activeId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateBraindumpSession(user.id, activeId, {
          title,
          body,
          novelId:
            novelScope === "all" || novelScope === "unassigned"
              ? novelScope === "unassigned"
                ? null
                : (active?.novelId ?? null)
              : novelScope,
        });
        setLastSavedAt(Date.now());
        const words = body.split(/\s+/).filter(Boolean).length;
        void recordSandboxGamificationEvent(user.id, "braindump_autosave", { words });
        trackEvent("sandbox_braindump_save", { words });
      } catch {
        /* ignore */
      }
    }, 3200);
  }, [user?.id, activeId, title, body, novelScope, active?.novelId]);

  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, body, scheduleSave]);

  const onSelectSession = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    setActiveId(id);
    setTitle(s.title);
    setBody(s.body);
  };

  const onNew = async () => {
    if (!user?.id) return;
    const novelId = novelScope === "all" ? null : novelScope === "unassigned" ? null : novelScope;
    try {
      const s = await createBraindumpSession({
        userId: user.id,
        novelId,
        title: "New braindump",
        body: "",
      });
      setSessions((prev) => [s, ...prev]);
      setActiveId(s.id);
      setTitle(s.title);
      setBody("");
      void recordSandboxGamificationEvent(user.id, "sandbox_session", { type: "braindump" });
      trackEvent("sandbox_braindump_new", {});
    } catch {
      toast({ title: "Could not create session", variant: "destructive" });
    }
  };

  const onDelete = async () => {
    if (!user?.id || !activeId) return;
    try {
      await deleteBraindumpSession(user.id, activeId);
      setSessions((prev) => prev.filter((s) => s.id !== activeId));
      setActiveId(null);
      setTitle("");
      setBody("");
      await load();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const pushToIdeaWeb = async () => {
    if (!user?.id || !body.trim()) {
      toast({ title: "Nothing to push", variant: "destructive" });
      return;
    }
    const novelId = novelScope === "all" ? null : novelScope === "unassigned" ? null : novelScope;
    try {
      await createIdeaWebEntry({
        userId: user.id,
        novelId,
        title: title.slice(0, 200) || "From Sandbox",
        body: body.slice(0, 12000),
        ideaType: "misc",
        metadata: { source: "sandbox_braindump", sessionId: activeId },
      });
      await refetchIdeaWeb();
      toast({ title: "Pushed to Idea Web" });
      trackEvent("sandbox_push_idea_web", {});
    } catch {
      toast({ title: "Push failed", variant: "destructive" });
    }
  };

  const importIdea = async (entry: IdeaWebEntry) => {
    setBody((prev) => (prev ? `${prev}\n\n---\n${entry.body}` : entry.body));
    setImportOpen(false);
    toast({ title: "Appended idea to braindump" });
  };

  const thinkWithMe = async () => {
    if (!body.trim()) {
      toast({
        title: "Write something first",
        description: "Add some text to get AI reflection questions.",
        variant: "destructive",
      });
      return;
    }
    setAiLoading(true);
    setAiQuestions(null);
    try {
      const { text } = await invokeIdeaWebGroq("expand", [{ title: title || "Braindump", body: body.slice(0, 3000) }]);
      setAiQuestions(text);
      trackEvent("sandbox_braindump_ai_reflect", {});
    } catch (e) {
      toast({
        title: "AI unavailable",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const ideasForImport = ideaWebEntries.slice(0, 200);
  const SESSION_VIRTUAL_THRESHOLD = 40;
  const IDEA_IMPORT_VIRTUAL_THRESHOLD = 45;

  return (
    <div className="flex min-h-[420px] flex-col gap-3 md:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-2 border-b border-border pb-3 md:w-56 md:border-b-0 md:border-r md:pb-0 md:pr-3">
        <Button type="button" size="sm" className="w-full" onClick={() => void onNew()}>
          New braindump
        </Button>
        <div className="max-h-48 text-sm">
          {sessions.length > SESSION_VIRTUAL_THRESHOLD ? (
            <VirtualList items={sessions} estimateRowHeight={40} maxHeight="12rem" className="text-sm">
              {(s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSession(s.id)}
                  className={`mb-1 w-full rounded-sm border px-2 py-1.5 text-left text-xs ${
                    s.id === activeId ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/60"
                  }`}
                >
                  {s.title || "Untitled"}
                </button>
              )}
            </VirtualList>
          ) : (
            <div className="overflow-y-auto">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSession(s.id)}
                  className={`mb-1 w-full rounded-sm border px-2 py-1.5 text-left text-xs ${
                    s.id === activeId ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/60"
                  }`}
                >
                  {s.title || "Untitled"}
                </button>
              ))}
            </div>
          )}
          {sessions.length === 0 && <p className="text-xs text-muted-foreground">No sessions yet — create one.</p>}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title"
            className="max-w-md border border-border"
          />
          <Button type="button" size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            Pull from Idea Web
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void pushToIdeaWeb()}>
            Push to Idea Web
          </Button>
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => void onDelete()}>
            Delete session
          </Button>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Stream-of-consciousness, research snippets, #tags — autosaves every few seconds."
          className="min-h-[320px] w-full resize-y rounded-md border border-border bg-background p-3 font-sans text-sm leading-relaxed"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5"
            disabled={aiLoading || !body.trim()}
            onClick={() => void thinkWithMe()}
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            )}
            Think with me
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {body.split(/\s+/).filter(Boolean).length} words
            {lastSavedAt != null &&
              ` · Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          </span>
        </div>
        {aiQuestions && (
          <div className="mt-3 rounded-md border-2 border-primary/30 bg-primary/5 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
                <Sparkles className="mr-1 inline-block h-3 w-3" aria-hidden />
                Thought prompts
              </p>
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => setAiQuestions(null)}
              >
                Dismiss
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">{aiQuestions}</pre>
          </div>
        )}
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from Idea Web</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1">
            {ideasForImport.length > IDEA_IMPORT_VIRTUAL_THRESHOLD ? (
              <VirtualList items={ideasForImport} estimateRowHeight={72} maxHeight="min(55vh, 420px)">
                {(e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="rounded-sm border border-border px-2 py-2 text-left text-xs hover:bg-muted/50"
                    onClick={() => void importIdea(e)}
                  >
                    <span className="font-medium">{e.title || "Untitled"}</span>
                    <span className="line-clamp-2 block text-muted-foreground">{e.body}</span>
                  </button>
                )}
              </VirtualList>
            ) : (
              ideasForImport.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="rounded-sm border border-border px-2 py-2 text-left text-xs hover:bg-muted/50"
                  onClick={() => void importIdea(e)}
                >
                  <span className="font-medium">{e.title || "Untitled"}</span>
                  <span className="line-clamp-2 block text-muted-foreground">{e.body}</span>
                </button>
              ))
            )}
            {ideasForImport.length === 0 && (
              <p className="text-sm text-muted-foreground">No ideas yet. Capture some in the Idea Web inbox.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
