import { FileDown, Plus, Printer, Timer } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchRecentWritingSessions, WritingSessionRow } from "@/api/writing-sessions";
import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { FirstRunStatsCard } from "@/components/novel/FirstRunChecklist";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { getNovelWordCount, sortNovelsByRecent } from "@/lib/novel-metrics";
import {
  computeWritingStreak,
  fetchUserDailyStatsRange,
  getLocalISODate,
  getWeekStartLocal,
  parseLocalDateKey,
  sumWordsInRange,
} from "@/lib/user-stats-daily";
import { cn } from "@/lib/utils";
import { computeWriterStats, exportStatsAsCsv, exportStatsAsPdfLikePrint } from "@/lib/writer-stats";

export default function StatsAnalyticsPage() {
  const navigate = useNavigate();
  const { user, preferences, updatePreferences } = useAuth();
  const { novels } = useNovelContext();
  const deferredNovels = useDeferredValue(novels);
  const [statsByDate, setStatsByDate] = useState<Map<string, number>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<WritingSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const dailyGoal = preferences?.daily_word_goal ?? 500;
  const weeklyGoal = preferences?.weekly_word_goal ?? 3500;
  const stats = useMemo(() => computeWriterStats(deferredNovels), [deferredNovels]);
  const sorted = useMemo(() => sortNovelsByRecent(deferredNovels), [deferredNovels]);

  const todayIso = getLocalISODate();
  const wordsToday = statsByDate.get(todayIso) ?? 0;
  const weekStartIso = getLocalISODate(getWeekStartLocal());
  const weekWords = sumWordsInRange(statsByDate, weekStartIso, todayIso);
  const streak = computeWritingStreak(statsByDate, dailyGoal, preferences?.streak_rest_date);

  const last7 = useMemo(() => {
    const out: { date: string; words: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = getLocalISODate(d);
      out.push({ date: key, words: statsByDate.get(key) ?? 0 });
    }
    return out;
  }, [statsByDate]);

  const insight = useMemo(() => {
    const insights: string[] = [];
    let bestDow = 0;
    let bestWords = 0;
    const dowTotals = [0, 0, 0, 0, 0, 0, 0];
    const dowCount = [0, 0, 0, 0, 0, 0, 0];
    statsByDate.forEach((words, iso) => {
      const d = parseLocalDateKey(iso);
      const dow = d.getDay();
      dowTotals[dow] += words;
      dowCount[dow] += 1;
    });
    for (let i = 0; i < 7; i++) {
      const avg = dowCount[i] ? dowTotals[i] / dowCount[i] : 0;
      if (avg > bestWords) {
        bestWords = avg;
        bestDow = i;
      }
    }
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (bestWords > 0 && statsByDate.size > 3) {
      insights.push(`You tend to write more on ${names[bestDow]}s (by average daily words).`);
    }
    const weekTotal = last7.reduce((a, x) => a + x.words, 0);
    if (weekTotal > 0) {
      insights.push(`Last 7 days: ${weekTotal.toLocaleString()} words total — consistency beats perfection.`);
    }
    if (insights.length === 0) {
      insights.push("Log words on more days to unlock personalized rhythm insights.");
    }
    let idx = 0;
    try {
      const dayKey = todayIso;
      const raw = sessionStorage.getItem("stats_insight_index");
      const stored = raw ? Number(raw) : 0;
      const hash = dayKey.split("-").reduce((acc, n) => acc + Number(n), 0);
      idx = (stored + hash) % insights.length;
      sessionStorage.setItem("stats_insight_index", String((stored + 1) % 1000));
    } catch {
      idx = 0;
    }
    return insights[idx] ?? insights[0];
  }, [statsByDate, last7, todayIso]);

  const max7 = useMemo(() => Math.max(1, ...last7.map((x) => x.words)), [last7]);

  /** Build a 52-week contribution grid ending today. */
  const heatmapWeeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Align grid end to the end of the current week (Saturday)
    const dayOfWeek = today.getDay(); // 0=Sun
    const endOffset = 6 - dayOfWeek; // days until Saturday
    const gridEnd = new Date(today);
    gridEnd.setDate(gridEnd.getDate() + endOffset);

    const weeks: { date: string; words: number }[][] = [];
    for (let w = 51; w >= 0; w--) {
      const week: { date: string; words: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = new Date(gridEnd);
        cell.setDate(gridEnd.getDate() - w * 7 - (6 - d));
        const iso = getLocalISODate(cell);
        week.push({ date: iso, words: statsByDate.get(iso) ?? 0 });
      }
      weeks.push(week);
    }
    return weeks;
  }, [statsByDate]);

  const heatmapMax = useMemo(() => Math.max(1, ...heatmapWeeks.flat().map((c) => c.words)), [heatmapWeeks]);

  function heatmapFill(words: number): string {
    if (words === 0) return "#f5f5f5";
    const ratio = words / heatmapMax;
    if (ratio < 0.25) return "#ccfbf1";
    if (ratio < 0.5) return "#5eead4";
    if (ratio < 0.75) return "#14b8a6";
    return "#0f766e";
  }

  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const heatmapMonthLabels = useMemo(() => {
    const labels: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;
    heatmapWeeks.forEach((week, wi) => {
      const month = new Date(week[0].date).getMonth();
      if (month !== lastMonth) {
        labels.push({ label: MONTH_LABELS[month], weekIdx: wi });
        lastMonth = month;
      }
    });
    return labels;
  }, [heatmapWeeks]);

  const heatmapTotal = useMemo(() => heatmapWeeks.flat().reduce((s, c) => s + c.words, 0), [heatmapWeeks]);

  const last7TextSummary = useMemo(() => {
    if (last7.length === 0) return "";
    const total = last7.reduce((acc, d) => acc + d.words, 0);
    const byDay = last7.map((d) => `${d.date}: ${d.words} words`).join(". ");
    return `Last seven days total ${total} words. By day: ${byDay}.`;
  }, [last7]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setStatsByDate(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - 400);
    const map = await fetchUserDailyStatsRange(user.id, getLocalISODate(from), getLocalISODate());
    setStatsByDate(map);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    void fetchRecentWritingSessions(user.id, 20)
      .then((rows) => setSessions(rows))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!preferences?.streak_rest_date) return;
    if (preferences.streak_rest_date !== todayIso) {
      void updatePreferences({ streak_rest_date: null });
    }
  }, [preferences?.streak_rest_date, todayIso, updatePreferences]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <AppPageHeader
        title="Stats & analytics"
        subtitle="Writing progress, streaks, and project totals"
        helpLink={{ label: "About Stats", to: "/help#help-stats" }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {preferences && <FirstRunStatsCard />}

          {sorted.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-neutral-400 bg-amber-50/80 p-6 shadow-sm md:p-8">
              <h2 className="text-lg font-bold text-foreground">No projects yet</h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Create a manuscript to start tracking words, streaks, and per-project progress here.
              </p>
              <Button
                type="button"
                className="mt-4 gap-2 border border-border bg-primary text-white shadow-md hover:bg-primary/90"
                onClick={() => navigate("/library")}
              >
                <Plus className="h-4 w-4" />
                Create your first project
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Total words", value: stats.totalWords.toLocaleString() },
              { label: "Projects", value: `${stats.totalProjects}` },
              { label: "Completed", value: `${stats.projectsCompleted}` },
              { label: "Avg / day (all-time)", value: stats.averageDailyWords.toLocaleString() },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                  {loading ? "—" : item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Export snapshot</h2>
                <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                  Download the same headline totals you see above as CSV, or open a printable summary.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border border-border"
                  onClick={() => exportStatsAsCsv(stats)}
                >
                  <FileDown className="h-3.5 w-3.5" aria-hidden />
                  CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border border-border"
                  onClick={() => exportStatsAsPdfLikePrint(stats)}
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden />
                  Print / PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Today</p>
              <p className="mt-1 font-mono text-xl font-bold">{loading ? "—" : wordsToday.toLocaleString()}</p>
              {!loading && dailyGoal > 0 && (
                <p className="mt-2 text-[11px] text-neutral-700">
                  {Math.min(100, Math.round((wordsToday / dailyGoal) * 100))}% of daily goal
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border bg-amber-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900">Streak</p>
              <p className="mt-1 font-mono text-xl font-bold">
                {loading ? "—" : `${streak} day${streak === 1 ? "" : "s"}`}
              </p>
              {preferences?.streak_rest_date === todayIso ? (
                <p className="mt-2 text-[11px] font-medium text-amber-900">
                  Paused badge: rest day — streak won&apos;t break today.
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-8 border border-border text-xs"
                  onClick={() => void updatePreferences({ streak_rest_date: todayIso })}
                >
                  Use rest day today
                </Button>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Daily goal</p>
              <p className="mt-1 font-mono text-xl font-bold">{dailyGoal.toLocaleString()}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Set in Settings → Goals</p>
            </div>
            <div className="rounded-lg border border-border bg-violet-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-900">Weekly goal</p>
              <p className="mt-1 font-mono text-xl font-bold">{weeklyGoal.toLocaleString()}</p>
              {!loading && weeklyGoal > 0 && (
                <p className="mt-2 text-[11px] text-violet-950/90">
                  This week: {weekWords.toLocaleString()} / {weeklyGoal.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">This week</h2>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {loading ? "—" : weekWords.toLocaleString()} words
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Monday–today (local calendar)</p>
            {!loading && weeklyGoal > 0 && (
              <div className="mt-3">
                <div className="h-2.5 w-full overflow-hidden rounded-full border border-border bg-secondary">
                  <div
                    className="h-full rounded-sm bg-primary transition-[width]"
                    style={{ width: `${Math.min(100, Math.round((weekWords / weeklyGoal) * 100))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs font-medium text-neutral-700">
                  {weekWords.toLocaleString()} of {weeklyGoal.toLocaleString()} weekly goal (from Settings → Goals)
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Last 7 days</h2>
            <div
              className="mt-4 flex h-44 items-end gap-1.5 sm:gap-2"
              role="img"
              aria-label={loading ? "Last 7 days word counts, loading" : `Bar chart. ${last7TextSummary}`}
            >
              {last7.map((day) => {
                const hPx = Math.round((day.words / max7) * 160);
                return (
                  <div key={day.date} className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className={cn(
                        "w-full min-h-[3px] rounded-t border border-border bg-primary",
                        day.words === 0 && "bg-neutral-200",
                      )}
                      style={{ height: `${Math.max(day.words > 0 ? 6 : 3, hPx)}px` }}
                      title={`${day.date}: ${day.words} words`}
                      role="presentation"
                    />
                    <span className="text-[9px] font-medium text-muted-foreground">{day.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Writing activity</h2>
              {!loading && (
                <span className="text-xs text-muted-foreground">
                  {heatmapTotal.toLocaleString()} words in the last year
                </span>
              )}
            </div>
            {loading ? (
              <div
                className="mt-4 h-24 animate-pulse rounded-md bg-secondary"
                role="status"
                aria-label="Loading writing activity"
              />
            ) : (
              <div className="mt-4 overflow-x-auto">
                {/* Screen-reader text summary */}
                <p className="sr-only">
                  Writing activity heatmap for the past year.{" "}
                  {heatmapTotal > 0
                    ? `${heatmapTotal.toLocaleString()} total words written.`
                    : "No words recorded yet."}{" "}
                  Each cell represents one day.
                </p>
                {/* SVG heatmap — replaces 364 div DOM nodes with a single svg */}
                {(() => {
                  const CELL = 12;
                  const GAP = 2;
                  const STEP = CELL + GAP;
                  const LEFT_PAD = 20; // space for day labels
                  const TOP_PAD = 14; // space for month labels
                  const W = LEFT_PAD + 52 * STEP;
                  const H = TOP_PAD + 7 * STEP;
                  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
                  return (
                    <svg
                      width={W}
                      height={H}
                      viewBox={`0 0 ${W} ${H}`}
                      role="img"
                      aria-label={`Writing activity heatmap. ${heatmapTotal.toLocaleString()} words in the past year.`}
                      style={{ display: "block" }}
                    >
                      <title>Writing activity — past year ({heatmapTotal.toLocaleString()} words)</title>
                      {/* Month labels */}
                      {heatmapMonthLabels.map(({ label, weekIdx }) => (
                        <text
                          key={`m-${weekIdx}`}
                          x={LEFT_PAD + weekIdx * STEP}
                          y={10}
                          fontSize={9}
                          fill="#9ca3af"
                          aria-hidden="true"
                        >
                          {label}
                        </text>
                      ))}
                      {/* Day-of-week labels */}
                      {DAY_LABELS.map(
                        (d, i) =>
                          i % 2 === 1 && (
                            <text
                              key={`d-${i}`}
                              x={LEFT_PAD - 4}
                              y={TOP_PAD + i * STEP + CELL}
                              fontSize={8}
                              fill="#9ca3af"
                              textAnchor="end"
                              aria-hidden="true"
                            >
                              {d}
                            </text>
                          ),
                      )}
                      {/* Cells */}
                      {heatmapWeeks.map((week, wi) =>
                        week.map((cell, di) => {
                          const isFuture = cell.date > todayIso;
                          return (
                            <rect
                              key={cell.date}
                              x={LEFT_PAD + wi * STEP}
                              y={TOP_PAD + di * STEP}
                              width={CELL}
                              height={CELL}
                              rx={2}
                              fill={isFuture ? "transparent" : heatmapFill(cell.words)}
                              aria-label={
                                isFuture
                                  ? undefined
                                  : `${cell.words.toLocaleString()} word${cell.words !== 1 ? "s" : ""} on ${cell.date}`
                              }
                            >
                              {!isFuture && <title>{`${cell.date}: ${cell.words.toLocaleString()} words`}</title>}
                            </rect>
                          );
                        }),
                      )}
                    </svg>
                  );
                })()}
                {/* Legend */}
                <div className="mt-2 flex items-center gap-1.5 justify-end" aria-hidden>
                  <span className="text-[9px] text-muted-foreground">Less</span>
                  {(["#f5f5f5", "#ccfbf1", "#5eead4", "#14b8a6", "#0f766e"] as const).map((fill, i) => (
                    <svg key={i} width={12} height={12} aria-hidden="true">
                      <rect width={12} height={12} rx={2} fill={fill} stroke="#e5e7eb" strokeWidth={0.5} />
                    </svg>
                  ))}
                  <span className="text-[9px] text-muted-foreground">More</span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border-2 border-teal-200 bg-secondary/80 p-4 shadow-sm md:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Insight</p>
            <p className="mt-2 text-sm leading-relaxed text-teal-950">{insight}</p>
          </div>

          {/* Writing sessions */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Writing sessions</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Last 20 sprint / focus sessions from the Write view.</p>
            {sessionsLoading ? (
              <div className="mt-4 h-24 animate-pulse rounded-md bg-secondary" />
            ) : sessions.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No sessions yet — complete a sprint in the Write view to log one.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-100">
                {sessions.map((s) => {
                  const mins = Math.round(s.durationSecs / 60);
                  const started = new Date(s.startedAt);
                  const dateLabel = started.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                  const timeLabel = started.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 py-2 text-sm"
                    >
                      <span className="text-neutral-700 font-medium">
                        {dateLabel} · {timeLabel}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {mins} min · {s.wordsWritten.toLocaleString()} words
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Projects</h2>
            <ul className="mt-3 space-y-2">
              {sorted.length === 0 ? (
                <li className="flex flex-col gap-3 rounded-lg border border-dashed border-neutral-200 bg-accent/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-muted-foreground">
                    No projects yet — stats will fill in as you write.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="shrink-0"
                    onClick={() => navigate("/library")}
                  >
                    Go to Library
                  </Button>
                </li>
              ) : (
                sorted.slice(0, 12).map((n) => {
                  const w = getNovelWordCount(n);
                  const t = n.targetWordCount ?? 50000;
                  const pct = t > 0 ? Math.min(100, Math.round((w / t) * 100)) : 0;
                  return (
                    <li
                      key={n.id}
                      className="flex flex-col gap-1 border-b border-neutral-100 pb-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-semibold text-foreground">{n.title}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {w.toLocaleString()} words · {pct}% of target
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
