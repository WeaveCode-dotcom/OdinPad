import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronRight, Clock, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logWritingSession } from "@/api/writing-sessions";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { useIncrementalWordCount } from "@/lib/novel-metrics";

// ─── Sprint session persistence ───────────────────────────────────────────────

interface SprintSession {
  date: string;
  durationSecs: number;
  wordsWritten: number;
}

const SPRINT_KEY = "odinpad_sprint_sessions";

function loadSprintSessions(): SprintSession[] {
  try {
    return JSON.parse(localStorage.getItem(SPRINT_KEY) ?? "[]") as SprintSession[];
  } catch {
    return [];
  }
}

function persistSprintSession(session: SprintSession) {
  try {
    const prev = loadSprintSessions();
    localStorage.setItem(SPRINT_KEY, JSON.stringify([session, ...prev].slice(0, 20)));
  } catch {
    /* quota */
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WriteView() {
  const {
    activeNovel,
    activeSceneId,
    getActiveScene,
    updateSceneContent,
    updateScene,
    setActiveScene,
    novelSyncStatus,
    lastNovelSyncedAt,
  } = useNovelContext();
  const { user, preferences, updatePreferences } = useAuth();
  const scene = getActiveScene();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(scene?.content || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem("odinpad_editor_font_scale") ?? "1"));
  const [sprintSeconds, setSprintSeconds] = useState(0);
  const [sprintRunning, setSprintRunning] = useState(false);
  const [sprintAnnouncement, setSprintAnnouncement] = useState("");
  const [readingMode, setReadingMode] = useState(false);
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem("odinpad_write_focus_mode") === "1");

  // ── #15: per-project session goal ─────────────────────────────────────────
  const projectGoalKey = activeNovel ? `odinpad_project_goal_${activeNovel.id}` : null;
  const [projectGoal, setProjectGoal] = useState<number>(() => {
    if (!activeNovel) return 0;
    return Number(localStorage.getItem(`odinpad_project_goal_${activeNovel.id}`) ?? "0");
  });
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  useEffect(() => {
    if (!projectGoalKey) return;
    if (projectGoal > 0) {
      localStorage.setItem(projectGoalKey, String(projectGoal));
    } else {
      localStorage.removeItem(projectGoalKey);
    }
  }, [projectGoal, projectGoalKey]);

  // ── Item 1: online/offline state ──────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── Item 3: focus-mode escape hint (fades out after ~3 s) ─────────────────
  const [focusHintVisible, setFocusHintVisible] = useState(false);
  useEffect(() => {
    if (!focusMode) return;
    setFocusHintVisible(true);
    const t = window.setTimeout(() => setFocusHintVisible(false), 3200);
    return () => window.clearTimeout(t);
  }, [focusMode]);

  // ── Item 4: sprint history ────────────────────────────────────────────────
  const sprintStartWordsRef = useRef(0);
  const sprintStartTimeRef = useRef<string | null>(null);
  const [sprintSessions, setSprintSessions] = useState<SprintSession[]>(loadSprintSessions);
  const [showSprintHistory, setShowSprintHistory] = useState(false);
  const sprintHistoryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showSprintHistory) return;
    const handler = (e: MouseEvent) => {
      if (sprintHistoryRef.current && !sprintHistoryRef.current.contains(e.target as Node)) {
        setShowSprintHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSprintHistory]);

  // ── Item 2: breadcrumb path ───────────────────────────────────────────────
  const breadcrumb = useMemo(() => {
    if (!activeNovel || !activeSceneId) return null;
    for (const act of activeNovel.acts) {
      for (const ch of act.chapters) {
        if (ch.scenes.some((s) => s.id === activeSceneId)) {
          return { act: act.title, chapter: ch.title };
        }
      }
    }
    return null;
  }, [activeNovel, activeSceneId]);

  // ── Item 14: persist + restore last-edited scene ──────────────────────────
  useEffect(() => {
    if (!activeNovel?.id || !activeSceneId) return;
    try {
      localStorage.setItem(`odinpad_last_scene_${activeNovel.id}`, activeSceneId);
    } catch {
      /* quota */
    }
  }, [activeNovel?.id, activeSceneId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Only attempt restore when a novel is open but no scene is selected yet
    if (!activeNovel?.id || activeSceneId !== null) return;
    try {
      const lastScene = localStorage.getItem(`odinpad_last_scene_${activeNovel.id}`);
      if (!lastScene) return;
      const allIds = activeNovel.acts.flatMap((a) => a.chapters.flatMap((c) => c.scenes.map((s) => s.id)));
      if (allIds.includes(lastScene)) setActiveScene(lastScene);
    } catch {
      /* ignore */
    }
  }, [activeNovel?.id]); // intentionally only fire when the novel ID itself changes

  // ── Existing effects ──────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("odinpad_write_focus_mode", focusMode ? "1" : "0");
  }, [focusMode]);

  useEffect(() => {
    if (!focusMode) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      return;
    }
    const el = document.documentElement;
    void el.requestFullscreen().catch(() => {});
    return () => {
      if (document.fullscreenElement === el) void document.exitFullscreen().catch(() => {});
    };
  }, [focusMode]);

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  useEffect(() => {
    setLocalContent(scene?.content || "");
  }, [activeSceneId, scene?.content]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [localContent]);

  useEffect(() => {
    localStorage.setItem("odinpad_editor_font_scale", String(fontScale));
  }, [fontScale]);

  /** Local backup of the active scene for session loss / sign-out. */
  useEffect(() => {
    if (!activeNovel?.id || !activeSceneId) return;
    const key = `odinpad_scene_draft_${activeNovel.id}_${activeSceneId}`;
    try {
      localStorage.setItem(key, localContent);
    } catch {
      /* quota */
    }
  }, [activeNovel?.id, activeSceneId, localContent]);

  useEffect(() => {
    if (!sprintRunning) return;
    const timer = window.setInterval(() => setSprintSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, [sprintRunning]);

  // Debounce save
  useEffect(() => {
    if (!activeSceneId) return;
    const timer = setTimeout(() => {
      updateSceneContent(activeSceneId, localContent);
    }, 500);
    return () => clearTimeout(timer);
  }, [localContent, activeSceneId, updateSceneContent]);

  const allScenes = (activeNovel?.acts ?? []).flatMap((act) => act.chapters.flatMap((ch) => ch.scenes));
  const filteredScenes = allScenes.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return s.title.toLowerCase().includes(q) || (s.summary || "").toLowerCase().includes(q);
  });

  const wordCount = useIncrementalWordCount(localContent);
  const dailyGoal = preferences?.daily_word_goal ?? 500;
  const baseFontRem = preferences?.font_size ?? 1;

  useEffect(() => {
    if (!activeNovel || !scene || !preferences || preferences.first_100_words_at) return;
    if (wordCount < 100) return;
    void updatePreferences({ first_100_words_at: new Date().toISOString() });
    toast({
      title: "Great start!",
      description: "You reached your first 100 words. Keep going.",
    });
  }, [wordCount, activeNovel, scene, preferences, updatePreferences]);

  // ── Item 4: sprint toggle handler ─────────────────────────────────────────
  const handleSprintToggle = () => {
    if (!sprintRunning) {
      sprintStartWordsRef.current = wordCount;
      sprintStartTimeRef.current = new Date().toISOString();
      setSprintRunning(true);
    } else {
      const endedAt = new Date().toISOString();
      const wordsWritten = Math.max(0, wordCount - sprintStartWordsRef.current);
      if (sprintSeconds > 0) {
        persistSprintSession({
          date: endedAt,
          durationSecs: sprintSeconds,
          wordsWritten,
        });
        setSprintSessions(loadSprintSessions());
        if (user && sprintStartTimeRef.current) {
          void logWritingSession({
            userId: user.id,
            novelId: activeNovel?.id ?? null,
            startedAt: sprintStartTimeRef.current,
            endedAt,
            durationSecs: sprintSeconds,
            wordsWritten,
          }).catch(() => {
            /* fire-and-forget */
          });
        }
      }
      sprintStartTimeRef.current = null;
      setSprintRunning(false);
      setSprintSeconds(0);
      const mins = Math.floor(sprintSeconds / 60);
      const secs = sprintSeconds % 60;
      setSprintAnnouncement(
        `Sprint complete! ${mins} minute${mins !== 1 ? "s" : ""} ${secs} second${secs !== 1 ? "s" : ""}. ${wordsWritten} words written.`,
      );
    }
  };

  // ── Item 1: styled autosave chip config ───────────────────────────────────
  const syncChip = !isOnline
    ? {
        label: "Offline",
        cls: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
        dot: "bg-amber-500",
      }
    : novelSyncStatus === "syncing"
      ? {
          label: "Saving…",
          cls: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
          dot: "bg-blue-500 animate-pulse",
        }
      : novelSyncStatus === "error"
        ? {
            label: "Save failed",
            cls: "border-red-200 bg-red-50 text-destructive dark:border-red-700 dark:bg-red-950/60",
            dot: "bg-destructive",
          }
        : novelSyncStatus === "saved"
          ? {
              label: lastNovelSyncedAt
                ? `Saved ${new Date(lastNovelSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Saved",
              cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
              dot: "bg-emerald-500",
            }
          : null;

  // ─────────────────────────────────────────────────────────────────────────
  // If no scene selected, show scene list
  if (!scene) {
    return (
      <div className="w-full max-w-none p-3 sm:p-4">
        <h2 className="mb-6 text-2xl font-bold font-serif text-foreground">Workspace</h2>
        <p className="mb-6 text-muted-foreground text-sm">Select a scene to begin writing.</p>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search scenes..."
          className="mb-4 w-full rounded-sm border-2 border-border/70 bg-background/80 px-3 py-2 text-sm font-medium shadow-none outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="space-y-1">
          {filteredScenes.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveScene(s.id)}
              className="flex w-full items-center justify-between rounded-sm border-2 border-transparent px-4 py-3 text-left text-sm transition-colors hover:border-border hover:bg-muted"
            >
              <div>
                <span className="font-medium text-foreground">{s.title}</span>
                {s.summary && <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-md">{s.summary}</p>}
              </div>
              <span className="text-xs text-text-dim font-mono">{s.wordCount > 0 ? `${s.wordCount}w` : "empty"}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!activeNovel) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Assertive live region for sprint completion — announced immediately by screen readers */}
      <span role="status" aria-live="assertive" aria-atomic className="sr-only">
        {sprintAnnouncement}
      </span>

      {/* ── Item 3: fading focus-mode escape hint ─────────────────────────── */}
      <AnimatePresence>
        {focusMode && focusHintVisible && (
          <motion.div
            key="focus-hint"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -6 }}
            transition={{ delay: 2.2, duration: 0.8 }}
            className="pointer-events-none fixed bottom-10 left-1/2 z-[60] -translate-x-1/2"
            aria-hidden
          >
            <div className="rounded-full border border-white/20 bg-black/65 px-5 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
              Press{" "}
              <kbd className="mx-1 rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-xs">Esc</kbd>{" "}
              to exit focus mode
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {focusMode && (
        <div
          className="flex shrink-0 items-center justify-between border-b-2 border-teal-600/30 bg-teal-50/90 px-3 py-2 text-xs font-medium text-teal-950 dark:bg-teal-950/40 dark:text-teal-50"
          role="status"
        >
          <span>
            {wordCount.toLocaleString()} / {dailyGoal.toLocaleString()} words today (goal)
          </span>
          <span className="text-[10px] opacity-80">Esc to exit focus</span>
        </div>
      )}

      {/* Scene header */}
      <div
        className={`flex items-center gap-3 border-b-2 border-border/40 px-3 py-3 sm:px-4 ${focusMode ? "sr-only" : ""}`}
      >
        <button
          onClick={() => setActiveScene(null)}
          aria-label="Back to scene list"
          className="rounded-sm border-2 border-transparent p-1.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>

        {/* ── Item 2: breadcrumb + scene heading ───────────────────────────── */}
        <div className="min-w-0 flex-1">
          {breadcrumb && (
            <nav aria-label="Scene location" className="mb-0.5 flex items-center gap-0.5">
              <span className="max-w-[88px] truncate text-[10px] text-muted-foreground">{breadcrumb.act}</span>
              <ChevronRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" aria-hidden />
              <span className="max-w-[88px] truncate text-[10px] text-muted-foreground">{breadcrumb.chapter}</span>
            </nav>
          )}
          <h3 className="text-sm font-semibold text-foreground truncate">{scene.title}</h3>
          {scene.pov && <span className="text-xs text-muted-foreground">POV: {scene.pov}</span>}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-text-dim font-mono sm:gap-3">
          {/* ── Item 1: autosave status chip ─────────────────────────────────── */}
          {syncChip && (
            <span
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${syncChip.cls}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${syncChip.dot}`} aria-hidden />
              {syncChip.label}
            </span>
          )}

          <Button
            type="button"
            size="sm"
            variant={readingMode ? "secondary" : "outline"}
            className="h-7 gap-1 border-2 px-2 text-xs"
            onClick={() => setReadingMode((r) => !r)}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {readingMode ? "Edit" : "Read"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={focusMode ? "secondary" : "outline"}
            className="h-7 gap-1 border-2 px-2 text-xs"
            onClick={() => setFocusMode((f) => !f)}
          >
            {focusMode ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {focusMode ? "Exit focus" : "Focus"}
          </Button>
          <button
            type="button"
            onClick={handleSprintToggle}
            className="rounded-sm border-2 border-border px-2 py-1 font-semibold shadow-none transition-colors hover:bg-muted"
          >
            {sprintRunning ? "Stop sprint" : "Start sprint"}
          </button>

          {/* ── Item 4: timer + sprint history popover ────────────────────── */}
          <div className="relative" ref={sprintHistoryRef}>
            <button
              type="button"
              title="View sprint history"
              aria-label={`Sprint timer: ${Math.floor(sprintSeconds / 60)} minutes ${sprintSeconds % 60} seconds. Click for history.`}
              onClick={() => setShowSprintHistory((v) => !v)}
              className="flex items-center gap-1 rounded-sm border-2 border-transparent px-1 py-0.5 font-mono hover:border-border hover:bg-muted"
            >
              <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />
              {String(Math.floor(sprintSeconds / 60)).padStart(2, "0")}:{String(sprintSeconds % 60).padStart(2, "0")}
            </button>
            <AnimatePresence>
              {showSprintHistory && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-30 mt-1 min-w-[200px] rounded-sm border-2 border-border bg-card p-3 shadow-md text-xs"
                  role="region"
                  aria-label="Sprint history"
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                    Recent sprints
                  </p>
                  {sprintSessions.length === 0 ? (
                    <p className="italic text-muted-foreground">No sprints yet — start one above.</p>
                  ) : (
                    <ul className="space-y-1">
                      {sprintSessions.slice(0, 5).map((s, i) => (
                        <li key={i} className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            {Math.floor(s.durationSecs / 60)}m {s.durationSecs % 60}s
                          </span>
                          <span className="font-mono font-semibold text-foreground">+{s.wordsWritten}w</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span role="status" aria-live="polite">
            {wordCount} words
            {dailyGoal > 0 && (
              <span className="ml-1 text-muted-foreground">
                / {dailyGoal.toLocaleString()} goal ({Math.min(100, Math.round((wordCount / dailyGoal) * 100))}%)
              </span>
            )}
          </span>

          {/* ── #15: per-project session goal ─────────────────────────────── */}
          {showGoalInput ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(goalDraft, 10);
                if (!isNaN(n) && n >= 0) setProjectGoal(n);
                setShowGoalInput(false);
              }}
              className="flex items-center gap-1"
            >
              <input
                autoFocus
                type="number"
                min={0}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setShowGoalInput(false)}
                placeholder="Session goal"
                className="w-24 rounded-sm border-2 border-primary/50 bg-background px-1.5 py-0.5 text-xs focus:outline-none"
              />
              <button type="submit" className="text-[10px] font-semibold text-primary hover:underline">
                Set
              </button>
              <button
                type="button"
                onClick={() => setShowGoalInput(false)}
                className="text-[10px] text-muted-foreground hover:underline"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setGoalDraft(projectGoal > 0 ? String(projectGoal) : "");
                setShowGoalInput(true);
              }}
              className="rounded-sm border-2 border-transparent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              title="Set a session goal for this book"
            >
              {projectGoal > 0
                ? `Book goal: ${Math.min(100, Math.round((wordCount / projectGoal) * 100))}% (${wordCount}/${projectGoal})`
                : "+ Book goal"}
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center gap-2 border-b-2 border-border/30 px-6 py-2 text-xs ${focusMode ? "sr-only" : ""}`}
      >
        <label className="text-muted-foreground">Status</label>
        <Select
          value={scene.status}
          disabled={readingMode}
          onValueChange={(value) => updateScene(scene.id, { status: value as typeof scene.status })}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in-progress">In progress</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="revision">Revision</SelectItem>
          </SelectContent>
        </Select>
        <label className="ml-2 text-muted-foreground">Font</label>
        <button
          onClick={() => setFontScale((v) => Math.max(0.85, Number((v - 0.05).toFixed(2))))}
          aria-label="Decrease font size"
          className="rounded-sm border-2 border-border bg-background px-2 font-semibold shadow-none"
        >
          -
        </button>
        <span>{Math.round(fontScale * 100)}%</span>
        <button
          onClick={() => setFontScale((v) => Math.min(1.3, Number((v + 0.05).toFixed(2))))}
          aria-label="Increase font size"
          className="rounded-sm border-2 border-border bg-background px-2 font-semibold shadow-none"
        >
          +
        </button>
        {activeNovel.codexEntries.slice(0, 8).map((entry) => {
          const linked = (scene.codexRefs || []).includes(entry.id);
          return (
            <button
              key={entry.id}
              onClick={() =>
                updateScene(scene.id, {
                  codexRefs: linked
                    ? (scene.codexRefs || []).filter((id) => id !== entry.id)
                    : [...(scene.codexRefs || []), entry.id],
                })
              }
              className={`rounded-sm border-2 border-border px-2 py-1 text-xs font-semibold shadow-none transition-colors ${linked ? "border-primary bg-primary text-primary-foreground" : "bg-secondary/60 text-secondary-foreground"}`}
            >
              {entry.name}
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className={`w-full max-w-none px-4 py-8 sm:px-8 lg:px-12 ${readingMode ? "max-w-3xl mx-auto" : ""}`}>
          {readingMode ? (
            <div
              className="prose-editor min-h-[60vh] whitespace-pre-wrap text-foreground"
              style={{ fontSize: `${baseFontRem * fontScale}rem`, lineHeight: 1.75 }}
            >
              {localContent || "—"}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              data-tour="write-editor"
              placeholder="Begin writing your scene..."
              className="prose-editor w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/40 min-h-[60vh]"
              style={{ fontSize: `${baseFontRem * fontScale}rem`, lineHeight: 1.75 }}
              spellCheck
            />
          )}
        </div>
      </div>
    </div>
  );
}
