/**
 * Edit mode — AI-assisted revision studio for completed drafts.
 *
 * Two passes:
 *   Developmental — scene brief + revision prompts (big-picture craft).
 *   Line & Copy   — batch scan + selection-based rewrites with diff view.
 *
 * All AI suggestions go through a diff + accept/reject step before touching
 * scene content. Accepted edits patch scene content via updateSceneContent
 * (with undo support via useUndoableAction). Suggestions can be promoted to
 * Review annotations instead of being applied directly.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquare,
  Minus,
  Plus,
  Scissors,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import {
  EditSelectionAction,
  invokeLineScan,
  invokeSceneBrief,
  invokeSelectionAction,
  LineScanFlag,
  SceneBriefResult,
  SelectionActionResult,
} from "@/lib/edit-groq";
import type { EditPass, EditPassStatus, Scene } from "@/types/novel";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

interface PendingSuggestion {
  id: string;
  sceneId: string;
  pass: EditPass;
  type: LineScanFlag["type"] | EditSelectionAction | "revision-prompt";
  original: string;
  suggestion: string;
  rationale: string;
}

interface ActionTray {
  selectedText: string;
  surroundingContext: string;
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PASS_STATUS_LABEL: Record<EditPassStatus, string> = {
  "unedited": "Unedited",
  "in-progress": "In Progress",
  "dev-reviewed": "Dev Reviewed",
  "line-edited": "Line Edited",
  "polished": "Polished",
};

const PASS_STATUS_COLOR: Record<EditPassStatus, string> = {
  "unedited": "bg-muted text-muted-foreground",
  "in-progress": "bg-primary/20 text-primary",
  "dev-reviewed": "bg-sky-500/20 text-sky-400",
  "line-edited": "bg-amber-500/20 text-amber-400",
  "polished": "bg-emerald-500/20 text-emerald-400",
};

const FLAG_LABELS: Record<LineScanFlag["type"], string> = {
  "weak-word": "Weak Word",
  "passive-voice": "Passive Voice",
  "cliche": "Cliché",
  "show-dont-tell": "Show Don't Tell",
  "tense-slip": "Tense Slip",
  "pov-slip": "POV Slip",
  "rhythm": "Rhythm",
};

const FLAG_COLORS: Record<LineScanFlag["type"], string> = {
  "weak-word": "text-amber-400 bg-amber-500/10",
  "passive-voice": "text-sky-400 bg-sky-500/10",
  "cliche": "text-rose-400 bg-rose-500/10",
  "show-dont-tell": "text-violet-400 bg-violet-500/10",
  "tense-slip": "text-red-400 bg-red-500/10",
  "pov-slip": "text-red-500 bg-red-500/15",
  "rhythm": "text-muted-foreground bg-muted/50",
};

const ACTION_LABELS: Record<EditSelectionAction, { label: string; icon: React.ElementType }> = {
  tighten: { label: "Tighten", icon: Scissors },
  heighten: { label: "Heighten tension", icon: Zap },
  dialogue: { label: "Snappier dialogue", icon: MessageSquare },
  "fewer-words": { label: "Fewer words", icon: Minus },
};

function getScenePassStatus(
  sceneId: string,
  editPassState: import("@/types/novel").EditPassState | undefined,
): EditPassStatus {
  return editPassState?.sceneRecords?.[sceneId]?.status ?? "unedited";
}

function getSurroundingContext(content: string, selectedText: string): string {
  const idx = content.indexOf(selectedText);
  if (idx === -1) return content.slice(0, 400);
  const start = Math.max(0, idx - 200);
  const end = Math.min(content.length, idx + selectedText.length + 200);
  return content.slice(start, end);
}

// ---------------------------------------------------------------------------
// Sub-component: Scene navigator
// ---------------------------------------------------------------------------

function SceneNavigator({
  scenes,
  activeSceneId,
  editPassState,
  onSelect,
}: {
  scenes: Array<Scene & { actTitle: string; chTitle: string }>;
  activeSceneId: string | null;
  editPassState: import("@/types/novel").EditPassState | undefined;
  onSelect: (id: string) => void;
}) {
  const uneditedCount = scenes.filter(
    (s) => getScenePassStatus(s.id, editPassState) === "unedited",
  ).length;

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col border-r-2 border-border bg-card/60"
      aria-label="Scene navigator"
    >
      <div className="border-b-2 border-border px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Scenes
        </p>
        {uneditedCount > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{uneditedCount}</span> unedited
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {scenes.map((scene) => {
          const status = getScenePassStatus(scene.id, editPassState);
          const isActive = scene.id === activeSceneId;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSelect(scene.id)}
              aria-current={isActive ? "true" : undefined}
              className={`w-full px-4 py-2.5 text-left transition-colors hover:bg-accent/10 ${
                isActive ? "bg-accent/15 border-l-2 border-primary" : "border-l-2 border-transparent"
              }`}
            >
              <p className="truncate text-xs font-semibold text-foreground">{scene.title}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {scene.actTitle} · {scene.chTitle}
              </p>
              <div className="mt-1">
                <span
                  className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${PASS_STATUS_COLOR[status]}`}
                >
                  {PASS_STATUS_LABEL[status]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Diff view (original vs. suggestion)
// ---------------------------------------------------------------------------

function DiffCard({
  suggestion,
  onAccept,
  onReject,
  onPromoteToReview,
  isApplying,
}: {
  suggestion: PendingSuggestion;
  onAccept: () => void;
  onReject: () => void;
  onPromoteToReview: () => void;
  isApplying: boolean;
}) {
  const isPrompt = suggestion.type === "revision-prompt";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-sm border-2 border-border/70 bg-card/80 shadow-none"
    >
      <div className="px-4 py-3">
        {/* Type badge */}
        <div className="mb-2 flex items-center gap-2">
          {isPrompt ? (
            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-400">
              Revision Prompt
            </span>
          ) : (
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                FLAG_COLORS[(suggestion.type as LineScanFlag["type"])] ?? "bg-muted/50 text-muted-foreground"
              }`}
            >
              {FLAG_LABELS[(suggestion.type as LineScanFlag["type"])] ?? suggestion.type}
            </span>
          )}
        </div>

        {isPrompt ? (
          /* Revision prompt — no diff, just the prompt text */
          <div className="rounded-sm border border-sky-500/20 bg-sky-500/5 p-3">
            <p className="text-sm text-foreground leading-relaxed">{suggestion.suggestion}</p>
          </div>
        ) : (
          /* Diff: original (red strikethrough) → suggestion (green) */
          <div className="space-y-2">
            <div className="rounded-sm border border-red-500/20 bg-red-500/5 p-2.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-red-400/70">Original</p>
              <p className="font-serif text-sm text-foreground/70 line-through decoration-red-400/60 leading-relaxed">
                {suggestion.original}
              </p>
            </div>
            <div className="rounded-sm border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-400/70">Suggestion</p>
              <p className="font-serif text-sm text-foreground leading-relaxed">{suggestion.suggestion}</p>
            </div>
          </div>
        )}

        {suggestion.rationale && (
          <p className="mt-2 text-[11px] text-muted-foreground italic">{suggestion.rationale}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-t border-border/40 px-4 py-2">
        {!isPrompt && (
          <button
            type="button"
            disabled={isApplying}
            onClick={onAccept}
            className="flex items-center gap-1 rounded-sm border-2 border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Accept
          </button>
        )}
        <button
          type="button"
          onClick={onReject}
          className="flex items-center gap-1 rounded-sm border-2 border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
        >
          <Plus className="h-3 w-3 rotate-45" aria-hidden />
          {isPrompt ? "Dismiss" : "Reject"}
        </button>
        <button
          type="button"
          onClick={onPromoteToReview}
          title="Add to Review annotations"
          className="ml-auto flex items-center gap-1 rounded-sm border-2 border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary hover:border-primary/30"
        >
          <BookOpen className="h-3 w-3" aria-hidden />
          → Review
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EditView() {
  const {
    activeNovel,
    updateSceneContent,
    updateEditPassState,
    addReviewAnnotation,
  } = useNovelContext();
  const { schedule: scheduleUndo } = useUndoableAction();

  const [activePass, setActivePass] = useState<EditPass>("dev");
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([]);
  const [devResult, setDevResult] = useState<SceneBriefResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [actionTray, setActionTray] = useState<ActionTray | null>(null);
  const [selectionResult, setSelectionResult] = useState<SelectionActionResult | null>(null);
  const [selectionAction, setSelectionAction] = useState<EditSelectionAction | null>(null);
  const [isApplyingId, setIsApplyingId] = useState<string | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  // Flatten all scenes with act/chapter context
  const allScenes = useMemo(
    () =>
      activeNovel
        ? activeNovel.acts.flatMap((act) =>
            act.chapters.flatMap((ch) =>
              ch.scenes.map((s) => ({ ...s, actTitle: act.title, chTitle: ch.title })),
            ),
          )
        : [],
    [activeNovel],
  );

  const activeScene = activeSceneId ? allScenes.find((s) => s.id === activeSceneId) ?? null : null;

  // Auto-select first scene
  useEffect(() => {
    if (!activeSceneId && allScenes.length > 0) {
      setActiveSceneId(allScenes[0].id);
    }
  }, [activeSceneId, allScenes]);

  // Clear suggestions when changing scene or pass
  useEffect(() => {
    setSuggestions([]);
    setDevResult(null);
    setActionTray(null);
    setSelectionResult(null);
  }, [activeSceneId, activePass]);

  // ---------------------------------------------------------------------------
  // Selection action tray (text highlight in scene content)
  // ---------------------------------------------------------------------------

  const handleTextSelection = useCallback(() => {
    if (activePass !== "line") return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setActionTray(null);
      return;
    }
    const selectedText = sel.toString().trim();
    if (selectedText.length < 3) { setActionTray(null); return; }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current?.getBoundingClientRect();
    if (!containerRect) { setActionTray(null); return; }

    const surroundingContext = activeScene ? getSurroundingContext(activeScene.content, selectedText) : "";

    setActionTray({
      selectedText,
      surroundingContext,
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top - 48, // above the selection
    });
    setSelectionResult(null);
  }, [activePass, activeScene]);

  const runSelectionAction = async (action: EditSelectionAction) => {
    if (!actionTray || !activeScene) return;
    setSelectionAction(action);
    setIsRunning(true);
    try {
      const result = await invokeSelectionAction({
        action,
        selectedText: actionTray.selectedText,
        surroundingContext: actionTray.surroundingContext,
        genre: activeNovel?.genre,
        audience: activeNovel?.audience,
      });
      setSelectionResult(result);
      // Add as a pending suggestion
      const id = crypto.randomUUID();
      setSuggestions((prev) => [
        ...prev,
        {
          id,
          sceneId: activeScene.id,
          pass: "line",
          type: action,
          original: result.original || actionTray.selectedText,
          suggestion: result.suggestion,
          rationale: result.rationale,
        },
      ]);
      setActionTray(null);
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setSelectionAction(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Developmental pass
  // ---------------------------------------------------------------------------

  const runDevPass = async () => {
    if (!activeScene || !activeNovel) return;
    setIsRunning(true);
    setDevResult(null);
    try {
      const act = activeNovel.acts.find((a) => a.chapters.some((ch) => ch.scenes.some((s) => s.id === activeScene.id)));
      const chapter = act?.chapters.find((ch) => ch.scenes.some((s) => s.id === activeScene.id));

      const codexSummary = activeNovel.codexEntries
        .slice(0, 8)
        .map((e) => `[${e.type}] ${e.name}: ${e.description.slice(0, 120)}`)
        .join("\n");

      const result = await invokeSceneBrief({
        sceneTitle: activeScene.title,
        sceneContent: activeScene.content || "(no content yet)",
        sceneSummary: activeScene.summary || "",
        actTitle: act?.title ?? "Act",
        chapterTitle: chapter?.title ?? "Chapter",
        genre: activeNovel.genre,
        audience: activeNovel.audience,
        codexSummary,
      });

      setDevResult(result);

      // Turn revision prompts into suggestion cards
      const newSuggestions: PendingSuggestion[] = result.prompts.map((p) => ({
        id: crypto.randomUUID(),
        sceneId: activeScene.id,
        pass: "dev" as EditPass,
        type: "revision-prompt" as const,
        original: "",
        suggestion: p,
        rationale: "",
      }));
      setSuggestions(newSuggestions);

      // Mark scene as dev-reviewed
      updateEditPassState(activeScene.id, { status: "dev-reviewed", devDoneAt: new Date().toISOString() });
    } catch (e) {
      toast({
        title: "Developmental pass failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Line pass — batch scan
  // ---------------------------------------------------------------------------

  const runLineScan = async () => {
    if (!activeScene || !activeNovel) return;
    setIsRunning(true);
    setSuggestions([]);
    try {
      const result = await invokeLineScan({
        sceneTitle: activeScene.title,
        sceneContent: activeScene.content || "(no content yet)",
        genre: activeNovel.genre,
        defaultPov: activeNovel.defaultPov,
        defaultTense: activeNovel.defaultTense,
      });

      if (result.flags.length === 0) {
        toast({ title: "No issues found", description: "This scene looks clean." });
        return;
      }

      const newSuggestions: PendingSuggestion[] = result.flags.map((f) => ({
        id: crypto.randomUUID(),
        sceneId: activeScene.id,
        pass: "line" as EditPass,
        type: f.type,
        original: f.span,
        suggestion: f.suggestion,
        rationale: f.rationale,
      }));
      setSuggestions(newSuggestions);

      // Mark in-progress
      updateEditPassState(activeScene.id, { status: "in-progress" });

      toast({
        title: `${result.flags.length} issue${result.flags.length === 1 ? "" : "s"} found`,
        description: "Review and accept suggestions below.",
      });
    } catch (e) {
      toast({
        title: "Line scan failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Accept suggestion (patch scene content)
  // ---------------------------------------------------------------------------

  const acceptSuggestion = useCallback(
    (suggestion: PendingSuggestion) => {
      if (!activeScene) return;
      setIsApplyingId(suggestion.id);

      const previousContent = activeScene.content;
      const newContent = previousContent.replace(suggestion.original, suggestion.suggestion);

      if (newContent === previousContent) {
        toast({
          title: "Could not apply suggestion",
          description: "The original text was not found verbatim in the scene. Edit manually.",
          variant: "destructive",
        });
        setIsApplyingId(null);
        return;
      }

      updateSceneContent(activeScene.id, newContent);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
      setIsApplyingId(null);

      scheduleUndo(() => updateSceneContent(activeScene.id, previousContent), {
        message: "Suggestion applied",
        undoLabel: "Undo",
        delayMs: 8000,
      });

      // If all line suggestions resolved, mark line-edited
      const remaining = suggestions.filter((s) => s.id !== suggestion.id && s.pass === "line");
      if (suggestion.pass === "line" && remaining.length === 0) {
        updateEditPassState(activeScene.id, {
          status: "line-edited",
          lineDoneAt: new Date().toISOString(),
        });
      }
    },
    [activeScene, suggestions, updateSceneContent, updateEditPassState, scheduleUndo],
  );

  // ---------------------------------------------------------------------------
  // Promote suggestion → Review annotation
  // ---------------------------------------------------------------------------

  const promoteToReview = useCallback(
    (suggestion: PendingSuggestion) => {
      if (!activeScene) return;
      const content =
        suggestion.type === "revision-prompt"
          ? suggestion.suggestion
          : `[${suggestion.type}] Original: "${suggestion.original}" — Suggestion: "${suggestion.suggestion}" — ${suggestion.rationale}`;
      addReviewAnnotation(activeScene.id, "issue", content);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
      toast({ title: "Added to Review", description: "Find it in the Review tab." });
    },
    [activeScene, addReviewAnnotation],
  );

  // ---------------------------------------------------------------------------
  // Reject suggestion
  // ---------------------------------------------------------------------------

  const rejectSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ---------------------------------------------------------------------------
  // Mark scene polished (manual)
  // ---------------------------------------------------------------------------

  const markPolished = () => {
    if (!activeScene) return;
    updateEditPassState(activeScene.id, { status: "polished" });
    toast({ title: "Scene marked as polished" });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!activeNovel) return null;

  const sceneSuggestions = suggestions.filter((s) => s.sceneId === activeSceneId);
  const sceneStatus = activeSceneId ? getScenePassStatus(activeSceneId, activeNovel.editPassState) : "unedited";

  // Stats strip
  const totalScenes = allScenes.length;
  const polished = allScenes.filter((s) => getScenePassStatus(s.id, activeNovel.editPassState) === "polished").length;
  const lineEdited = allScenes.filter((s) => {
    const st = getScenePassStatus(s.id, activeNovel.editPassState);
    return st === "line-edited" || st === "polished";
  }).length;
  const devReviewed = allScenes.filter((s) => {
    const st = getScenePassStatus(s.id, activeNovel.editPassState);
    return st !== "unedited";
  }).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex h-full min-h-0 w-full flex-col"
    >
      {/* Top bar */}
      <div className="shrink-0 border-b-2 border-border bg-card/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wand2 className="h-5 w-5 text-primary" aria-hidden />
            <div>
              <h2 className="text-2xl font-bold font-serif text-foreground">Edit</h2>
              <p className="text-xs text-muted-foreground">AI-assisted revision studio</p>
            </div>
          </div>

          {/* Pass picker */}
          <div
            role="tablist"
            aria-label="Edit pass"
            className="flex items-center gap-0.5 border-2 border-border bg-background/90 p-0.5"
          >
            {(["dev", "line"] as EditPass[]).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={activePass === p}
                onClick={() => setActivePass(p)}
                className={`rounded-sm px-4 py-1.5 text-xs font-semibold transition-colors ${
                  activePass === p
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "dev" ? "Developmental" : "Line & Copy"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { label: "Total Scenes", value: totalScenes.toString() },
            { label: "Dev Reviewed", value: `${devReviewed}/${totalScenes}` },
            { label: "Line Edited", value: `${lineEdited}/${totalScenes}` },
            { label: "Polished", value: `${polished}/${totalScenes}` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-sm border border-border/50 bg-muted/30 px-3 py-2"
            >
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              <p className="mt-0.5 text-base font-bold font-mono text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body: navigator + main */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: scene navigator */}
        <SceneNavigator
          scenes={allScenes}
          activeSceneId={activeSceneId}
          editPassState={activeNovel.editPassState}
          onSelect={(id) => setActiveSceneId(id)}
        />

        {/* Center + Right */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {activeScene ? (
            <>
              {/* Center: scene content */}
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-r-2 border-border/60">
                {/* Scene header */}
                <div className="shrink-0 border-b border-border/50 bg-card/60 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-base font-bold text-foreground">{activeScene.title}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {allScenes.find((s) => s.id === activeScene.id)?.actTitle} ·{" "}
                        {allScenes.find((s) => s.id === activeScene.id)?.chTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${PASS_STATUS_COLOR[sceneStatus]}`}>
                        {PASS_STATUS_LABEL[sceneStatus]}
                      </span>
                      {sceneStatus !== "polished" && (
                        <button
                          type="button"
                          onClick={markPolished}
                          className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20"
                        >
                          Mark polished
                        </button>
                      )}
                    </div>
                  </div>
                  {activePass === "line" && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                      Highlight text to get targeted actions (Tighten, Heighten tension, etc.)
                    </p>
                  )}
                </div>

                {/* Scene text — scrollable, selectable */}
                <div
                  ref={contentRef}
                  className="relative flex-1 overflow-y-auto"
                  onMouseUp={handleTextSelection}
                >
                  {/* Floating action tray */}
                  <AnimatePresence>
                    {actionTray && activePass === "line" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                          position: "absolute",
                          left: Math.max(8, actionTray.x),
                          top: Math.max(8, actionTray.y),
                          zIndex: 30,
                        }}
                        className="flex items-center gap-1 rounded-sm border-2 border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm"
                        role="toolbar"
                        aria-label="Selection actions"
                      >
                        {(Object.entries(ACTION_LABELS) as [EditSelectionAction, { label: string; icon: React.ElementType }][]).map(
                          ([action, { label, icon: Icon }]) => (
                            <button
                              key={action}
                              type="button"
                              disabled={isRunning}
                              onClick={() => void runSelectionAction(action)}
                              className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground disabled:opacity-50"
                            >
                              {isRunning && selectionAction === action ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                              ) : (
                                <Icon className="h-3 w-3" aria-hidden />
                              )}
                              {label}
                            </button>
                          ),
                        )}
                        <button
                          type="button"
                          onClick={() => setActionTray(null)}
                          className="ml-1 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                          aria-label="Dismiss"
                        >
                          <Plus className="h-3 w-3 rotate-45" aria-hidden />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {activeScene.content ? (
                    <div className="mx-auto max-w-2xl px-6 py-8">
                      <div className="prose-editor whitespace-pre-wrap font-serif text-base leading-relaxed text-foreground selection:bg-primary/20">
                        {activeScene.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden />
                        <p className="text-sm text-muted-foreground">This scene has no content yet.</p>
                        <p className="text-xs text-muted-foreground/70">Write the scene in Write mode first.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right panel: AI editor */}
              <div className="flex h-full w-80 shrink-0 flex-col overflow-hidden bg-card/50">
                {/* Pass-specific action button */}
                <div className="shrink-0 border-b border-border/50 p-4">
                  {activePass === "dev" ? (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Developmental Analysis
                      </p>
                      <button
                        type="button"
                        disabled={isRunning || !activeScene.content}
                        onClick={() => void runDevPass()}
                        className="flex w-full items-center justify-center gap-2 rounded-sm border-2 border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/20 disabled:opacity-50"
                      >
                        {isRunning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                        )}
                        {isRunning ? "Analysing…" : "Run Dev Pass"}
                      </button>
                      <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                        AI reads the scene against its metadata and codex, returns a scene brief + revision prompts.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Line Pass
                      </p>
                      <button
                        type="button"
                        disabled={isRunning || !activeScene.content}
                        onClick={() => void runLineScan()}
                        className="flex w-full items-center justify-center gap-2 rounded-sm border-2 border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/20 disabled:opacity-50"
                      >
                        {isRunning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Zap className="h-3.5 w-3.5 text-primary" aria-hidden />
                        )}
                        {isRunning ? "Scanning…" : "Scan Scene"}
                      </button>
                      <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                        Batch-scans for weak words, passive voice, clichés, POV slips, and more.
                        Or highlight text above for targeted actions.
                      </p>
                    </div>
                  )}
                </div>

                {/* Dev pass result: scene brief + gap */}
                {activePass === "dev" && devResult && (
                  <div className="shrink-0 border-b border-border/50 px-4 py-3">
                    <div className="mb-3">
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Scene Brief
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">{devResult.brief}</p>
                    </div>
                    {devResult.gap && (
                      <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-400/70">
                          Gap Detected
                        </p>
                        <p className="text-xs text-amber-200">{devResult.gap}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggestions queue */}
                <div className="flex-1 overflow-y-auto p-4">
                  {sceneSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          {activePass === "dev" ? "Revision Prompts" : "Suggestions"} ({sceneSuggestions.length})
                        </p>
                        {activePass === "line" && sceneSuggestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSuggestions((prev) => prev.filter((s) => s.sceneId !== activeSceneId))}
                            className="text-[10px] text-muted-foreground hover:text-destructive"
                          >
                            Dismiss all
                          </button>
                        )}
                      </div>
                      <AnimatePresence>
                        {sceneSuggestions.map((s) => (
                          <DiffCard
                            key={s.id}
                            suggestion={s}
                            onAccept={() => acceptSuggestion(s)}
                            onReject={() => rejectSuggestion(s.id)}
                            onPromoteToReview={() => promoteToReview(s)}
                            isApplying={isApplyingId === s.id}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      {activePass === "dev" ? (
                        <>
                          <Sparkles className="mb-3 h-8 w-8 text-muted-foreground/30" aria-hidden />
                          <p className="text-sm text-muted-foreground">Run the Dev Pass to get a scene brief and revision prompts.</p>
                        </>
                      ) : (
                        <>
                          <Wand2 className="mb-3 h-8 w-8 text-muted-foreground/30" aria-hidden />
                          <p className="text-sm text-muted-foreground">
                            Scan the scene for line-level issues, or highlight text and pick an action.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No scene selected */
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" aria-hidden />
                <p className="text-sm text-muted-foreground">Select a scene to begin editing.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
