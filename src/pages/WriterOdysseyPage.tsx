import { Check, ExternalLink, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppPageHeader } from "@/components/layout/AppPageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { featureFlags } from "@/lib/feature-flags";
import { getAccountOdysseyProgress, getTotalWordsAcrossNovels } from "@/lib/novel-metrics";
import { ROUTES } from "@/lib/routes";
import { fetchRecentSandboxGamificationEvents } from "@/lib/sandbox/service";
import { computeWritingStreak, fetchUserDailyStatsRange, getLocalISODate } from "@/lib/user-stats-daily";
import { cn } from "@/lib/utils";

const shell = {
  card: "rounded-xl border-2 border-neutral-900 bg-white p-4 shadow-[4px_4px_0_0_rgb(0_0_0_/_0.1)] md:p-6",
  progressTrack: "h-2.5 w-full overflow-hidden rounded-full border-2 border-neutral-900 bg-neutral-100",
  progressFill: "h-full rounded-sm transition-[width] duration-300",
};

function progressTone(pct: number): string {
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-400";
  return "bg-rose-500";
}

const LIBRARY_WORD_MILESTONES: { words: number; label: string }[] = [
  { words: 500, label: "500 words across your library" },
  { words: 5000, label: "5,000 words across your library" },
  { words: 50000, label: "50,000 words across your library" },
];

function formatSandboxKind(kind: string): string {
  const map: Record<string, string> = {
    sandbox_list_created: "Created a list in Sandbox",
    list_item: "Added a list item in Sandbox",
    braindump_autosave: "Braindump autosave",
    sandbox_session: "Sandbox session",
  };
  return map[kind] ?? kind.replace(/_/g, " ");
}

