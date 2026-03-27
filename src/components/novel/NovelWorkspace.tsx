import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BookOpen, Camera, Eye, Feather, Map, PenTool, Wand2, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppArtsyDecor } from "@/components/layout/AppArtsyDecor";
import { PanelErrorBoundary } from "@/components/canvas/PanelErrorBoundary";
import GuidedTourOverlay from "@/components/onboarding/GuidedTourOverlay";
import { SandboxShell } from "@/components/sandbox/SandboxShell";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { trackEvent } from "@/lib/analytics";
import { featureFlags } from "@/lib/feature-flags";
import { getNovelWordCount } from "@/lib/novel-metrics";
import { loadNovels } from "@/lib/novel-store";
import type { Novel, WorkspaceMode } from "@/types/novel";

import CanvasView from "./CanvasView";
import StoryWikiPanel from "./StoryWikiPanel";
import EditView from "./EditView";
import ReviewView from "./ReviewView";
import { SceneSnapshotPanel } from "./SceneSnapshotPanel";
import WriteView from "./WriteView";

function firstSceneTitle(novel: Novel): string {
  const s = novel.acts[0]?.chapters[0]?.scenes[0];
  return s?.title ?? "—";
}

const modeConfig: Record<WorkspaceMode, { label: string; icon: React.ElementType }> = {
  sandbox: { label: "Sandbox", icon: Zap },
  canvas: { label: "Canvas", icon: Map },
  write: { label: "Write", icon: PenTool },
  edit: { label: "Edit", icon: Wand2 },
  review: { label: "Review", icon: Eye },
};

