import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { EXPANSION_METHODS, EXPANSION_TEMPLATES } from "@/lib/sandbox/expansion-templates";
import { fetchExpansionSessions, saveExpansionSession } from "@/lib/sandbox/service";
import type { ExpansionTemplateId, SandboxExpansionSession } from "@/types/sandbox";

function novelIdFromScope(scope: "all" | "unassigned" | string): string | null {
  if (scope === "all" || scope === "unassigned") return null;
  return scope;
}

export function ExpansionCanvasPanel({ novelScope }: { novelScope: "all" | "unassigned" | string }) {
  const { user } = useAuth();
  const { ideaWebEntries, addCodexEntry, activeNovel } = useNovelContext();
  const [templateId, setTemplateId] = useState<ExpansionTemplateId>("character");
  const [ideaId, setIdeaId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<string[]>(["questions"]);
  const [sessions, setSessions] = useState<SandboxExpansionSession[]>([]);

  const tpl = EXPANSION_TEMPLATES[templateId];

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const scope = novelScope === "all" ? "all" : novelScope === "unassigned" ? null : novelScope;
      const rows = await fetchExpansionSessions(user.id, scope);
      setSessions(rows);
    } catch {
      /* ignore */
    }
  }, [user?.id, novelScope]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const applyIdeaSeed = () => {
    const idea = ideaWebEntries.find((e) => e.id === ideaId);
    if (!idea) return;
    const next = { ...content };
    next.core = next.core ? next.core : idea.body.slice(0, 4000);
    setContent(next);
  };

  const save = async () => {
    if (!user?.id) return;
    try {
      const s = await saveExpansionSession(user.id, {
        id: sessionId ?? undefined,
        novelId: novelIdFromScope(novelScope),
        elementType: templateId,
        sourceIdeaId: ideaId || null,
        templateId,
        expandedContent: { ...content },
        metadata: { methods },
      });
      setSessionId(s.id);
      toast({ title: "Expansion saved" });
      trackEvent("sandbox_expansion_save", { templateId });
      void loadSessions();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const loadSession = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    setSessionId(s.id);
    setTemplateId(s.templateId as ExpansionTemplateId);
    setContent((s.expandedContent as Record<string, string>) ?? {});
    const meta = s.metadata as { methods?: string[] };
    setMethods(Array.isArray(meta?.methods) ? meta.methods : ["questions"]);
    if (s.sourceIdeaId) setIdeaId(s.sourceIdeaId);
  };

  const promoteToCodex = () => {
    if (!activeNovel) {
      toast({ title: "Open a project from the dashboard first", variant: "destructive" });
      return;
    }
    const name =
      (content.core || content.physical || content.goal || tpl.label + " beat").slice(0, 120) || "Sandbox note";
    const type =
      templateId === "character"
        ? "character"
        : templateId === "location"
          ? "location"
          : templateId === "faction"
            ? "faction"
            : "lore";
    addCodexEntry(type, name);
    toast({
      title: "Codex stub added",
      description: "Open your book → Canvas → Codex to paste details from this expansion.",
    });
    trackEvent("sandbox_promote_codex", { templateId });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={templateId} onValueChange={(v) => setTemplateId(v as ExpansionTemplateId)}>
            <SelectTrigger className="w-[200px] border border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(EXPANSION_TEMPLATES) as ExpansionTemplateId[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {EXPANSION_TEMPLATES[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ideaId || "__none__"} onValueChange={(v) => setIdeaId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="w-[220px] border border-border">
              <SelectValue placeholder="Idea Web seed" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {ideaWebEntries.slice(0, 100).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {(e.title || e.body).slice(0, 40)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" onClick={applyIdeaSeed}>
            Fill from idea
          </Button>
          <Button type="button" size="sm" onClick={() => void save()}>
            Save expansion
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={promoteToCodex}>
            Promote to Codex
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Expansion methods (track how you&apos;re thinking — all optional):
        </p>
        <div className="flex flex-wrap gap-3">
          {EXPANSION_METHODS.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={methods.includes(m.id)}
                onCheckedChange={(checked) => {
                  setMethods((prev) => (checked ? [...prev, m.id] : prev.filter((x) => x !== m.id)));
                }}
              />
              {m.label}
            </label>
          ))}
        </div>
        <div className="space-y-3">
          {tpl.fields.map((f) => (
            <div key={f.id}>
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">{f.label}</label>
              {f.multiline ? (
                <Textarea
                  className="mt-1 border border-border"
                  rows={4}
                  value={content[f.id] ?? ""}
                  onChange={(e) => setContent((c) => ({ ...c, [f.id]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              ) : (
                <Input
                  className="mt-1 border border-border"
                  value={content[f.id] ?? ""}
                  onChange={(e) => setContent((c) => ({ ...c, [f.id]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <aside className="rounded-md border border-border p-3">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Recent sessions</p>
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1 text-left hover:bg-muted/60"
                onClick={() => loadSession(s.id)}
              >
                {s.templateId} · {new Date(s.updatedAt).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
