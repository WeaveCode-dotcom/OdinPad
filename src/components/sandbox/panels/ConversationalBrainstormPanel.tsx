import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { invokeIdeaWebGroq } from "@/lib/idea-web/groq-editorial";
import { fetchConversations, saveConversation } from "@/lib/sandbox/service";
import { sanitizeUserFacingPlainText } from "@/lib/sanitize-html";
import type { SandboxConversation, SandboxTranscriptMessage } from "@/types/sandbox";

function novelIdFromScope(scope: "all" | "unassigned" | string): string | null {
  if (scope === "all" || scope === "unassigned") return null;
  return scope;
}

export function ConversationalBrainstormPanel({ novelScope }: { novelScope: "all" | "unassigned" | string }) {
  const { user } = useAuth();
  const { activeNovel } = useNovelContext();
  const [storyWikiId, setStoryWikiId] = useState<string>("");
  const [userMsg, setUserMsg] = useState("");
  const [transcript, setTranscript] = useState<SandboxTranscriptMessage[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SandboxConversation[]>([]);

  const characters = activeNovel?.storyWikiEntries.filter((c) => c.type === "character") ?? [];

  const selected = characters.find((c) => c.id === storyWikiId);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const scope = novelScope === "all" ? "all" : novelScope === "unassigned" ? null : novelScope;
      const rows = await fetchConversations(user.id, scope);
      setHistory(rows.filter((r) => r.elementType === "character"));
    } catch {
      setHistory([]);
    }
  }, [user?.id, novelScope]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const send = async () => {
    if (!user?.id || !selected || !userMsg.trim()) {
      toast({ title: "Pick a character and type a message", variant: "destructive" });
      return;
    }
    setLoading(true);
    const nextUser: SandboxTranscriptMessage = {
      role: "user",
      content: userMsg.trim(),
      at: new Date().toISOString(),
    };
    const nextTranscript = [...transcript, nextUser];
    setTranscript(nextTranscript);
    setUserMsg("");
    try {
      const { text } = await invokeIdeaWebGroq("character_sparring", [], {
        character: {
          name: selected.name,
          description: selected.description,
          notes: selected.notes,
          userMessage: nextUser.content,
        },
      });
      const assistant: SandboxTranscriptMessage = {
        role: "assistant",
        content: text,
        at: new Date().toISOString(),
      };
      const full = [...nextTranscript, assistant];
      setTranscript(full);
      const saved = await saveConversation(user.id, {
        id: convId ?? undefined,
        novelId: novelIdFromScope(novelScope),
        elementType: "character",
        elementId: selected.id,
        title: `${selected.name} — sparring`,
        transcript: full,
        metadata: { storyWikiName: selected.name },
      });
      setConvId(saved.id);
      trackEvent("sandbox_conversation", { character: selected.id });
      void loadHistory();
    } catch (e) {
      toast({
        title: "Sparring unavailable",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
      setTranscript(transcript);
    } finally {
      setLoading(false);
    }
  };

  const loadConv = (id: string) => {
    const c = history.find((x) => x.id === id);
    if (!c) return;
    setConvId(c.id);
    setTranscript(c.transcript);
    if (c.elementId) setStoryWikiId(c.elementId);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Character sparring: the assistant asks questions only—no dialogue or prose written for you.
        </p>
        <div className="flex flex-wrap gap-2">
          <Select value={storyWikiId || ""} onValueChange={setStoryWikiId}>
            <SelectTrigger className="w-[260px] border border-border">
              <SelectValue placeholder="Choose a character from Story Wiki" />
            </SelectTrigger>
            <SelectContent>
              {characters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!activeNovel && (
            <span className="text-xs text-amber-700">Open a book from the dashboard to load characters.</span>
          )}
        </div>
        <div className="min-h-[220px] max-h-[45vh] space-y-3 overflow-y-auto rounded-md border border-border bg-muted/20 p-3 text-sm">
          {transcript.length === 0 && (
            <p className="text-muted-foreground">Ask a motivation question, or test a “what if” scenario.</p>
          )}
          {transcript.map((m, i) => (
            <div
              key={i}
              className={`rounded-md px-2 py-1.5 ${m.role === "user" ? "ml-4 bg-primary/10" : "mr-4 bg-card"}`}
            >
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">{m.role}</span>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-xs">
                {m.role === "assistant" ? sanitizeUserFacingPlainText(m.content) : m.content}
              </pre>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={userMsg}
            onChange={(e) => setUserMsg(e.target.value)}
            placeholder="Your turn — e.g. What would you never do to get what you want?"
            className="min-h-[80px] flex-1 border border-border"
            disabled={!selected}
          />
          <Button type="button" disabled={loading || !selected} onClick={() => void send()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </Button>
        </div>
      </div>
      <aside className="rounded-md border border-border p-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Sessions</p>
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
          {history.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full rounded-sm px-1 py-1 text-left hover:bg-muted/60"
                onClick={() => loadConv(h.id)}
              >
                {h.title.slice(0, 40)}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