export default function NovelWorkspace() {
  const reduceMotion = useReducedMotion();
  const {
    activeNovel,
    novels,
    mode,
    setMode,
    goToDashboard,
    novelStorageConflict,
    applyNovelsFromStorage,
    dismissNovelStorageConflict,
    activeSceneId,
    getActiveScene,
    updateSceneContent,
  } = useNovelContext();
  const { signOut, preferences, updatePreferences } = useAuth();

  useEffect(() => {
    if (!activeNovel || mode !== "write" || preferences?.first_run_write_opened) return;
    void updatePreferences({ first_run_write_opened: true });
  }, [activeNovel, mode, preferences?.first_run_write_opened, updatePreferences]);

  // Route first-time workspace entry based on writing style preference.
  // Plotters default to Canvas (structure-first); Pantsers default to Write (draft-first).
  useEffect(() => {
    if (!activeNovel) return;
    const storageKey = `odinpad_workspace_mode_seeded_${activeNovel.id}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, "1");
    const style = preferences?.writing_style;
    if (style === "plotter") {
      setMode("canvas");
    } else if (style === "pantser") {
      setMode("write");
    }
    // hybrid / unset: keep default (canvas)
  }, [activeNovel?.id, preferences?.writing_style, setMode]);
  const [codexOpen, setCodexOpen] = useState(false);
  const [codexPinned, setCodexPinned] = useState(() => localStorage.getItem("odinpad_story_wiki_pinned") === "1");
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const { schedule: scheduleUndo } = useUndoableAction();

  const handleCodexTogglePin = () => {
    const next = !codexPinned;
    setCodexPinned(next);
    try {
      localStorage.setItem("odinpad_story_wiki_pinned", next ? "1" : "0");
    } catch {
      /* quota */
    }
  };

  const checklistDoneCount = [
    preferences?.checklist_opening_scene_done,
    preferences?.checklist_character_done,
    preferences?.checklist_goal_done,
  ].filter(Boolean).length;
  const canAccessAdvanced =
    !featureFlags.guidedTour || checklistDoneCount >= 3 || Boolean(preferences?.guided_tour_completed_at);
  const visibleModes = (Object.keys(modeConfig) as WorkspaceMode[]).filter(
    (tab) => canAccessAdvanced || (tab !== "review" && tab !== "edit"),
  );

  const hasCharacterEntry = useMemo(
    () => Boolean(activeNovel?.storyWikiEntries.some((entry) => entry.type === "character")),
    [activeNovel?.storyWikiEntries],
  );

  const conflictDetail = useMemo(() => {
    if (!novelStorageConflict || !activeNovel) return null;
    const fromStorage = loadNovels()?.find((n) => n.id === novelStorageConflict.novelId) ?? null;
    const fromMemory = novels.find((n) => n.id === novelStorageConflict.novelId) ?? activeNovel;
    if (!fromStorage) {
      return {
        localWords: getNovelWordCount(fromMemory),
        remoteWords: null as number | null,
        localScene: firstSceneTitle(fromMemory),
        remoteScene: "—",
        localTs: fromMemory.updatedAt,
        remoteTs: null as string | null,
      };
    }
    return {
      localWords: getNovelWordCount(fromMemory),
      remoteWords: getNovelWordCount(fromStorage),
      localScene: firstSceneTitle(fromMemory),
      remoteScene: firstSceneTitle(fromStorage),
      localTs: fromMemory.updatedAt,
      remoteTs: fromStorage.updatedAt,
    };
  }, [novelStorageConflict, activeNovel, novels]);

  useEffect(() => {
    if (!activeNovel || !preferences || !featureFlags.guidedTour) return;
    if (!preferences.checklist_opening_scene_done && mode === "write") {
      void updatePreferences({ checklist_opening_scene_done: true });
    }
  }, [activeNovel, mode, preferences, updatePreferences]);

  useEffect(() => {
    if (!activeNovel || !preferences || !featureFlags.guidedTour) return;
    if (!preferences.checklist_character_done && hasCharacterEntry) {
      void updatePreferences({ checklist_character_done: true });
    }
  }, [activeNovel, hasCharacterEntry, preferences, updatePreferences]);

  const markGoalDone = async () => {
    await updatePreferences({ checklist_goal_done: true });
  };

  const completeTour = async () => {
    await updatePreferences({
      guided_tour_completed_at: new Date().toISOString(),
      onboarding_step: "project",
    });
    trackEvent("tour_completed", { source: "workspace" });
  };

  const skipTour = async () => {
    await updatePreferences({
      checklist_opening_scene_done: true,
      checklist_character_done: true,
      checklist_goal_done: true,
      guided_tour_completed_at: new Date().toISOString(),
      onboarding_deferred: true,
    });
    trackEvent("tour_skipped", { source: "workspace" });
  };

  const tourSteps = [
    {
      selector: '[data-tour="mode-canvas"]',
      title: "Explore Canvas",
      description: "Use Canvas to structure your story—binder, blueprint, and more—before drafting.",
      onNext: () => {
        setMode("canvas");
        setTourStep(1);
      },
    },
    {
      selector: '[data-tour="mode-write"]',
      title: "Write your opening scene",
      description: "Switch to Write mode and begin drafting your first scene.",
      onNext: () => {
        setMode("write");
        setTourStep(2);
      },
    },
    {
      selector: '[data-tour="write-editor"]',
      title: "Draft in the editor",
      description: "Use the focused editor to draft scenes and track word progress.",
      onNext: () => {
        setTourStep(3);
      },
    },
    {
      selector: '[data-tour="story-wiki-toggle"]',
      title: "Add a character",
      description: "Open the Story Wiki and create your first character entry.",
      onNext: () => {
        setCodexOpen(true);
        setTourStep(4);
      },
    },
    {
      selector: '[data-tour="story-wiki-add-character"]',
      title: "Create Story Wiki entries",
      description: "Use the plus control to add character, location, lore, and more entries.",
      onNext: () => {
        void markGoalDone();
        setTourStep(5);
      },
    },
    {
      selector: '[data-tour="mode-review"]',
      title: "Use review mode",
      description: "Review mode helps you revise scenes and finalize your draft.",
      onNext: () => {
        setMode("review");
        setTourStep(6);
      },
    },
    {
      selector: '[data-tour="dashboard-button"]',
      title: "Return to dashboard",
      description: "Use this to return to your dashboard anytime. This completes the full tour.",
      onNext: () => {
        void completeTour();
        setTourStep(7);
      },
    },
  ] as const;

  const shouldShowOverlay =
    featureFlags.guidedTour &&
    !preferences?.onboarding_deferred &&
    !preferences?.guided_tour_completed_at &&
    tourStep < tourSteps.length;

  if (!activeNovel) return null;

  return (
    <div className="relative flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <a
        href="#novel-workspace-main"
        className="sr-only left-2 top-2 z-[100] rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow focus:not-sr-only focus:absolute"
      >
        Skip to workspace content
      </a>
      <AppArtsyDecor dense />
      {novelStorageConflict && conflictDetail && (
        <div
          role="alert"
          className="relative z-20 border-b border-amber-600/50 bg-amber-950/95 px-3 py-3 text-xs text-amber-50"
        >
          <p className="font-semibold">Another tab saved a newer copy of this manuscript to local storage.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-amber-500/30 bg-amber-900/40 p-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">This tab (in memory)</p>
              <p className="mt-1 font-mono tabular-nums">{conflictDetail.localWords.toLocaleString()} words</p>
              <p className="text-[10px] text-amber-200/80">First scene: {conflictDetail.localScene}</p>
              <p className="text-[10px] text-amber-200/70">
                Modified {new Date(conflictDetail.localTs).toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-900/40 p-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">Other tab (storage)</p>
              <p className="mt-1 font-mono tabular-nums">
                {conflictDetail.remoteWords != null ? conflictDetail.remoteWords.toLocaleString() : "—"} words
              </p>
              <p className="text-[10px] text-amber-200/80">First scene: {conflictDetail.remoteScene}</p>
              <p className="text-[10px] text-amber-200/70">
                {conflictDetail.remoteTs
                  ? new Date(conflictDetail.remoteTs).toLocaleString()
                  : "Could not read timestamp"}
              </p>
            </div>
          </div>
          <p className="mt-2 max-h-24 overflow-auto rounded border border-amber-500/20 bg-black/20 p-2 font-mono text-[10px] leading-snug text-amber-100/90">
            Data preview (truncated):{" "}
            {JSON.stringify(activeNovel ? { id: activeNovel.id, updatedAt: activeNovel.updatedAt } : null).slice(
              0,
              400,
            )}
            …
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-amber-400/40 bg-amber-900/80 px-2 py-1 font-semibold hover:bg-amber-800"
              onClick={() => dismissNovelStorageConflict()}
            >
              Keep mine
            </button>
            <button
              type="button"
              className="rounded-md border border-amber-400/40 bg-amber-900/80 px-2 py-1 font-semibold hover:bg-amber-800"
              onClick={() => applyNovelsFromStorage()}
            >
              Load from storage
            </button>
          </div>
        </div>
      )}
      {/* Top bar */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-border bg-card/95 px-2 py-2 shadow-sm backdrop-blur-md transition-[backdrop-filter] duration-300">
        <div className="absolute inset-x-0 bottom-0 h-px bg-primary/35" aria-hidden />
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={goToDashboard}
            data-tour="dashboard-button"
            type="button"
            aria-label="Back to dashboard"
            className="flex shrink-0 items-center gap-2 rounded-sm border border-border bg-background px-2 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <Feather className="h-4 w-4 text-primary" aria-hidden />
          </button>
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
            <h1 className="truncate text-sm font-bold text-foreground font-serif md:text-base">{activeNovel.title}</h1>
          </div>
        </div>

        {/* Mode tabs — pill strip */}
        <div
          role="tablist"
          aria-label="Workspace modes"
          className="flex max-w-[min(100%,52vw)] flex-wrap items-center justify-end gap-0.5 border border-border bg-background/90 p-0.5 shadow-none sm:max-w-none"
        >
          {visibleModes.map((m) => {
            const { label, icon: Icon } = modeConfig[m];
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-label={`Switch to ${label} mode`}
                aria-current={active ? "page" : undefined}
                data-tour={
                  m === "write"
                    ? "mode-write"
                    : m === "canvas"
                      ? "mode-canvas"
                      : m === "edit"
                        ? "mode-edit"
                        : m === "review"
                          ? "mode-review"
                          : undefined
                }
                className={`relative flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active &&
                  (reduceMotion ? (
                    <div className="absolute inset-0 rounded-sm bg-accent/10" />
                  ) : (
                    <motion.div
                      layoutId="mode-tab"
                      className="absolute inset-0 rounded-sm bg-accent/10"
                      transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                    />
                  ))}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden min-[480px]:inline">{label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {mode === "write" && activeSceneId && (
            <button
              type="button"
              onClick={() => setSnapshotOpen((v) => !v)}
              aria-expanded={snapshotOpen}
              aria-label="Scene history"
              className={`flex items-center gap-1.5 rounded-sm border-2 border-transparent px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                snapshotOpen
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-border hover:text-foreground hover:bg-accent/10"
              }`}
            >
              <Camera className="h-3.5 w-3.5" aria-hidden />
              History
            </button>
          )}
          <button
            type="button"
            onClick={() => setCodexOpen(!codexOpen)}
            data-tour="story-wiki-toggle"
            aria-expanded={codexOpen}
            className={`flex items-center gap-1.5 rounded-sm border-2 border-transparent px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              codexOpen
                ? "border-primary/30 bg-primary/10 text-primary"
                : "text-muted-foreground hover:border-border hover:text-foreground hover:bg-accent/10"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Story Wiki
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <main
          id="novel-workspace-main"
          tabIndex={-1}
          className={`relative min-w-0 flex-1 outline-none ${mode === "edit" ? "flex flex-col overflow-hidden" : "overflow-y-auto"} ${codexPinned && codexOpen ? "border-r-0" : ""}`}
        >
          {featureFlags.guidedTour && !preferences?.guided_tour_completed_at && (
            <div className="mx-2 mt-2 rounded-sm border-2 border-primary/40 bg-primary/5 p-2 text-xs text-muted-foreground shadow-none">
              <p className="font-medium text-foreground">Guided Learn-by-Doing</p>
              <p className="mt-1">
                Write your opening scene, add a character, and set a goal to unlock advanced tools.
              </p>
              <button
                onClick={() => void skipTour()}
                className="mt-2 rounded-sm border-2 border-border bg-background px-2 py-1 text-xs font-semibold shadow-none hover:bg-accent/20"
              >
                Skip full tour
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {mode === "sandbox" && activeNovel && (
              <motion.div
                key="sandbox"
                className="min-h-0"
                initial={reduceMotion ? false : { opacity: 0, x: 32, filter: "blur(8px)" }}
                animate={reduceMotion ? false : { opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -24, filter: "blur(6px)" }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="p-2 sm:p-4">
                  <PanelErrorBoundary panelName="Sandbox">
                    <SandboxShell lockedNovelId={activeNovel.id} />
                  </PanelErrorBoundary>
                </div>
              </motion.div>
            )}
            {mode === "canvas" && (
              <motion.div
                key="canvas"
                className="min-h-0"
                initial={reduceMotion ? false : { opacity: 0, x: 32, filter: "blur(8px)" }}
                animate={reduceMotion ? false : { opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -24, filter: "blur(6px)" }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <PanelErrorBoundary panelName="Canvas">
                  <CanvasView />
                </PanelErrorBoundary>
              </motion.div>
            )}
            {mode === "write" && (
              <motion.div
                key="write"
                className="min-h-0"
                initial={reduceMotion ? false : { opacity: 0, x: 32, filter: "blur(8px)" }}
                animate={reduceMotion ? false : { opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -24, filter: "blur(6px)" }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <PanelErrorBoundary panelName="Write">
                  <WriteView />
                </PanelErrorBoundary>
              </motion.div>
            )}
            {mode === "edit" && (
              <motion.div
                key="edit"
                className="flex h-full min-h-0 flex-col"
                initial={reduceMotion ? false : { opacity: 0, x: 32, filter: "blur(8px)" }}
                animate={reduceMotion ? false : { opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -24, filter: "blur(6px)" }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <PanelErrorBoundary panelName="Edit">
                  <EditView />
                </PanelErrorBoundary>
              </motion.div>
            )}
            {mode === "review" && (
              <motion.div
                key="review"
                className="min-h-0"
                initial={reduceMotion ? false : { opacity: 0, x: 32, filter: "blur(8px)" }}
                animate={reduceMotion ? false : { opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -24, filter: "blur(6px)" }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <PanelErrorBoundary panelName="Review">
                  <ReviewView />
                </PanelErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {codexOpen && (
          <StoryWikiPanel onClose={() => setCodexOpen(false)} pinned={codexPinned} onTogglePin={handleCodexTogglePin} />
        )}
        {snapshotOpen && activeSceneId && (
          <SceneSnapshotPanel
            sceneId={activeSceneId}
            currentContent={getActiveScene()?.content ?? ""}
            onClose={() => setSnapshotOpen(false)}
            onRestore={(content) => {
              const previous = getActiveScene()?.content ?? "";
              updateSceneContent(activeSceneId, content);
              setSnapshotOpen(false);
              scheduleUndo(() => updateSceneContent(activeSceneId, previous), {
                message: "Snapshot restored",
                undoLabel: "Undo",
                delayMs: 8000,
              });
            }}
          />
        )}
      </div>
      {shouldShowOverlay && (
        <GuidedTourOverlay
          selector={tourSteps[tourStep].selector}
          title={tourSteps[tourStep].title}
          description={tourSteps[tourStep].description}
          stepIndex={tourStep}
          stepCount={tourSteps.length}
          onNext={tourSteps[tourStep].onNext}
          onSkip={() => void skipTour()}
        />
      )}
    </div>
  );
}
