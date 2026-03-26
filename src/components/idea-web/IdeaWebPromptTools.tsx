import { Loader2, ScrollText, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  buildIdeaWebGroqContexts,
  type EditorialTask,
  invokeIdeaWebGroq,
  streamIdeaWebGroq,
} from "@/lib/idea-web/groq-editorial";
import { cn } from "@/lib/utils";
import type { IdeaWebEntry } from "@/types/idea-web";
import type { Novel } from "@/types/novel";

const STATIC_WHAT_IF =
  "What if the opposite were true?\nWhat if the stakes doubled overnight?\nWhat if a trusted ally had been lying — why?";

const STATIC_COMBINE =
  "Pick two of your ideas. How could they belong in the same scene?\nWhat tension appears when you force them together?";

const STATIC_EXPAND =
  "What does this idea want?\nWhat blocks it?\nWhat would this character never do — and when might they do it anyway?";

function toEditorialIdeas(entries: IdeaWebEntry[]) {
  return entries.map((e) => ({ title: e.title, body: e.body }));
}

type HistoryItem = { task: EditorialTask; title: string; text: string; at: number };

type Props = {
  selectedIdeas: IdeaWebEntry[];
  novels: Novel[];
};

/** Editorial Groq-assisted ideation with metadata-aware prompts and streaming output. */
export function IdeationTools({ selectedIdeas, novels }: Props) {
  const [streamText, setStreamText] = useState("");
  const [panelTitle, setPanelTitle] = useState("Output");
  const [loadingTask, setLoadingTask] = useState<EditorialTask | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const contexts = buildIdeaWebGroqContexts(selectedIdeas, novels);

  const runTask = useCallback(
    async (task: EditorialTask, ideas: IdeaWebEntry[], fallback: string) => {
      const editorial = toEditorialIdeas(ideas);
      const ctxSlice = contexts.slice(0, task === "combine" ? 2 : ideas.length);
      const title = task === "what_if" ? "What if…?" : task === "combine" ? "Combine" : "Expand";
      setPanelTitle(title);
      setStreamText("");
      setLoadingTask(task);
      let accumulated = "";
      try {
        accumulated = await streamIdeaWebGroq(task as "what_if" | "combine" | "expand", editorial, {
          contextPerIdea: ctxSlice,
          onDelta: (chunk) => {
            accumulated += chunk;
            setStreamText(accumulated);
          },
        });
        setStreamText(accumulated);
        setHistory((h) => [{ task, title, text: accumulated, at: Date.now() }, ...h].slice(0, 12));
      } catch (e) {
        console.warn("Groq stream fallback:", e);
        try {
          const { text } = await invokeIdeaWebGroq(task, editorial, { contextPerIdea: contexts });
          setStreamText(text);
          setHistory((h) => [{ task, title, text, at: Date.now() }, ...h].slice(0, 12));
          toast({ title: "Streaming unavailable", description: "Showing full response at once." });
        } catch (e2) {
          console.warn("Groq editorial fallback:", e2);
          toast({
            title: "Using offline prompts",
            description: e2 instanceof Error ? e2.message : "Could not reach the editorial assistant.",
          });
          setPanelTitle("Prompt ideas");
          setStreamText(fallback);
        }
      } finally {
        setLoadingTask(null);
      }
    },
    [contexts],
  );

  const onWhatIf = () => {
    if (selectedIdeas.length === 0) {
      toast({
        title: "Select an idea",
        description: "Check one idea in the list, then try again.",
        variant: "destructive",
      });
      return;
    }
    void runTask("what_if", [selectedIdeas[0]], STATIC_WHAT_IF);
  };

  const onCombine = () => {
    if (selectedIdeas.length < 2) {
      toast({
        title: "Select two ideas",
        description: "Check exactly two ideas, then use Combine.",
        variant: "destructive",
      });
      return;
    }
    void runTask("combine", [selectedIdeas[0], selectedIdeas[1]], STATIC_COMBINE);
  };

  const onExpand = () => {
    if (selectedIdeas.length === 0) {
      toast({
        title: "Select an idea",
        description: "Check one idea in the list, then try again.",
        variant: "destructive",
      });
      return;
    }
    void runTask("expand", [selectedIdeas[0]], STATIC_EXPAND);
  };

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-dashed border-primary/20 bg-card p-3 shadow-sm")}>
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Ideation tools (Groq)</p>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Select idea(s), then run a prompt. Prompts adapt to status, type, tags, and project. Combine needs two checked
        ideas.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border border-border text-xs"
          disabled={loadingTask !== null}
          onClick={onWhatIf}
        >
          {loadingTask === "what_if" ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          What if…?
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border border-border text-xs"
          disabled={loadingTask !== null}
          onClick={onCombine}
        >
          {loadingTask === "combine" ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          Combine
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border border-border text-xs"
          disabled={loadingTask !== null}
          onClick={onExpand}
        >
          {loadingTask === "expand" ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3 w-3" />
          )}
          Expand
        </Button>
      </div>

      <div className="rounded-md border border-border/60 bg-background/80">
        <div className="flex items-center gap-2 border-b border-border/50 px-2 py-1.5">
          <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">{panelTitle}</span>
        </div>
        <pre className="max-h-[min(50vh,420px)] min-h-[120px] overflow-y-auto whitespace-pre-wrap p-3 font-sans text-xs leading-relaxed text-foreground">
          {streamText || (loadingTask ? "…" : "Run a prompt to see editorial questions here.")}
        </pre>
      </div>

      {history.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Recent</p>
          <ul className="max-h-24 space-y-1 overflow-y-auto text-[10px] text-muted-foreground">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`}>
                <button
                  type="button"
                  className="w-full truncate text-left hover:text-foreground"
                  onClick={() => {
                    setStreamText(h.text);
                    setPanelTitle(h.title);
                  }}
                >
                  {h.title} · {new Date(h.at).toLocaleTimeString()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** @deprecated Use `IdeationTools` */
export const IdeaWebPromptTools = IdeationTools;

export type PromptSelection = { title: string; body: string };