export default function WriterOdysseyPage() {
  const navigate = useNavigate();
  const { user, profile, preferences } = useAuth();
  const { novels } = useNovelContext();
  const [statsByDate, setStatsByDate] = useState<Map<string, number>>(() => new Map());
  const [statsLoading, setStatsLoading] = useState(true);
  const [sandboxEvents, setSandboxEvents] = useState<Awaited<ReturnType<typeof fetchRecentSandboxGamificationEvents>>>(
    [],
  );
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  const dailyGoal = preferences?.daily_word_goal ?? 500;
  const accountWideWords = useMemo(() => getTotalWordsAcrossNovels(novels), [novels]);
  const odysseyProgress = useMemo(() => getAccountOdysseyProgress(novels), [novels]);

  const displayName = profile?.display_name?.trim() || user?.name || "Writer";
  const avatarSrc = profile?.avatar_url?.trim() || user?.avatarUrl || undefined;
  const bio = profile?.bio?.trim();

  const streak = computeWritingStreak(statsByDate, dailyGoal, preferences?.streak_rest_date);
  const todayIso = getLocalISODate();

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

  const max7 = useMemo(() => Math.max(1, ...last7.map((x) => x.words)), [last7]);

  const loadStats = useCallback(async () => {
    if (!user?.id) {
      setStatsByDate(new Map());
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - 400);
    const map = await fetchUserDailyStatsRange(user.id, getLocalISODate(from), getLocalISODate());
    setStatsByDate(map);
    setStatsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!user?.id) {
      setSandboxEvents([]);
      return;
    }
    let cancelled = false;
    setSandboxError(null);
    void (async () => {
      try {
        const rows = await fetchRecentSandboxGamificationEvents(user.id, 8);
        if (!cancelled) setSandboxEvents(rows);
      } catch (e) {
        if (!cancelled) setSandboxError(e instanceof Error ? e.message : "Could not load Sandbox activity");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const milestoneRows = useMemo(
    () =>
      LIBRARY_WORD_MILESTONES.map((m) => ({
        ...m,
        done: accountWideWords >= m.words,
      })),
    [accountWideWords],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-studio-cream">
      <AppPageHeader
        title="Writer's Odyssey"
        subtitle="Your profile, rank, and journey across every manuscript"
        helpLink={{ label: "About Stats & streaks", to: "/help#help-stats" }}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-8 md:pt-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className={cn(shell.card, "border-amber-200 bg-gradient-to-br from-amber-50/90 to-[#fff4d6]")}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                <Avatar className="h-24 w-24 border-4 border-neutral-900 shadow-[4px_4px_0_0_rgb(0_0_0_/_0.12)]">
                  {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
                  <AvatarFallback className="bg-teal-600 text-2xl font-bold text-white">
                    {displayName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-neutral-900 bg-amber-300 text-[10px] font-bold shadow-sm"
                  title="Odyssey rank"
                >
                  <Trophy className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900">Writer profile</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">{displayName}</h2>
                {bio ? (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700">{bio}</p>
                ) : (
                  <p className="mt-2 text-sm italic text-muted-foreground">No bio yet — add one in Settings.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {featureFlags.settingsCommandCenter && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-2 border-neutral-900"
                      onClick={() => navigate(ROUTES.settings)}
                    >
                      Edit profile
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-neutral-700"
                    onClick={() => navigate(ROUTES.stats)}
                  >
                    Stats & analytics
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className={cn(shell.card, "bg-[#fff4d6]")}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900">Odyssey rank</p>
            <p className="mt-1 text-xs text-neutral-600">All manuscripts in your library count toward this tier.</p>
            {novels.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-800">Create a manuscript to begin your Odyssey.</p>
            ) : (
              <>
                <p className="mt-3 text-2xl font-bold text-neutral-900">{odysseyProgress.rank}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-700">
                  <Trophy className="h-4 w-4 shrink-0" aria-hidden />
                  Next badge: <span className="font-semibold">{odysseyProgress.nextBadge}</span>
                </p>
                <p className="mt-2 text-sm text-neutral-700">
                  <span className="font-mono font-semibold">{accountWideWords.toLocaleString()}</span> words total ·{" "}
                  {novels.length} project{novels.length === 1 ? "" : "s"}
                </p>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">{odysseyProgress.rank}</span>
                    {!odysseyProgress.atMaxTier && odysseyProgress.nextTierLabel ? (
                      <span className="text-neutral-500">{odysseyProgress.nextTierLabel}</span>
                    ) : (
                      <span className="font-semibold text-amber-900">Max tier</span>
                    )}
                  </div>
                  <div className={shell.progressTrack}>
                    <div
                      className={cn(shell.progressFill, progressTone(odysseyProgress.tierProgressPct))}
                      style={{ width: `${odysseyProgress.tierProgressPct}%` }}
                    />
                  </div>
                  {!odysseyProgress.atMaxTier &&
                  odysseyProgress.wordsToNextTier !== null &&
                  odysseyProgress.nextTierLabel ? (
                    <p className="mt-1.5 text-xs font-semibold text-neutral-700">
                      <span className="font-mono">{odysseyProgress.wordsToNextTier.toLocaleString()}</span> words away
                      from <span className="text-amber-800">{odysseyProgress.nextTierLabel}</span>
                      <span className="ml-1 text-[10px] font-normal text-neutral-500">
                        ({odysseyProgress.tierProgressPct}% there)
                      </span>
                    </p>
                  ) : (
                    odysseyProgress.atMaxTier && (
                      <p className="mt-1.5 text-xs font-medium text-amber-900">
                        You are at the top Odyssey tier — Eternal Author.
                      </p>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={shell.card}>
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Habit</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Streak uses your daily word goal ({dailyGoal.toLocaleString()} words / day).
              </p>
              <p className="mt-4 font-mono text-3xl font-bold tabular-nums text-neutral-900">
                {statsLoading ? "—" : `${streak} day${streak === 1 ? "" : "s"}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Current streak</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Today:{" "}
                <span className="font-mono font-semibold text-neutral-800">
                  {statsLoading ? "—" : (statsByDate.get(todayIso) ?? 0).toLocaleString()}
                </span>{" "}
                words
              </p>
            </div>

            <div className={shell.card}>
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Last 7 days</h2>
              <div
                className="mt-4 flex h-36 items-end gap-1.5 sm:gap-2"
                role="img"
                aria-label="Words written per day, last 7 days"
              >
                {last7.map((day) => {
                  const hPx = Math.round((day.words / max7) * 128);
                  return (
                    <div key={day.date} className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className={cn(
                          "w-full min-h-[3px] rounded-t border-2 border-neutral-900 bg-teal-500",
                          day.words === 0 && "bg-neutral-200",
                        )}
                        style={{ height: `${Math.max(day.words > 0 ? 6 : 3, hPx)}px` }}
                        title={`${day.date}: ${day.words} words`}
                      />
                      <span className="text-[9px] font-medium text-muted-foreground">{day.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={shell.card}>
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Library milestones</h2>
            <p className="mt-1 text-xs text-muted-foreground">Word totals combine every manuscript.</p>
            <ul className="mt-4 space-y-3">
              {milestoneRows.map((m) => (
                <li key={m.words} className="flex items-start gap-3 text-sm">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 border-neutral-900",
                      m.done ? "bg-emerald-400" : "bg-neutral-100",
                    )}
                  >
                    {m.done ? <Check className="h-4 w-4 text-neutral-900" aria-hidden /> : null}
                  </span>
                  <span
                    className={cn("pt-0.5", m.done ? "text-neutral-600 line-through" : "font-medium text-neutral-900")}
                  >
                    {m.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={shell.card}>
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-neutral-500">Recent Sandbox activity</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Exploration in the Sandbox feeds your creative journey.
            </p>
            {sandboxError ? (
              <p className="mt-4 text-sm text-amber-900">{sandboxError}</p>
            ) : sandboxEvents.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No Sandbox events yet — open Sandbox from a project to start earning activity here.
              </p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {sandboxEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-col gap-0.5 border-b border-neutral-100 pb-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium text-neutral-800">{formatSandboxKind(ev.kind)}</span>
                    <time className="text-xs text-muted-foreground" dateTime={ev.createdAt}>
                      {new Date(ev.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
