import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { pickDailySeedPrompt, SANDBOX_CORE_PROMPTS } from "@/lib/sandbox/prompts";
import { createPromptEvent, fetchRecentPromptKeys, getOrCreateDailySeed } from "@/lib/sandbox/service";

function novelIdFromScope(scope: "all" | "unassigned" | string): string | null {
  if (scope === "all" || scope === "unassigned") return null;
  return scope;
}

export function PromptEnginePanel({ novelScope }: { novelScope: "all" | "unassigned" | string }) {
  const { user } = useAuth();
  const { novels, ideaWebEntries } = useNovelContext();
  const novel = useMemo(() => {
    if (novelScope === "all" || novelScope === "unassigned") return novels[0] ?? null;
    return novels.find((n) => n.id === novelScope) ?? null;
  }, [novels, novelScope]);

  const [ideaId, setIdeaId] = useState<string>("");
  const [response, setResponse] = useState("");
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [daily, setDaily] = useState<{ key: string; text: string } | null>(null);

  const idea = useMemo(() => ideaWebEntries.find((e) => e.id === ideaId) ?? null, [ideaWebEntries, ideaId]);

  const loadRecent = useCallback(async () => {
    if (!user?.id) return;
    try {
      const keys = await fetchRecentPromptKeys(user.id, 80);
      setRecentKeys(keys);
    } catch {
      setRecentKeys([]);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (!user?.id || !novel) return;
    void (async () => {
      try {
        const pick = pickDailySeedPrompt(novel);
        const row = await getOrCreateDailySeed(user.id, pick.key, pick.text);
        setDaily({ key: row.promptKey, text: row.promptText });
      } catch {
        setDaily(pickDailySeedPrompt(novel));
      }
    })();
  }, [user?.id, novel]);

  const runPrompt = async (key: string, text: string) => {
    if (!user?.id) return;
    if (recentKeys.includes(key)) {
      toast({ title: "You used this prompt recently — try another angle." });
    }
    try {
      await createPromptEvent({
        userId: user.id,
        novelId: novelIdFromScope(novelScope),
        promptType: "core",
        promptKey: key,
        promptText: text,
        userResponse: response.trim() || null,
        ideaWebEntryId: idea?.id ?? null,
      });
      trackEvent("sandbox_prompt_used", { key });
      void loadRecent();
    } catch {
      toast({ title: "Could not log prompt", variant: "destructive" });
    }
  };

  return (
    <div className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        Editorial prompts only — questions for you to answer. OdinPad does not write your story for you.
      </p>
      {daily && (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Seed of the day</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{daily.text}</pre>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => void runPrompt(daily.key, daily.text)}
          >
            Log that I used this seed
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="text-[10px] font-semibold uppercase text-muted-foreground">Context novel</label>
          <p className="text-sm">{novel?.title ?? "Pick a project scope in the toolbar"}</p>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="text-[10px] font-semibold uppercase text-muted-foreground">Optional Idea Web anchor</label>
          <Select value={ideaId || "__none__"} onValueChange={(v) => setIdeaId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="border border-border">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {ideaWebEntries.slice(0, 100).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {(e.title || e.body).slice(0, 48)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SANDBOX_CORE_PROMPTS.map((def) => {
          const text = def.template({ novel, idea });
          return (
            <div key={def.key} className="rounded-md border border-border p-3">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">{def.type}</p>
              <pre className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap font-sans text-xs">{text}</pre>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={() => void runPrompt(def.key, text)}
              >
                Log prompt
              </Button>
            </div>
          );
        })}
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Your notes (optional)</label>
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Jot what this sparked — stays with your prompt history."
          className="mt-1 min-h-[100px] border border-border"
        />
      </div>
    </div>
  );
}
