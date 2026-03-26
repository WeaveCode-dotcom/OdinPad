import { getWeekStartLocal } from "@/lib/user-stats-daily";
import type { IdeaWebEntry } from "@/types/idea-web";

export type DashboardReminderKind = "weekly_goal" | "idea_reminder";

export type DashboardReminderRow =
  | {
      id: string;
      kind: "weekly_goal";
      badge: string;
      title: string;
      subtitle: string;
    }
  | {
      id: string;
      kind: "idea_reminder";
      badge: string;
      title: string;
      subtitle: string;
      entryId: string;
      isOverdue: boolean;
    };

function endOfWeekLocalDate(): Date {
  const start = getWeekStartLocal();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Human-readable relative / absolute time for Idea Web `remindAt`. */
export function formatIdeaReminderSubtitle(at: Date, now: Date): string {
  if (at.getTime() < now.getTime()) {
    return `Due ${at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  }
  const dayStart = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const d0 = dayStart(now).getTime();
  const d1 = dayStart(at).getTime();
  const dayDiff = Math.round((d1 - d0) / 86400000);
  if (dayDiff === 0) {
    return `Today · ${at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  if (dayDiff === 1) return "Tomorrow";
  if (dayDiff < 7)
    return `In ${dayDiff} days · ${at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  return at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const MAX_IDEA_REMINDER_ROWS = 5;

export type DashboardReminderBlock = {
  rows: DashboardReminderRow[];
  /** Count of Idea Web rows with `remindAt` (before capping). */
  ideaReminderTotal: number;
  /** How many idea reminder rows exist beyond `MAX_IDEA_REMINDER_ROWS`. */
  hiddenIdeaReminderCount: number;
};

/**
 * Rows for the dashboard “Reminders / Upcoming” list: weekly goal (from preferences + stats)
 * plus Idea Web entries that have `remindAt` set (overdue first, then soonest; capped).
 */
export function buildDashboardReminderRows(input: {
  ideaWebEntries: IdeaWebEntry[];
  weekWords: number;
  weeklyWordGoal: number;
  now?: Date;
}): DashboardReminderBlock {
  const now = input.now ?? new Date();
  const rows: DashboardReminderRow[] = [];

  const wg = Math.max(0, input.weeklyWordGoal);
  const ww = input.weekWords;
  const pct = wg > 0 ? Math.min(100, Math.round((ww / wg) * 100)) : 0;
  const remaining = wg > 0 ? Math.max(0, wg - ww) : 0;
  const weekEnd = endOfWeekLocalDate();

  rows.push({
    id: "weekly-goal",
    kind: "weekly_goal",
    badge: "Goal",
    title: "Weekly word goal",
    subtitle:
      wg > 0
        ? `${ww.toLocaleString()} / ${wg.toLocaleString()} words (${pct}%) · Week ends ${weekEnd.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}${remaining === 0 && ww >= wg ? " · Met!" : remaining > 0 ? ` · ${remaining.toLocaleString()} to go` : ""}`
        : "Set a weekly word goal in Settings.",
  });

  const eligible = input.ideaWebEntries
    .filter((e) => e.remindAt && !e.deletedAt && e.status !== "harvested" && e.status !== "archived")
    .map((e) => ({ e, at: new Date(e.remindAt!) }));

  const overdue = eligible
    .filter(({ at }) => at.getTime() < now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const upcoming = eligible
    .filter(({ at }) => at.getTime() >= now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const ordered = [...overdue, ...upcoming];
  const ideaReminderTotal = ordered.length;
  const capped = ordered.slice(0, MAX_IDEA_REMINDER_ROWS);

  for (const { e, at } of capped) {
    const isOverdue = at.getTime() < now.getTime();
    const title = e.title.trim() || (e.body || "").trim().slice(0, 80) || "Untitled idea";
    rows.push({
      id: `idea-${e.id}`,
      kind: "idea_reminder",
      badge: isOverdue ? "Overdue" : "Idea",
      title,
      subtitle: formatIdeaReminderSubtitle(at, now),
      entryId: e.id,
      isOverdue,
    });
  }

  return {
    rows,
    ideaReminderTotal,
    hiddenIdeaReminderCount: Math.max(0, ideaReminderTotal - capped.length),
  };
}

/** Short preview lines for the Idea feed tab (recent entries). */
export function buildIdeaFeedPreviews(
  entries: IdeaWebEntry[],
  limit = 8,
): { id: string; line: string; scope: string }[] {
  return [...entries]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
    .map((e) => {
      const line = (e.body || e.title).trim();
      const short = line.slice(0, 120) + (line.length > 120 ? "…" : "");
      return {
        id: e.id,
        line: short || "Empty entry",
        scope: e.novelId ? "Project" : "Inbox",
      };
    });
}
