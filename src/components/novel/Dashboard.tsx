import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Bell,
  BellOff,
  BookOpen,
  Check,
  Clock,
  Inbox,
  Library,
  Menu,
  PenLine,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";
import { type ChangeEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { IdeaWebGardenWidget } from "@/components/idea-web/IdeaWebGardenWidget";
import { FirstRunDashboardChecklist } from "@/components/novel/FirstRunChecklist";
import { PageShell } from "@/components/motion/PageShell";
import { BookCreationAdvancedFields } from "@/components/novel/BookCreationAdvancedFields";
import { BookCreationSeriesStep } from "@/components/novel/BookCreationSeriesStep";
import { BookCreationStepIndicator } from "@/components/novel/BookCreationStepIndicator";
import { SeriesCreateDialog } from "@/components/novel/SeriesCreateDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppShell } from "@/contexts/AppShellContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { useDailyQuote } from "@/hooks/useDailyQuote";
import { useDailySeedPrompt } from "@/hooks/useDailySeedPrompt";
import { trackEvent } from "@/lib/analytics";
import type { BookCreationWizardStep } from "@/lib/book-creation";
import {
  bookCreateMetadataAnalytics,
  clearBookCreationDraft,
  loadBookCreationDraft,
  rankFrameworkRecommendations,
  saveBookCreationDraft,
  validateAndNormalizeBookCreation,
  validateBookCreationStep1,
  validateBookCreationStep2,
} from "@/lib/book-creation";
import {
  BOOK_GENRE_OPTIONS,
  type BookAudience,
  type BookPov,
  type BookTense,
  type WordCountPresetId,
} from "@/lib/book-metadata";
import { buildDashboardReminderRows, buildIdeaFeedPreviews } from "@/lib/dashboard-reminders";
import {
  deriveWritingChecklistState,
  loadWritingChecklistOverrides,
  mergeChecklistDone,
  saveWritingChecklistOverrides,
  toggleChecklistOverride,
  type WritingChecklistTaskId,
} from "@/lib/dashboard-writing-checklist";
import { parseAiCompanionSettings } from "@/lib/ai-companion-settings";
import { featureFlags } from "@/lib/feature-flags";
import {
  enrichIdeaWebEntry,
  fetchSparkSortIdeas,
  stretchIdeaText,
  type SparkSortLane,
  type StretchType,
} from "@/lib/idea-web-companion-client";
import { assertFileSizeWithin, FILE_SIZE_LIMITS } from "@/lib/file-upload-policy";
import { FOUNDATIONS_TRACK_LABEL } from "@/lib/first-run-checklist";
import { importMarkdownAsIdeas } from "@/lib/idea-web/import-markdown";
import { openIdeaWebQuickCapture } from "@/lib/idea-web/open-quick-capture";
import { getNovelWordCount, getPrimaryNovelOdysseyProgress, sortNovelsByRecent } from "@/lib/novel-metrics";
import { ROUTES } from "@/lib/routes";
import type { IdeaWebEntry } from "@/types/idea-web";
import { type BookSeriesRow, fetchBookSeriesForUser } from "@/lib/series-service";
import { STORY_FRAMEWORKS } from "@/lib/story-frameworks";
import {
  computeWritingStreak,
  fetchUserDailyStatsRange,
  getLocalISODate,
  getWeekStartLocal,
  sumWordsInRange,
} from "@/lib/user-stats-daily";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types/novel";

const shell = {
  brutal: "app-card transition-shadow duration-200",
  innerMuted: "rounded-lg border border-border bg-card shadow-sm transition-shadow duration-200",
  title: "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
  progressTrack: "h-2 w-full overflow-hidden rounded-full bg-secondary",
  progressFill: "h-full rounded-sm transition-[width] duration-300",
};

const SPARK_LANE_ORDER: SparkSortLane[] = ["theme", "character", "plot", "world", "misc"];

const SPARK_LANE_LABEL: Record<SparkSortLane, string> = {
  theme: "Theme",
  character: "Character",
  plot: "Plot",
  world: "World",
  misc: "Misc",
};

function inferSparkLaneLocal(entry: IdeaWebEntry | undefined): SparkSortLane {
  if (!entry) return "misc";
  const cat = (entry.category || "").trim().toLowerCase();
  const it = (entry.ideaType || "").trim().toLowerCase();
  const tags = (entry.tags || []).join(" ").toLowerCase();
  const hay = `${cat} ${it} ${tags}`;
  if (hay.includes("theme") || hay.includes("motif")) return "theme";
  if (hay.includes("character") || hay.includes("voice") || hay.includes("relationship")) return "character";
  if (hay.includes("plot") || hay.includes("scene") || hay.includes("twist") || hay.includes("tension")) return "plot";
  if (hay.includes("world") || hay.includes("setting") || hay.includes("lore") || hay.includes("culture"))
    return "world";
  return "misc";
}

function progressTone(pct: number): string {
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-400";
  return "bg-rose-500";
}

function novelProgressPct(novel: Novel): number {
  const w = getNovelWordCount(novel);
  const t = novel.targetWordCount ?? 50000;
  return t > 0 ? Math.min(100, Math.round((w / t) * 100)) : 0;
}

function novelGenreLabel(novel: Novel): string {
  return (novel.genre ?? "General").toUpperCase();
}

function novelStatusBadge(novel: Novel): "ACTIVE" | "COMPLETE" {
  return novel.status === "complete" ? "COMPLETE" : "ACTIVE";
}

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const {
    novels,
    activeNovel,
    addNovelWithOptions,
    setActiveNovel,
    ideaWebEntries,
    createGlobalIdeaWebEntry,
    refetchIdeaWeb,
    patchIdeaWebEntry,
  } = useNovelContext();
  const { user, preferences } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newGenre, setNewGenre] = useState("");
  const [newFrameworkId, setNewFrameworkId] = useState("three-act");
  const [newPremise, setNewPremise] = useState("");
  const [newTargetWordCount, setNewTargetWordCount] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newPenName, setNewPenName] = useState("");
  const [newLogline, setNewLogline] = useState("");
  const [newComparables, setNewComparables] = useState("");
  const [newSecondaryGenres, setNewSecondaryGenres] = useState<string[]>([]);
  const [newWordCountPreset, setNewWordCountPreset] = useState<WordCountPresetId | "">("");
  const [newSeriesScope, setNewSeriesScope] = useState<"standalone" | "series">("standalone");
  const [newSeriesId, setNewSeriesId] = useState("");
  const [newSeriesPosition, setNewSeriesPosition] = useState("");
  const [newAudience, setNewAudience] = useState<BookAudience | "">("");
  const [newContentWarnings, setNewContentWarnings] = useState<string[]>([]);
  const [newDefaultPov, setNewDefaultPov] = useState<BookPov | "">("");
  const [newDefaultTense, setNewDefaultTense] = useState<BookTense | "">("");
  const [newCoverImageDataUrl, setNewCoverImageDataUrl] = useState("");
  const [seriesRows, setSeriesRows] = useState<BookSeriesRow[]>([]);
  const [createStep, setCreateStep] = useState<BookCreationWizardStep>(1);
  const [postCreateDestination, setPostCreateDestination] = useState<"write" | "canvas">("write");
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [creationStartedAt, setCreationStartedAt] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const ideaImportRef = useRef<HTMLInputElement>(null);

  const [inlineCaptureText, setInlineCaptureText] = useState("");
  const [inlineCaptureSubmitting, setInlineCaptureSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [seedText, setSeedText] = useState("");
  const { setMobileNavOpen } = useAppShell();
  const dailyQuote = useDailyQuote();
  const [taskTab, setTaskTab] = useState<"all" | "pending" | "done">("all");
  const [checklistOverrides, setChecklistOverrides] = useState(loadWritingChecklistOverrides);

  const sortedNovels = useMemo(() => sortNovelsByRecent(novels), [novels]);
  const primaryNovel = useMemo(() => {
    if (activeNovel) return activeNovel;
    return sortedNovels[0] ?? null;
  }, [activeNovel, sortedNovels]);

  const [statsByDate, setStatsByDate] = useState<Map<string, number>>(() => new Map());
  const [statsLoading, setStatsLoading] = useState(true);
  const [goalMode] = useState<"daily" | "rolling_7day">(
    () => (localStorage.getItem("odinpad_goal_mode") as "daily" | "rolling_7day") ?? "daily",
  );

  const dailyGoal = preferences?.daily_word_goal ?? 500;
  const odysseyProgress = useMemo(() => getPrimaryNovelOdysseyProgress(primaryNovel), [primaryNovel]);
  const primaryWordCount = primaryNovel ? getNovelWordCount(primaryNovel) : 0;

  const todayIso = getLocalISODate();
  const wordsToday = statsByDate.get(todayIso) ?? 0;

  const rolling7Avg = useMemo(() => {
    let total = 0;
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      total += statsByDate.get(getLocalISODate(d)) ?? 0;
    }
    return Math.round(total / 7);
  }, [statsByDate]);

  const effectiveGoal = goalMode === "rolling_7day" ? rolling7Avg : dailyGoal;

  const derivedWritingChecklist = useMemo(
    () =>
      deriveWritingChecklistState({
        wordsToday,
        dailyGoal,
        ideaWebEntries,
        todayIso,
        hasActiveNovel: Boolean(activeNovel),
        firstRunWriteOpened: preferences?.first_run_write_opened,
      }),
    [wordsToday, dailyGoal, ideaWebEntries, todayIso, activeNovel, preferences?.first_run_write_opened],
  );

  const dashTasks = useMemo(() => {
    const merged = mergeChecklistDone(derivedWritingChecklist, checklistOverrides);
    return [
      { id: "daily" as const, label: "Hit your daily word goal", done: merged.daily },
      { id: "idea" as const, label: "Capture one idea in Idea Web", done: merged.idea },
      { id: "open" as const, label: "Active project or Write session", done: merged.open },
    ];
  }, [derivedWritingChecklist, checklistOverrides]);

  const handleWritingChecklistToggle = useCallback(
    (id: WritingChecklistTaskId) => {
      setChecklistOverrides((prev) => {
        const next = toggleChecklistOverride(id, derivedWritingChecklist, prev);
        saveWritingChecklistOverrides(next);
        trackEvent("writing_checklist_manual_toggle", { task: id });
        return next;
      });
    },
    [derivedWritingChecklist],
  );
  const dailyPct = effectiveGoal > 0 ? Math.min(100, Math.round((wordsToday / effectiveGoal) * 100)) : 0;

  const weekWords = (() => {
    const startIso = getLocalISODate(getWeekStartLocal());
    const endIso = getLocalISODate();
    return sumWordsInRange(statsByDate, startIso, endIso);
  })();

  const streakDays = useMemo(
    () => computeWritingStreak(statsByDate, dailyGoal, preferences?.streak_rest_date),
    [statsByDate, dailyGoal, preferences?.streak_rest_date],
  );

  const dailySeedPrompt = useDailySeedPrompt(streakDays);

  const [lastSeedEntryId, setLastSeedEntryId] = useState<string | null>(null);
  const [lastSeedBody, setLastSeedBody] = useState("");
  const [stretchBusy, setStretchBusy] = useState<StretchType | null>(null);
  const [stretchOut, setStretchOut] = useState("");
  const lastSeedAi = useMemo(() => {
    if (!lastSeedEntryId) return null;
    const ent = ideaWebEntries.find((e) => e.id === lastSeedEntryId);
    const raw = ent?.metadata && typeof ent.metadata === "object" ? (ent.metadata as Record<string, unknown>).ai : null;
    return raw && typeof raw === "object"
      ? (raw as { tags?: string[]; one_line_summary?: string; suggested_status?: string })
      : null;
  }, [lastSeedEntryId, ideaWebEntries]);

  const aiCompanionUi = parseAiCompanionSettings(preferences?.ai_companion);

  const loadWritingStats = useCallback(async () => {
    if (!user?.id) {
      setStatsByDate(new Map());
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - 400);
    const fromIso = getLocalISODate(from);
    const toIso = getLocalISODate();
    const map = await fetchUserDailyStatsRange(user.id, fromIso, toIso);
    setStatsByDate(map);
    setStatsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadWritingStats();
  }, [loadWritingStats]);

  useEffect(() => {
    if (!user?.id) return;
    const t = window.setInterval(() => void loadWritingStats(), 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") void loadWritingStats();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user?.id, loadWritingStats]);

  useEffect(() => {
    if (statsLoading || dailyPct < 100) return;
    if (!preferences?.reminder_streak) return;
    const key = `odinpad_goal_toast_${todayIso}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    toast({
      title: "Daily goal met",
      description: "Nice work — rest or keep the streak going.",
    });
  }, [statsLoading, dailyPct, todayIso, preferences?.reminder_streak]);

  const prevDerivedChecklistRef = useRef<Record<WritingChecklistTaskId, boolean> | null>(null);
  useEffect(() => {
    const curr = derivedWritingChecklist;
    const prev = prevDerivedChecklistRef.current;
    if (prev) {
      (["daily", "idea", "open"] as const).forEach((id) => {
        if (!prev[id] && curr[id]) {
          const key = `odinpad_wc_auto_${todayIso}_${id}`;
          if (typeof localStorage !== "undefined" && !localStorage.getItem(key)) {
            localStorage.setItem(key, "1");
            trackEvent("writing_checklist_auto_complete", { task: id, date: todayIso });
          }
        }
      });
    }
    prevDerivedChecklistRef.current = curr;
  }, [derivedWritingChecklist, todayIso]);

  const prevOdysseyNovelIdRef = useRef<string | null>(null);
  const prevOdysseyRankRef = useRef<string | null>(null);
  useEffect(() => {
    if (!primaryNovel) {
      prevOdysseyNovelIdRef.current = null;
      prevOdysseyRankRef.current = null;
      return;
    }
    if (prevOdysseyNovelIdRef.current !== primaryNovel.id) {
      prevOdysseyNovelIdRef.current = primaryNovel.id;
      prevOdysseyRankRef.current = odysseyProgress.rank;
      return;
    }
    const r = odysseyProgress.rank;
    if (prevOdysseyRankRef.current !== null && prevOdysseyRankRef.current !== r) {
      trackEvent("odyssey_rank_changed", {
        from: prevOdysseyRankRef.current,
        to: r,
        source: "dashboard",
        novelId: primaryNovel.id,
      });
    }
    prevOdysseyRankRef.current = r;
  }, [odysseyProgress.rank, primaryNovel]);

  const weeklyWordGoalPref = preferences?.weekly_word_goal ?? 3500;
  const reminderBlock = useMemo(
    () => buildDashboardReminderRows({ ideaWebEntries, weekWords, weeklyWordGoal: weeklyWordGoalPref }),
    [ideaWebEntries, weekWords, weeklyWordGoalPref],
  );
  const ideaFeedPreviews = useMemo(() => buildIdeaFeedPreviews(ideaWebEntries, 12), [ideaWebEntries]);

  const entryById = useMemo(() => {
    const m = new Map<string, IdeaWebEntry>();
    for (const e of ideaWebEntries) m.set(e.id, e);
    return m;
  }, [ideaWebEntries]);

  const [sparkLaneById, setSparkLaneById] = useState<Partial<Record<string, SparkSortLane>>>({});

  const ideaSortFingerprint = useMemo(
    () =>
      ideaFeedPreviews
        .map((p) => {
          const e = entryById.get(p.id);
          return e ? `${e.id}:${e.updatedAt}` : p.id;
        })
        .join("|"),
    [ideaFeedPreviews, entryById],
  );

  useEffect(() => {
    if (!user?.id || !featureFlags.aiEditorial || ideaFeedPreviews.length === 0) {
      setSparkLaneById({});
      return;
    }
    const payload = ideaFeedPreviews
      .map((p) => entryById.get(p.id))
      .filter((e): e is IdeaWebEntry => Boolean(e))
      .map((e) => ({ id: e.id, title: e.title, body: e.body.slice(0, 500) }));
    if (payload.length === 0) {
      setSparkLaneById({});
      return;
    }
    let cancelled = false;
    void fetchSparkSortIdeas(payload)
      .then((r) => {
        if (cancelled) return;
        const next: Partial<Record<string, SparkSortLane>> = {};
        for (const a of r.assignments) {
          next[a.id] = a.lane;
        }
        setSparkLaneById(next);
      })
      .catch(() => {
        if (!cancelled) setSparkLaneById({});
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, ideaSortFingerprint, featureFlags.aiEditorial]);

  const ideaPreviewsByLane = useMemo(() => {
    const buckets: Record<SparkSortLane, typeof ideaFeedPreviews> = {
      theme: [],
      character: [],
      plot: [],
      world: [],
      misc: [],
    };
    for (const item of ideaFeedPreviews) {
      const entry = entryById.get(item.id);
      const lane = sparkLaneById[item.id] ?? inferSparkLaneLocal(entry);
      buckets[lane].push(item);
    }
    return buckets;
  }, [ideaFeedPreviews, entryById, sparkLaneById]);

  const filteredDashTasks = useMemo(() => {
    if (taskTab === "all") return dashTasks;
    if (taskTab === "pending") return dashTasks.filter((t) => !t.done);
    return dashTasks.filter((t) => t.done);
  }, [dashTasks, taskTab]);

  const submitInlineCapture = async () => {
    const text = inlineCaptureText.trim();
    if (!text || inlineCaptureSubmitting) return;
    setInlineCaptureSubmitting(true);
    try {
      await createGlobalIdeaWebEntry({ title: text.slice(0, 120), body: text });
      setInlineCaptureText("");
      toast({ title: "Idea captured", description: "Saved to your Idea Web inbox." });
    } catch {
      toast({ title: "Capture failed", variant: "destructive" });
    } finally {
      setInlineCaptureSubmitting(false);
    }
  };

  const onImportIdeasMarkdown: ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id) return;
    void (async () => {
      try {
        assertFileSizeWithin(file, FILE_SIZE_LIMITS.markdownTextBytes, "Markdown file");
        const text = await file.text();
        const n = await importMarkdownAsIdeas(user.id, null, text, file.name);
        await refetchIdeaWeb();
        toast({ title: "Ideas imported", description: `${n} entr${n === 1 ? "y" : "ies"} added to Idea Web.` });
      } catch {
        toast({ title: "Import failed", variant: "destructive" });
      }
    })();
  };

  const filteredForOverview = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedNovels;
    return sortedNovels.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        (n.genre ?? "").toLowerCase().includes(q) ||
        (n.series ?? "").toLowerCase().includes(q) ||
        (n.subtitle ?? "").toLowerCase().includes(q),
    );
  }, [sortedNovels, searchQuery]);

  const frameworkRecommendations = useMemo(
    () =>
      rankFrameworkRecommendations({
        selectedGenre: newGenre,
        preferredGenres: preferences?.genres,
        writingStyle: preferences?.writing_style,
        primaryGoal: preferences?.primary_goal,
        fallbackFrameworkId: preferences?.default_framework_id,
      }),
    [
      newGenre,
      preferences?.default_framework_id,
      preferences?.genres,
      preferences?.primary_goal,
      preferences?.writing_style,
    ],
  );

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setFormWarning(null);
    setCreationStartedAt(Date.now());
    trackEvent("book_create_started", { source: "dashboard" });
    const userId = user?.id;
    if (userId) {
      void fetchBookSeriesForUser(userId)
        .then(setSeriesRows)
        .catch(() => setSeriesRows([]));
    } else {
      setSeriesRows([]);
    }
    if (userId) {
      const draft = loadBookCreationDraft(userId);
      if (draft) {
        setNewTitle(draft.title);
        setNewAuthor(draft.author);
        setNewGenre(draft.genre);
        setNewFrameworkId(draft.frameworkId);
        setNewPremise(draft.premise);
        setNewTargetWordCount(draft.targetWordCount);
        setCreateStep(draft.wizardStep ?? 1);
        setNewSubtitle(draft.subtitle);
        setNewPenName(draft.penName);
        setNewLogline(draft.logline);
        setNewComparables(draft.comparables);
        setNewSecondaryGenres(Array.isArray(draft.secondaryGenres) ? draft.secondaryGenres : []);
        setNewWordCountPreset(draft.wordCountPreset);
        setNewSeriesScope(draft.seriesScope ?? (draft.seriesId ? "series" : "standalone"));
        setNewSeriesId(draft.seriesId);
        setNewSeriesPosition(draft.seriesPosition);
        setNewAudience(draft.audience);
        setNewContentWarnings(draft.contentWarnings);
        setNewDefaultPov(draft.defaultPov);
        setNewDefaultTense(draft.defaultTense);
        setNewCoverImageDataUrl(draft.coverImageDataUrl ?? "");
        setDraftRestored(true);
        return;
      }
    }
    setDraftRestored(false);
    setNewTitle("");
    setNewAuthor(user?.name ?? "Anonymous");
    setNewGenre(preferences?.genres?.[0] ?? "General");
    setNewFrameworkId(preferences?.default_framework_id ?? "three-act");
    setNewPremise("");
    setNewTargetWordCount("");
    setNewSubtitle("");
    setNewPenName("");
    setNewLogline("");
    setNewComparables("");
    setNewSecondaryGenres([]);
    setNewWordCountPreset("");
    setNewSeriesScope("standalone");
    setNewSeriesId("");
    setNewSeriesPosition("");
    setNewAudience("");
    setNewContentWarnings([]);
    setNewDefaultPov("");
    setNewDefaultTense("");
    setNewCoverImageDataUrl("");
    setCreateStep(1);
    setPostCreateDestination("write");
  }, [open, preferences?.default_framework_id, preferences?.genres, user?.id, user?.name]);

  useEffect(() => {
    if (!open || !user?.id) return;
    saveBookCreationDraft(user.id, {
      title: newTitle,
      author: newAuthor,
      genre: newGenre,
      frameworkId: newFrameworkId,
      premise: newPremise,
      targetWordCount: newTargetWordCount,
      advancedOpen: createStep >= 3,
      wizardStep: createStep,
      subtitle: newSubtitle,
      penName: newPenName,
      logline: newLogline,
      comparables: newComparables,
      secondaryGenres: newSecondaryGenres,
      wordCountPreset: newWordCountPreset,
      seriesScope: newSeriesScope,
      seriesId: newSeriesId,
      seriesPosition: newSeriesPosition,
      audience: newAudience,
      contentWarnings: newContentWarnings,
      defaultPov: newDefaultPov,
      defaultTense: newDefaultTense,
      coverImageDataUrl: newCoverImageDataUrl,
    });
  }, [
    createStep,
    newAudience,
    newAuthor,
    newComparables,
    newContentWarnings,
    newCoverImageDataUrl,
    newDefaultPov,
    newDefaultTense,
    newFrameworkId,
    newGenre,
    newLogline,
    newPenName,
    newPremise,
    newSecondaryGenres,
    newSeriesId,
    newSeriesPosition,
    newSeriesScope,
    newSubtitle,
    newTargetWordCount,
    newTitle,
    newWordCountPreset,
    open,
    user?.id,
  ]);

  const handleCreate = () => {
    const seriesTitleById = new Map(seriesRows.map((s) => [s.id, s.title]));
    const validation = validateAndNormalizeBookCreation(
      {
        title: newTitle,
        author: newAuthor,
        genre: newGenre || "General",
        frameworkId: newFrameworkId,
        premise: newPremise,
        targetWordCount: newTargetWordCount,
        status: postCreateDestination === "canvas" ? "outlining" : "drafting",
        subtitle: newSubtitle,
        penName: newPenName,
        logline: newLogline,
        comparables: newComparables,
        secondaryGenres: newSecondaryGenres,
        wordCountPreset: newWordCountPreset || undefined,
        seriesMode: newSeriesScope,
        seriesId: newSeriesScope === "standalone" ? undefined : newSeriesId || undefined,
        seriesPosition: newSeriesPosition,
        audience: newAudience,
        contentWarnings: newContentWarnings,
        defaultPov: newDefaultPov,
        defaultTense: newDefaultTense,
        coverImageDataUrl: newCoverImageDataUrl,
      },
      novels.map((n) => ({ title: n.title, seriesId: n.seriesId })),
      seriesTitleById,
    );
    setFormError(validation.errors[0] ?? null);
    setFormWarning(validation.warnings[0] ?? null);
    if (validation.errors.length > 0) {
      trackEvent("book_create_failed", {
        source: "dashboard",
        reason: validation.errors[0],
      });
      return;
    }

    trackEvent("book_create_submitted", {
      source: "dashboard",
      frameworkId: validation.normalized.frameworkId,
      hasPremise: Boolean(validation.normalized.premise),
      hasTargetWordCount: Boolean(validation.normalized.targetWordCount),
      hasSeries: Boolean(validation.normalized.seriesId),
      destination: postCreateDestination,
      ...bookCreateMetadataAnalytics(validation.normalized),
    });

    const n = validation.normalized;
    addNovelWithOptions(n.title, n.author, {
      genre: n.genre,
      premise: n.premise,
      targetWordCount: n.targetWordCount,
      frameworkId: n.frameworkId,
      status: n.status,
      penName: n.penName,
      subtitle: n.subtitle,
      secondaryGenres: n.secondaryGenres,
      logline: n.logline,
      comparables: n.comparables,
      wordCountPreset: n.wordCountPreset,
      seriesId: n.seriesId,
      seriesTitle: n.seriesTitle,
      seriesPosition: n.seriesPosition,
      audience: n.audience,
      contentWarnings: n.contentWarnings,
      defaultPov: n.defaultPov,
      defaultTense: n.defaultTense,
      coverImageDataUrl: n.coverImageDataUrl,
    });
    if (user?.id) clearBookCreationDraft(user.id);
    trackEvent("book_create_succeeded", {
      source: "dashboard",
      frameworkId: validation.normalized.frameworkId,
      destination: postCreateDestination,
      ...bookCreateMetadataAnalytics(validation.normalized),
    });
    if (creationStartedAt) {
      trackEvent("book_create_time_ms", {
        source: "dashboard",
        duration: Date.now() - creationStartedAt,
        ...bookCreateMetadataAnalytics(validation.normalized),
      });
    }
    setOpen(false);
    setCreateStep(1);
  };

  const goNextFromStep1 = () => {
    const err = validateBookCreationStep1({
      title: newTitle,
      genre: newGenre || "General",
      frameworkId: newFrameworkId,
    });
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setCreateStep(2);
  };

  const goNextFromStep2 = () => {
    const err = validateBookCreationStep2({
      seriesScope: newSeriesScope,
      seriesId: newSeriesId,
    });
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setCreateStep(3);
  };

  const goBackWizard = () => {
    setFormError(null);
    setCreateStep((s) => (s === 3 ? 2 : 1));
  };

  const displayName = user?.name?.split(/\s+/)[0] ?? "Writer";

  const logSeed = () => {
    const text = seedText.trim();
    if (!text) {
      toast({ title: "Nothing to log", description: "Type a line or two in the seed prompt.", variant: "destructive" });
      return;
    }
    void (async () => {
      try {
        const entry = await createGlobalIdeaWebEntry({
          title: text.slice(0, 200),
          body: text,
          metadata: { daily_seed_log: true },
        });
        setSeedText("");
        setLastSeedEntryId(entry?.id ?? null);
        setLastSeedBody(text);
        setStretchOut("");
        toast({ title: "Logged to Idea Web", description: "Saved to your inbox (assign to a project from there)." });
        const ai = parseAiCompanionSettings(preferences?.ai_companion);
        if (entry?.id && featureFlags.aiEditorial && ai.auto_enrich_enabled) {
          try {
            await enrichIdeaWebEntry(entry.id);
            await refetchIdeaWeb();
          } catch {
            /* enrichment is best-effort */
          }
        }
      } catch {
        toast({ title: "Could not save", variant: "destructive" });
      }
    })();
  };

  const runStretch = (t: StretchType) => {
    const body = lastSeedBody.trim();
    if (!body) return;
    const ai = parseAiCompanionSettings(preferences?.ai_companion);
    if (!featureFlags.aiEditorial || !ai.stretch_variants_enabled) return;
    setStretchBusy(t);
    setStretchOut("");
    void stretchIdeaText(body, t)
      .then((r) => {
        if (t === "whatifs" && r.whatifs?.length) {
          setStretchOut(r.whatifs.map((q, i) => `${i + 1}. ${q}`).join("\n"));
        } else if (r.text) {
          setStretchOut(r.text);
        }
      })
      .catch(() => toast({ title: "Stretch failed", variant: "destructive" }))
      .finally(() => setStretchBusy(null));
  };

  /** Two most recently updated manuscripts (search respects same order). Third dashboard slot is always "Add project". */
  const recentTwoManuscripts = useMemo(() => filteredForOverview.slice(0, 2), [filteredForOverview]);

  return (
    <PageShell className="page-viewport w-full min-h-dvh bg-background">
      <div className="flex min-h-dvh w-full flex-col bg-background">
        <header className="flex shrink-0 flex-col gap-4 border-b border-border bg-background px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <p className="mt-1 text-xs">
                <Link
                  to="/help#help-dashboard"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  About the dashboard
                </Link>
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative min-w-[200px] max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground opacity-60" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="bg-background pl-9 placeholder:text-muted-foreground/70"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="hidden border border-border bg-card shadow-sm sm:inline-flex"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border border-border bg-card font-semibold shadow-sm"
              onClick={() => setSeriesDialogOpen(true)}
            >
              <Library className="mr-1 h-4 w-4" />
              New series
            </Button>
            <Button
              type="button"
              className="bg-primary font-semibold text-white shadow-md hover:bg-primary/90"
              onClick={() => setOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Create new
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
          <motion.div
            className="space-y-6"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28 }}
          >
            {/* Greeting — neo-brutalist hero */}
            <div className={`${shell.brutal} relative overflow-hidden border-primary bg-card p-5 md:p-6`}>
              <div className="absolute right-4 top-4 hidden h-24 w-28 md:block" aria-hidden>
                <div className="h-full w-full rounded-2xl border border-border bg-primary/20" />
              </div>
              <div className="relative max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Writing desk</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {greetingForNow()}, {displayName}
                </p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  You&apos;re building momentum — small sessions add up.
                </p>
                {(preferences?.reminder_daily ?? true) && (
                  <div className="mt-4 border-l-4 border-primary pl-4">
                    <p className="text-lg font-medium italic leading-snug text-foreground/80 md:text-xl">
                      {dailyQuote.loading ? (
                        <span className="text-muted-foreground not-italic">Fetching today&apos;s line…</span>
                      ) : (
                        <>&ldquo;{dailyQuote.quote}&rdquo;</>
                      )}
                    </p>
                    {!dailyQuote.loading && (
                      <p className="mt-2 text-xs font-semibold text-neutral-600">
                        — {dailyQuote.character}, <span className="italic text-neutral-700">{dailyQuote.work}</span>
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      {
                        k: "today",
                        label: "Today",
                        sub: "words written",
                        value: statsLoading ? "—" : wordsToday.toLocaleString(),
                      },
                      {
                        k: "goal",
                        label: goalMode === "rolling_7day" ? "7-day avg" : "Goal",
                        sub: goalMode === "rolling_7day" ? "rolling average" : "daily target",
                        value: statsLoading ? "—" : effectiveGoal.toLocaleString(),
                      },
                      {
                        k: "streak",
                        label: "Streak",
                        sub: "current streak",
                        value: statsLoading ? "—" : `${streakDays} day${streakDays === 1 ? "" : "s"}`,
                      },
                      {
                        k: "week",
                        label: "This week",
                        sub: "words written",
                        value: statsLoading ? "—" : weekWords.toLocaleString(),
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.k}
                      className="rounded-xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                        {item.label}
                      </p>
                      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                        {item.value}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{item.sub}</p>
                    </div>
                  ))}
                </div>
                {effectiveGoal > 0 && (
                  <div className="mt-4 max-w-md">
                    <div className={shell.progressTrack}>
                      <div
                        className={cn(shell.progressFill, progressTone(dailyPct))}
                        style={{ width: `${dailyPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-neutral-600">
                      {dailyPct}% of {goalMode === "rolling_7day" ? "7-day rolling avg" : "today's goal"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Writer profile card */}
            {(preferences?.writing_style || preferences?.primary_goal || (preferences?.genres?.length ?? 0) > 0) && (
              <div
                className={`${shell.brutal} flex flex-wrap items-center gap-4 border-violet-400/40 bg-card p-4`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
                  <Sparkles className="h-5 w-5 text-violet-700" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Writer profile</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {preferences?.writing_style && (
                      <span className="inline-flex items-center border border-border bg-secondary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">
                        {preferences.writing_style}
                      </span>
                    )}
                    {preferences?.primary_goal && (
                      <span className="inline-flex items-center border border-border bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">
                        {preferences.primary_goal.replace(/_/g, " ")}
                      </span>
                    )}
                    {preferences?.genres?.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary"
                      >
                        {g}
                      </span>
                    ))}
                    {preferences?.daily_word_goal && preferences.daily_word_goal > 0 && (
                      <span className="inline-flex items-center border border-border bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">
                        {preferences.daily_word_goal.toLocaleString()} words/day
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to="/settings"
                  className="shrink-0 text-xs font-semibold text-muted-foreground underline hover:text-foreground"
                >
                  Recalibrate
                </Link>
              </div>
            )}

            {/* Spark desk + Quick actions | Idea Web — same row height on large screens */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-5">
              <div className="flex min-h-0 flex-col gap-4 lg:col-span-8 lg:h-full">
                <div
                  id="spark-desk"
                  className={`${shell.brutal} flex min-h-0 flex-1 flex-col overflow-y-auto border-border bg-card p-4 md:p-5`}
                >
                  <p className={shell.title}>Spark desk</p>
                  <p
                    className={cn(
                      "mt-3 text-base font-semibold leading-snug text-foreground md:text-lg",
                      dailySeedPrompt.loading && "animate-pulse text-muted-foreground",
                    )}
                  >
                    &ldquo;{dailySeedPrompt.prompt}&rdquo;
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={seedText}
                      onChange={(e) => setSeedText(e.target.value)}
                      placeholder="Type your idea here..."
                      className="flex-1 border border-border font-medium shadow-sm placeholder:text-muted-foreground/60"
                      onKeyDown={(e) => e.key === "Enter" && logSeed()}
                    />
                    <Button
                      type="button"
                      className="border border-border bg-foreground text-background hover:bg-foreground/90"
                      onClick={logSeed}
                    >
                      Log
                    </Button>
                  </div>
                  {lastSeedAi && (lastSeedAi.tags?.length || lastSeedAi.one_line_summary) ? (
                    <div className="mt-3 rounded-md border border-border bg-card/90 px-3 py-2 text-xs">
                      {lastSeedAi.one_line_summary ? (
                        <p className="font-medium text-foreground">{lastSeedAi.one_line_summary}</p>
                      ) : null}
                      {lastSeedAi.tags && lastSeedAi.tags.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {lastSeedAi.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-border bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-700"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {lastSeedAi.suggested_status ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Suggested status: {lastSeedAi.suggested_status}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {featureFlags.aiEditorial && aiCompanionUi.stretch_variants_enabled && lastSeedBody.trim() ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Stretch this seed
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(["paragraph", "whatifs", "opposite"] as const).map((t) => (
                          <Button
                            key={t}
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={stretchBusy !== null}
                            className="border border-border bg-card text-xs"
                            onClick={() => runStretch(t)}
                          >
                            {stretchBusy === t
                              ? "…"
                              : t === "whatifs"
                                ? "What if…"
                                : t === "opposite"
                                  ? "Opposite"
                                  : "Paragraph"}
                          </Button>
                        ))}
                      </div>
                      {stretchOut ? (
                        <pre className="whitespace-pre-wrap rounded-md border border-border bg-card p-2 text-xs text-foreground/80">
                          {stretchOut}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={`${shell.brutal} shrink-0 bg-card p-4 md:p-5`}>
                  <p className={shell.title}>Quick actions</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setOpen(true)}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-4 text-center shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      <Plus className="h-5 w-5 text-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        New project
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/library")}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-4 text-center shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      <BookOpen className="h-5 w-5 text-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        Library
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/inbox")}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-4 text-center shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      <Inbox className="h-5 w-5 text-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        Idea Web
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/stats")}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-4 text-center shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      <BarChart3 className="h-5 w-5 text-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        Stats
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openIdeaWebQuickCapture()}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-4 text-center shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      <Sparkles className="h-5 w-5 text-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        Capture idea
                      </span>
                    </button>
                    {featureFlags.settingsCommandCenter && (
                      <button
                        type="button"
                        onClick={() => navigate("/settings")}
                        className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-4 text-center shadow-sm transition-transform hover:-translate-y-0.5"
                      >
                        <Settings className="h-5 w-5 text-foreground" />
                        <span className="text-xs font-medium text-foreground">
                          Settings
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div
                id="recent-ideas"
                className={`${shell.brutal} flex min-h-0 flex-col border-border bg-card p-4 md:p-4 lg:col-span-4 lg:h-full`}
              >
                <p className={shell.title}>Idea Web</p>
                <form
                  className="mt-2 shrink-0 flex gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitInlineCapture();
                  }}
                >
                  <input
                    type="text"
                    value={inlineCaptureText}
                    onChange={(e) => setInlineCaptureText(e.target.value)}
                    placeholder="Capture a spark…"
                    aria-label="Quick idea capture"
                    disabled={inlineCaptureSubmitting}
                    className="min-w-0 flex-1 rounded-sm border border-primary/30 bg-card/70 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!inlineCaptureText.trim() || inlineCaptureSubmitting}
                    aria-label="Save idea"
                    className="shrink-0 rounded-sm border border-primary/50 bg-primary px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    {inlineCaptureSubmitting ? "…" : "Save"}
                  </button>
                </form>
                <p className="mt-1 shrink-0 text-[11px] text-muted-foreground">
                  Recent captures sorted by theme, character, plot, world, or misc.
                </p>
                <input
                  ref={ideaImportRef}
                  type="file"
                  accept=".md,.txt,text/markdown,text/plain"
                  className="hidden"
                  onChange={onImportIdeasMarkdown}
                />
                <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {ideaFeedPreviews.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No ideas yet.</p>
                  ) : (
                    SPARK_LANE_ORDER.map((lane) => {
                      const items = ideaPreviewsByLane[lane];
                      if (items.length === 0) return null;
                      return (
                        <div key={lane}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                            {SPARK_LANE_LABEL[lane]}
                          </p>
                          <ul className="mt-1.5 space-y-1.5">
                            {items.map((item) => (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  className="w-full rounded-md border border-border bg-card/90 px-2 py-1.5 text-left text-xs hover:bg-accent"
                                  onClick={() => navigate(`${ROUTES.inbox}?entry=${encodeURIComponent(item.id)}`)}
                                >
                                  <span className="text-[9px] font-semibold uppercase tracking-wide text-primary">
                                    {item.scope}
                                  </span>
                                  <p className="text-[13px] leading-snug text-foreground">{item.line}</p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-3 flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border border-border bg-card"
                    onClick={() => navigate("/inbox")}
                  >
                    Open Idea Web
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="border border-border bg-primary text-white hover:bg-primary/90"
                    onClick={() => openIdeaWebQuickCapture()}
                  >
                    Quick capture
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="border border-border bg-card"
                    onClick={() => ideaImportRef.current?.click()}
                  >
                    Import .md
                  </Button>
                </div>
                <div className={`${shell.innerMuted} mt-3 shrink-0 p-3`}>
                  <IdeaWebGardenWidget entries={ideaWebEntries} />
                </div>
              </div>
            </div>

            <div id="first-run-checklist">
              <FirstRunDashboardChecklist onOpenCreateProject={() => setOpen(true)} />
            </div>

            {/* Project overview — manuscript cards */}
            <div>
              <div className="mb-3 flex items-end justify-between gap-2">
                <h2 className="text-lg font-bold text-foreground">Active manuscripts</h2>
                <span className="text-xs font-medium text-muted-foreground">
                  {sortedNovels.length === 0 ? "Create a book to get started" : "Open a book to keep writing"}
                </span>
              </div>
              <div
                className={cn(
                  "grid grid-cols-1 gap-5",
                  sortedNovels.length === 0 ? "mx-auto max-w-xl" : "lg:grid-cols-3",
                )}
              >
                {sortedNovels.length > 0 &&
                  recentTwoManuscripts.map((novel, slotIndex) => {
                    const pct = novelProgressPct(novel);
                    const words = getNovelWordCount(novel);
                    const target = novel.targetWordCount ?? 50000;
                    const featured = slotIndex === 0 || novel.id === activeNovel?.id;
                    const status = novelStatusBadge(novel);
                    const openBook = () => {
                      setActiveNovel(novel.id);
                      navigate("/", { replace: true });
                    };
                    return (
                      <div
                        key={novel.id}
                        className={`${shell.brutal} flex w-full flex-col bg-card p-5 text-left shadow-sm transition-transform hover:-translate-y-0.5`}
                      >
                        <h3 className="font-serif text-xl font-bold leading-snug tracking-tight text-foreground md:text-[1.35rem]">
                          {novel.title}
                        </h3>
                        <p className="mt-2 text-[11px] font-bold tracking-[0.25em] text-neutral-600">
                          {novelGenreLabel(novel)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide",
                              status === "COMPLETE"
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-foreground"
                                : "bg-amber-100 dark:bg-amber-900/30 text-foreground",
                            )}
                          >
                            {status}
                          </span>
                          {featured && (
                            <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="mt-5 border-t border-border pt-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Progress</p>
                          <div className="mt-3 flex items-center gap-4">
                            {/* SVG arc ring */}
                            {(() => {
                              const r = 30;
                              const circ = 2 * Math.PI * r;
                              const offset = circ * (1 - pct / 100);
                              const arcColor = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#f43f5e";
                              return (
                                <svg
                                  width="80"
                                  height="80"
                                  viewBox="0 0 80 80"
                                  aria-label={`${pct}% complete`}
                                  className="shrink-0"
                                >
                                  <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e5e5" strokeWidth="8" />
                                  <circle
                                    cx="40"
                                    cy="40"
                                    r={r}
                                    fill="none"
                                    stroke={arcColor}
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={circ}
                                    strokeDashoffset={offset}
                                    transform="rotate(-90 40 40)"
                                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                                  />
                                  <text
                                    x="40"
                                    y="44"
                                    textAnchor="middle"
                                    fontSize="14"
                                    fontWeight="900"
                                    fontFamily="monospace"
                                    fill="#171717"
                                  >
                                    {pct}%
                                  </text>
                                </svg>
                              );
                            })()}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-neutral-700">
                                {words.toLocaleString()}{" "}
                                <span className="font-normal text-muted-foreground">words</span>
                              </p>
                              <p className="text-xs font-medium text-muted-foreground">
                                of {target.toLocaleString()} target
                              </p>
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const daysSinceUpdate = (Date.now() - new Date(novel.updatedAt).getTime()) / 86_400_000;
                          const isStalled = daysSinceUpdate > 30 && novel.status !== "complete";
                          if (!isStalled) return null;
                          return (
                            <div className="mt-4 rounded-sm border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                              <p className="font-semibold">
                                This project has been quiet for {Math.floor(daysSinceUpdate)} days.
                              </p>
                              <p className="mt-0.5 font-normal opacity-80">
                                Even 100 words today keeps the momentum going.
                              </p>
                            </div>
                          );
                        })()}
                        <Button
                          type="button"
                          className="mt-5 w-full border border-border bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90"
                          onClick={openBook}
                        >
                          <PenLine className="mr-2 h-4 w-4" />
                          Continue writing
                        </Button>
                      </div>
                    );
                  })}
                <div
                  key="add-new-project"
                  className={cn(
                    `${shell.brutal} flex min-h-[220px] flex-col items-center justify-center border-dashed border-primary/50 bg-card p-6 text-center`,
                    sortedNovels.length === 0 && "ring-2 ring-primary/20 shadow-md",
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-primary/30 bg-primary/5">
                    <Plus className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <p className="mt-4 text-base font-bold text-foreground">New project</p>
                  <p className="mt-1 max-w-[14rem] text-sm text-muted-foreground">
                    {sortedNovels.length === 0
                      ? "Create your first manuscript — everything saves as you go."
                      : "Add another manuscript and pick up where you left off anytime."}
                  </p>
                  <Button
                    type="button"
                    className="mt-5 border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent"
                    onClick={() => setOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create project
                  </Button>
                </div>
              </div>
            </div>

            {/* Writing checklist + Reminders */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
              <div className="space-y-4 lg:col-span-7">
                <div className={`${shell.brutal} bg-card p-4 md:p-5`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className={shell.title}>Writing checklist</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Habit (today, local date):</span> daily goal from
                        writing stats, Idea Web touched today, and an active manuscript or workspace write session.
                        Separate from <span className="font-medium text-foreground">{FOUNDATIONS_TRACK_LABEL}</span>{" "}
                        (one-time). Tap a row to override — saved on this device.
                      </p>
                    </div>
                    <div className="flex gap-1 rounded-lg border border-border bg-secondary p-0.5">
                      {(["all", "pending", "done"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setTaskTab(tab)}
                          className={cn(
                            "rounded-md px-3 py-1 text-xs font-semibold capitalize",
                            taskTab === tab
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {filteredDashTasks.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => handleWritingChecklistToggle(task.id)}
                          className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-accent"
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border",
                              task.done ? "bg-emerald-400 dark:bg-emerald-600" : "bg-card",
                            )}
                          >
                            {task.done ? <Check className="h-4 w-4 text-foreground" /> : null}
                          </span>
                          <span
                            className={cn(
                              "flex-1 text-sm font-medium",
                              task.done && "text-muted-foreground line-through",
                            )}
                          >
                            {task.label}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-xl border border-border bg-secondary p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Odyssey</p>
                    <p className="mt-0.5 text-[10px] font-medium text-neutral-600">
                      <span className="font-semibold text-foreground/80">Volume</span> rank from your primary manuscript
                      (active book, else most recently updated) — not the habit checklist above.
                    </p>
                    {novels.length === 0 ? (
                      <p className="mt-2 text-sm text-foreground/80">
                        No manuscript yet — create or open a book to see Odyssey tier progress here.
                      </p>
                    ) : (
                      <>
                        {primaryNovel && (
                          <p className="mt-2 text-xs font-semibold text-foreground">{primaryNovel.title}</p>
                        )}
                        <p className="mt-1 text-xs text-neutral-700">
                          {primaryWordCount.toLocaleString()} words in this manuscript · next badge:{" "}
                          {odysseyProgress.nextBadge}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-sm font-bold text-foreground">
                          <Trophy className="h-4 w-4 shrink-0" aria-hidden />
                          {odysseyProgress.rank}
                        </p>
                        {!odysseyProgress.atMaxTier && odysseyProgress.wordsToNextTier !== null && (
                          <p className="mt-1 text-xs text-neutral-700">
                            {odysseyProgress.wordsToNextTier.toLocaleString()} words until next tier
                          </p>
                        )}
                        <div className="mt-2">
                          <div className={shell.progressTrack}>
                            <div
                              className={cn(shell.progressFill, progressTone(odysseyProgress.tierProgressPct))}
                              style={{ width: `${odysseyProgress.tierProgressPct}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-neutral-600">Progress within current Odyssey tier</p>
                        </div>
                        {odysseyProgress.atMaxTier && (
                          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                            Top Odyssey tier for this manuscript.
                          </p>
                        )}
                      </>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full border border-border bg-card sm:w-auto"
                      onClick={() => navigate(ROUTES.odyssey)}
                    >
                      Open Writer&apos;s Odyssey
                    </Button>
                    <p className="mt-2 border-t border-amber-200/80 pt-2 text-[10px] leading-snug text-neutral-600">
                      {FOUNDATIONS_TRACK_LABEL} (one-time onboarding) is separate from Odyssey — ranks follow manuscript
                      word counts, not checklist steps.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:col-span-5">
                <div className={`${shell.brutal} bg-secondary p-4`} id="deadlines">
                  <p className={shell.title}>Reminders</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Weekly progress uses your writing stats (Mon–today). Idea rows use reminders set on Idea Web
                    entries.
                  </p>
                  {reminderBlock.ideaReminderTotal === 0 && (
                    <p className="mt-2 rounded-md border border-dashed border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                      No idea reminders yet. Open Idea Web, open an idea, and set a reminder — it will appear here.
                    </p>
                  )}
                  <ul className="mt-3 space-y-3 text-sm">
                    {reminderBlock.rows.map((row) => (
                      <li
                        key={row.id}
                        className={cn(
                          "rounded-lg border border-border bg-card p-3",
                          row.kind === "idea_reminder" && row.isOverdue && "border-amber-700 bg-amber-50/80",
                        )}
                      >
                        {row.kind === "weekly_goal" ? (
                          <>
                            <span className="text-xs font-semibold text-primary">{row.badge}</span>
                            <p className="font-semibold text-foreground">{row.title}</p>
                            <p className="text-xs text-muted-foreground">{row.subtitle}</p>
                          </>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => {
                                trackEvent("dashboard_reminder_idea_open", { entryId: row.entryId });
                                navigate(`${ROUTES.inbox}?entry=${encodeURIComponent(row.entryId)}`);
                              }}
                            >
                              <span className="text-xs font-semibold text-primary">{row.badge}</span>
                              <p className="font-semibold text-foreground">{row.title}</p>
                              <p className="text-xs text-muted-foreground">{row.subtitle}</p>
                              <p className="mt-1 text-[10px] font-medium text-primary">Open in Idea Web →</p>
                            </button>
                            <div className="flex shrink-0 gap-1 self-end sm:self-start">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 border-border"
                                aria-label={`Clear reminder for ${row.title}`}
                                onClick={() => {
                                  trackEvent("dashboard_reminder_idea_clear", { entryId: row.entryId });
                                  void patchIdeaWebEntry(row.entryId, { remindAt: null });
                                }}
                              >
                                <BellOff className="h-4 w-4" aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 border-border"
                                aria-label={`Snooze reminder by one day for ${row.title}`}
                                onClick={() => {
                                  const entry = ideaWebEntries.find((e) => e.id === row.entryId);
                                  if (!entry?.remindAt) return;
                                  const d = new Date(entry.remindAt);
                                  d.setDate(d.getDate() + 1);
                                  trackEvent("dashboard_reminder_idea_snooze", { entryId: row.entryId });
                                  void patchIdeaWebEntry(row.entryId, { remindAt: d.toISOString() });
                                }}
                              >
                                <Clock className="h-4 w-4" aria-hidden />
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {reminderBlock.hiddenIdeaReminderCount > 0 && (
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary underline decoration-teal-600/50 underline-offset-2 hover:text-primary"
                        onClick={() => navigate(ROUTES.inbox)}
                      >
                        View all {reminderBlock.ideaReminderTotal} in Idea Web
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setCreateStep(1);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New book</DialogTitle>
            <DialogDescription>
              {createStep === 1 && "Name your project and pick a story template."}
              {createStep === 2 && "Optionally place this book in a series and set order on your shelf."}
              {createStep === 3 && "Length, premise, audience, and craft defaults — all optional."}
            </DialogDescription>
          </DialogHeader>
          <BookCreationStepIndicator step={createStep} />
          {draftRestored && newTitle && (
            <div className="flex items-center justify-between rounded-sm border-2 border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <span className="text-amber-700 dark:text-amber-300">
                Draft restored: <strong className="font-semibold">&ldquo;{newTitle}&rdquo;</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (user?.id) clearBookCreationDraft(user.id);
                  setDraftRestored(false);
                  setNewTitle("");
                  setNewAuthor(user?.name ?? "Anonymous");
                  setNewGenre(preferences?.genres?.[0] ?? "General");
                  setNewFrameworkId(preferences?.default_framework_id ?? "three-act");
                  setNewPremise("");
                  setNewTargetWordCount("");
                  setNewSubtitle("");
                  setNewPenName("");
                  setNewLogline("");
                  setNewComparables("");
                  setNewSecondaryGenres([]);
                  setNewWordCountPreset("");
                  setNewSeriesScope("standalone");
                  setNewSeriesId("");
                  setNewSeriesPosition("");
                  setNewAudience("");
                  setNewContentWarnings([]);
                  setNewDefaultPov("");
                  setNewDefaultTense("");
                  setNewCoverImageDataUrl("");
                  setCreateStep(1);
                }}
                className="ml-4 shrink-0 text-xs font-semibold text-amber-700 underline hover:text-amber-700 dark:text-amber-300 dark:text-amber-300 dark:hover:text-amber-100"
              >
                Start fresh
              </button>
            </div>
          )}
          <div className="mt-2 space-y-4">
            {createStep === 1 && (
              <>
                <div>
                  <label htmlFor="book-create-title" className="mb-1.5 block text-sm text-muted-foreground">
                    Title *
                  </label>
                  <Input
                    id="book-create-title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="The Great American Novel"
                    aria-required
                    aria-invalid={formError ? true : undefined}
                    aria-describedby={formError ? "book-create-form-error" : undefined}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Author / pen name</label>
                  <Input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="Anonymous" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Genre *</label>
                  <Select value={newGenre || "General"} onValueChange={setNewGenre}>
                    <SelectTrigger>
                      <SelectValue placeholder="Genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOK_GENRE_OPTIONS.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Story template *</label>
                  <Select
                    value={newFrameworkId}
                    onValueChange={(value) => {
                      setNewFrameworkId(value);
                      trackEvent("book_create_template_selected", { source: "dashboard", frameworkId: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORY_FRAMEWORKS.map((framework) => (
                        <SelectItem key={framework.id} value={framework.id}>
                          {framework.shortName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {frameworkRecommendations.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Recommended:{" "}
                      {frameworkRecommendations
                        .slice(0, 2)
                        .map((item) => {
                          const match = STORY_FRAMEWORKS.find((framework) => framework.id === item.frameworkId);
                          return match?.shortName ?? item.frameworkId;
                        })
                        .join(", ")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">After you create</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={postCreateDestination === "write" ? "default" : "outline"}
                      onClick={() => setPostCreateDestination("write")}
                    >
                      Open Write
                    </Button>
                    <Button
                      type="button"
                      variant={postCreateDestination === "canvas" ? "default" : "outline"}
                      onClick={() => setPostCreateDestination("canvas")}
                    >
                      Open Canvas
                    </Button>
                  </div>
                </div>
              </>
            )}

            {createStep === 2 && (
              <BookCreationSeriesStep
                userId={user?.id}
                seriesScope={newSeriesScope}
                setSeriesScope={setNewSeriesScope}
                seriesId={newSeriesId}
                setSeriesId={(id, _t) => setNewSeriesId(id)}
                seriesPosition={newSeriesPosition}
                setSeriesPosition={setNewSeriesPosition}
                subtitle={newSubtitle}
                setSubtitle={setNewSubtitle}
              />
            )}

            {createStep === 3 && (
              <BookCreationAdvancedFields
                hideSeriesSection
                primaryGenre={newGenre || "General"}
                userId={user?.id}
                subtitle={newSubtitle}
                setSubtitle={setNewSubtitle}
                penName={newPenName}
                setPenName={setNewPenName}
                logline={newLogline}
                setLogline={setNewLogline}
                comparables={newComparables}
                setComparables={setNewComparables}
                secondaryGenres={newSecondaryGenres}
                setSecondaryGenres={setNewSecondaryGenres}
                wordCountPreset={newWordCountPreset}
                setWordCountPreset={setNewWordCountPreset}
                seriesScope={newSeriesScope}
                setSeriesScope={setNewSeriesScope}
                seriesId={newSeriesId}
                setSeriesId={(id, _t) => setNewSeriesId(id)}
                seriesPosition={newSeriesPosition}
                setSeriesPosition={setNewSeriesPosition}
                audience={newAudience}
                setAudience={setNewAudience}
                contentWarnings={newContentWarnings}
                setContentWarnings={setNewContentWarnings}
                defaultPov={newDefaultPov}
                setDefaultPov={setNewDefaultPov}
                defaultTense={newDefaultTense}
                setDefaultTense={setNewDefaultTense}
                premise={newPremise}
                setPremise={setNewPremise}
                targetWordCount={newTargetWordCount}
                setTargetWordCount={setNewTargetWordCount}
                coverImageDataUrl={newCoverImageDataUrl}
                setCoverImageDataUrl={setNewCoverImageDataUrl}
              />
            )}

            {formError && (
              <p
                id="book-create-form-error"
                role="alert"
                className="rounded-sm border-2 border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive"
              >
                {formError}
              </p>
            )}
            {formWarning && !formError && (
              <p className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
                {formWarning}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              {createStep > 1 ? (
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={goBackWizard}>
                  Back
                </Button>
              ) : (
                <span className="hidden sm:block sm:w-[88px]" aria-hidden />
              )}
              <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
                {createStep < 3 ? (
                  <Button
                    type="button"
                    className="w-full bg-primary hover:bg-primary/90 sm:min-w-[120px]"
                    onClick={createStep === 1 ? goNextFromStep1 : goNextFromStep2}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full bg-primary hover:bg-primary/90 sm:min-w-[160px]"
                    onClick={handleCreate}
                  >
                    Create book
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SeriesCreateDialog
        open={seriesDialogOpen}
        onOpenChange={setSeriesDialogOpen}
        userId={user?.id}
        analyticsSource="dashboard"
        onSeriesCreated={setSeriesRows}
      />
    </PageShell>
  );
}
