import { differenceInDays, formatDistanceToNow, subDays } from "date-fns";

import { entryCategory } from "@/components/idea-web/idea-web-categories";
import type { IdeaWebEntry, IdeaWebLink, IdeaWebStatus } from "@/types/idea-web";
import type { Idea } from "@/types/novel";

const STATUSES: IdeaWebStatus[] = ["seed", "sprouting", "growing", "dormant", "harvested", "archived"];

/** Rich client-side analytics for Idea Web subtitle insights. */
export interface IdeaWebAnalytics {
  total: number;
  byStatus: Record<IdeaWebStatus, number>;
  unassigned: number;
  harvested: number;
  dormant: number;
  pinned: number;
  tagged: number;
  lastUpdatedAt: string | null;
  /** plot, character, world, theme, misc */
  byCategory: Record<Idea["category"], number>;
  dominantCategory: Idea["category"] | null;
  createdLast7d: number;
  createdLast30d: number;
  oldestCreatedAt: string | null;
  stalestUpdatedDays: number | null;
  uniqueTagCount: number;
  topTags: { tag: string; count: number }[];
  thinBodyCount: number;
  longBodyCount: number;
  avgBodyLenBucket: "short" | "medium" | "long";
  distinctNovels: number;
  maxIdeasPerBook: number;
  ideasWithMood: number;
  dominantSourceType: string | null;
  onMapCount: number;
  linkCount: number;
  entriesWithAnyLink: number;
  isolatedEntryCount: number;
  /** Novel title with the most assigned ideas (if tied, first max). */
  topBookTitle: string | null;
  topBookCount: number;
}

function parseDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function deriveIdeaWebAnalytics(
  entries: IdeaWebEntry[],
  links: IdeaWebLink[],
  novels: { id: string; title?: string }[],
): IdeaWebAnalytics {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<IdeaWebStatus, number>;
  const byCategory: Record<Idea["category"], number> = {
    plot: 0,
    character: 0,
    world: 0,
    theme: 0,
    misc: 0,
  };

  let unassigned = 0;
  let pinned = 0;
  let tagged = 0;
  let lastUpdatedAt: string | null = null;
  let oldestCreatedAt: string | null = null;
  const tagFreq = new Map<string, number>();
  let thinBodyCount = 0;
  let longBodyCount = 0;
  let bodyLenSum = 0;
  let createdLast7d = 0;
  let createdLast30d = 0;
  const now = new Date();
  const d7 = subDays(now, 7);
  const d30 = subDays(now, 30);
  const perNovel = new Map<string, number>();
  let ideasWithMood = 0;
  const sourceCounts = new Map<string, number>();
  let onMapCount = 0;

  for (const e of entries) {
    if (e.status && byStatus[e.status] !== undefined) {
      byStatus[e.status] += 1;
    }
    const cat = entryCategory(e);
    byCategory[cat] += 1;

    if (e.novelId === null) unassigned += 1;
    else perNovel.set(e.novelId, (perNovel.get(e.novelId) ?? 0) + 1);

    if (e.pinned) pinned += 1;
    if (e.tags.length > 0) {
      tagged += 1;
      for (const t of e.tags) {
        const k = t.trim().toLowerCase() || t;
        if (!k) continue;
        tagFreq.set(k, (tagFreq.get(k) ?? 0) + 1);
      }
    }

    const u = e.updatedAt || e.createdAt;
    if (u && (!lastUpdatedAt || u > lastUpdatedAt)) lastUpdatedAt = u;
    const cAt = e.createdAt;
    if (cAt && (!oldestCreatedAt || cAt < oldestCreatedAt)) oldestCreatedAt = cAt;

    const c = parseDate(e.createdAt);
    if (c) {
      if (c >= d7) createdLast7d += 1;
      if (c >= d30) createdLast30d += 1;
    }

    const body = (e.body ?? "").trim();
    bodyLenSum += body.length;
    if (body.length > 0 && body.length < 40) thinBodyCount += 1;
    if (body.length > 500) longBodyCount += 1;

    if (e.mood && String(e.mood).trim()) ideasWithMood += 1;

    const st = String(e.sourceType || "original");
    sourceCounts.set(st, (sourceCounts.get(st) ?? 0) + 1);

    const mp = e.metadata?.mapPos;
    if (mp && typeof mp === "object" && "x" in mp && "y" in mp) onMapCount += 1;
  }

  let dominantCategory: Idea["category"] | null = null;
  let best = 0;
  for (const k of ["plot", "character", "world", "theme", "misc"] as const) {
    if (byCategory[k] > best) {
      best = byCategory[k];
      dominantCategory = k;
    }
  }
  if (best === 0) dominantCategory = null;

  const topTags = [...tagFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  const avgLen = entries.length ? bodyLenSum / entries.length : 0;
  let avgBodyLenBucket: "short" | "medium" | "long" = "medium";
  if (avgLen < 80) avgBodyLenBucket = "short";
  else if (avgLen > 280) avgBodyLenBucket = "long";

  let stalestUpdatedDays: number | null = null;
  for (const e of entries) {
    if (e.status === "archived") continue;
    const ud = parseDate(e.updatedAt || e.createdAt);
    if (!ud) continue;
    const days = differenceInDays(now, ud);
    if (stalestUpdatedDays === null || days > stalestUpdatedDays) stalestUpdatedDays = days;
  }

  const distinctNovels = perNovel.size;
  let maxIdeasPerBook = 0;
  for (const n of perNovel.values()) {
    if (n > maxIdeasPerBook) maxIdeasPerBook = n;
  }

  let dominantSourceType: string | null = null;
  let srcBest = 0;
  for (const [k, v] of sourceCounts) {
    if (k !== "original" && v > srcBest) {
      srcBest = v;
      dominantSourceType = k;
    }
  }

  const linkedIds = new Set<string>();
  for (const L of links) {
    linkedIds.add(L.fromEntryId);
    linkedIds.add(L.toEntryId);
  }
  let entriesWithAnyLink = 0;
  let isolatedEntryCount = 0;
  const entryIds = new Set(entries.map((e) => e.id));
  for (const id of entryIds) {
    if (linkedIds.has(id)) entriesWithAnyLink += 1;
  }
  if (links.length > 0 && entries.length > 0) {
    for (const e of entries) {
      if (!linkedIds.has(e.id)) isolatedEntryCount += 1;
    }
  }

  let topBookTitle: string | null = null;
  let topBookCount = 0;
  for (const [novelId, count] of perNovel) {
    if (count > topBookCount) {
      topBookCount = count;
      const book = novels.find((n) => n.id === novelId);
      topBookTitle = book?.title?.trim() || null;
    }
  }

  return {
    total: entries.length,
    byStatus,
    unassigned,
    harvested: byStatus.harvested,
    dormant: byStatus.dormant,
    pinned,
    tagged,
    lastUpdatedAt,
    byCategory,
    dominantCategory,
    createdLast7d,
    createdLast30d,
    oldestCreatedAt,
    stalestUpdatedDays,
    uniqueTagCount: tagFreq.size,
    topTags,
    thinBodyCount,
    longBodyCount,
    avgBodyLenBucket,
    distinctNovels,
    maxIdeasPerBook,
    ideasWithMood,
    dominantSourceType,
    onMapCount,
    linkCount: links.length,
    entriesWithAnyLink,
    isolatedEntryCount,
    topBookTitle,
    topBookCount,
  };
}

/** @deprecated Use deriveIdeaWebAnalytics for full metrics */
export function deriveIdeaWebStats(entries: IdeaWebEntry[]) {
  const a = deriveIdeaWebAnalytics(entries, [], []);
  return {
    total: a.total,
    byStatus: a.byStatus,
    unassigned: a.unassigned,
    harvested: a.harvested,
    dormant: a.dormant,
    pinned: a.pinned,
    tagged: a.tagged,
    lastUpdatedAt: a.lastUpdatedAt,
  };
}

type InsightFn = (a: IdeaWebAnalytics) => string | null;

const CAT_LABEL: Record<Idea["category"], string> = {
  plot: "plot",
  character: "character",
  world: "world",
  theme: "theme",
  misc: "misc",
};

const insightGenerators: InsightFn[] = [
  (a) => {
    if (a.total === 0) return null;
    const { seed, sprouting, growing, harvested } = a.byStatus;
    return `${a.total} ideas — ${seed} seed, ${sprouting} sprouting, ${growing} growing, ${harvested} harvested`;
  },
  (a) => {
    if (a.total === 0 || !a.dominantCategory) return null;
    const n = a.byCategory[a.dominantCategory];
    if (n < 1) return null;
    return `Your web leans ${CAT_LABEL[a.dominantCategory]} — ${n} in that lane`;
  },
  (a) => {
    if (a.total < 2 || !a.dominantCategory) return null;
    const cats = (["plot", "character", "world", "theme", "misc"] as const).filter(
      (c) => a.byCategory[c] > 0 && c !== a.dominantCategory,
    );
    const second = cats.sort((c, d) => a.byCategory[d] - a.byCategory[c])[0];
    if (!second) return null;
    return `More ${CAT_LABEL[a.dominantCategory]} than ${CAT_LABEL[second]} sparks right now`;
  },
  (a) => {
    if (a.createdLast7d === 0 || a.total === 0) return null;
    return `${a.createdLast7d} new in the last week — momentum building`;
  },
  (a) => {
    if (a.createdLast30d === 0 || a.total < 2) return null;
    return `${a.createdLast30d} ideas captured in the last 30 days`;
  },
  (a) => {
    if (!a.oldestCreatedAt || a.total === 0) return null;
    try {
      const d = new Date(a.oldestCreatedAt);
      if (Number.isNaN(d.getTime())) return null;
      return `This web started ${formatDistanceToNow(d, { addSuffix: true })}`;
    } catch {
      return null;
    }
  },
  (a) => {
    if (a.stalestUpdatedDays === null || a.total === 0) return null;
    if (a.stalestUpdatedDays < 14) return null;
    return `Quiet corner: something hasn’t been touched in ~${a.stalestUpdatedDays} days`;
  },
  (a) => {
    if (a.uniqueTagCount === 0) return null;
    return `${a.uniqueTagCount} unique tag${a.uniqueTagCount === 1 ? "" : "s"} across your web`;
  },
  (a) => {
    if (a.topTags.length === 0) return null;
    const t = a.topTags[0];
    return `Top tag “${t.tag}” on ${t.count} idea${t.count === 1 ? "" : "s"}`;
  },
  (a) => {
    if (a.topTags.length < 2) return null;
    const [x, y] = a.topTags;
    return `Tag story: “${x.tag}” & “${y.tag}” anchor your vocabulary`;
  },
  (a) => {
    if (a.total === 0) return null;
    const pct = Math.round((a.tagged / a.total) * 100);
    return `${pct}% of ideas carry at least one tag`;
  },
  (a) => {
    if (a.thinBodyCount === 0 || a.total === 0) return null;
    return `${a.thinBodyCount} spark${a.thinBodyCount === 1 ? "" : "s"} still light on notes — room to expand`;
  },
  (a) => {
    if (a.longBodyCount === 0) return null;
    return `${a.longBodyCount} idea${a.longBodyCount === 1 ? "" : "s"} with deep notes (500+ chars)`;
  },
  (a) => {
    if (a.total === 0) return null;
    const label =
      a.avgBodyLenBucket === "short"
        ? "short blurbs"
        : a.avgBodyLenBucket === "long"
          ? "longer notes"
          : "mixed-length notes";
    return `Average note length skews ${label}`;
  },
  (a) => {
    if (a.unassigned === 0) return null;
    return `${a.unassigned} still unassigned — free-floating in the inbox`;
  },
  (a) => {
    if (a.distinctNovels === 0) return null;
    return `Ideas touch ${a.distinctNovels} project${a.distinctNovels === 1 ? "" : "s"}`;
  },
  (a) => {
    if (!a.topBookTitle || a.topBookCount < 2) return null;
    const short = a.topBookTitle.length > 28 ? `${a.topBookTitle.slice(0, 25)}…` : a.topBookTitle;
    return `"${short}" clusters ${a.topBookCount} ideas`;
  },
  (a) => {
    if (a.maxIdeasPerBook < 2 || a.distinctNovels === 0) return null;
    return `One book carries up to ${a.maxIdeasPerBook} linked ideas`;
  },
  (a) => {
    if (a.harvested === 0) return null;
    return `${a.harvested} harvested into manuscripts`;
  },
  (a) => {
    if (a.dormant === 0) return null;
    return `${a.dormant} dormant — waiting for the right season`;
  },
  (a) => {
    if (a.pinned === 0) return null;
    return `${a.pinned} pinned to the top of mind`;
  },
  (a) => {
    if (a.ideasWithMood === 0) return null;
    return `${a.ideasWithMood} with mood set — tone is marked`;
  },
  (a) => {
    if (!a.dominantSourceType) return null;
    return `Many sparks marked “${a.dominantSourceType}”`;
  },
  (a) => {
    if (a.onMapCount === 0) return null;
    return `${a.onMapCount} on the visual map — spatially placed`;
  },
  (a) => {
    if (a.linkCount === 0) return null;
    return `${a.linkCount} connection${a.linkCount === 1 ? "" : "s"} between ideas`;
  },
  (a) => {
    if (a.entriesWithAnyLink === 0 || a.total === 0) return null;
    return `${a.entriesWithAnyLink} ideas participate in at least one link`;
  },
  (a) => {
    if (a.isolatedEntryCount === 0 || a.linkCount === 0) return null;
    return `${a.isolatedEntryCount} idea${a.isolatedEntryCount === 1 ? "" : "s"} not linked yet — connect the web?`;
  },
  (a) => {
    if (!a.lastUpdatedAt || a.total === 0) return null;
    try {
      const d = new Date(a.lastUpdatedAt);
      if (Number.isNaN(d.getTime())) return null;
      return `Last edit ${formatDistanceToNow(d, { addSuffix: true })}`;
    } catch {
      return null;
    }
  },
  (a) => {
    if (a.total === 0) return null;
    return `${a.total} idea${a.total === 1 ? "" : "s"} in your web — inbox-first, then assign or harvest`;
  },
];

export function listApplicableInsights(analytics: IdeaWebAnalytics): string[] {
  return insightGenerators.map((g) => g(analytics)).filter((s): s is string => s !== null && s.length > 0);
}

const EMPTY_COPY = "No ideas yet — capture a spark with quick capture or the dashboard seed.";

export function buildSubtitleLine(analytics: IdeaWebAnalytics, filteredCount: number, rotateIndex: number): string {
  if (analytics.total === 0) {
    return EMPTY_COPY;
  }

  const applicable = listApplicableInsights(analytics);
  if (applicable.length === 0) {
    const fallback = `${analytics.total} idea${analytics.total === 1 ? "" : "s"} total`;
    return appendFilterClause(fallback, filteredCount, analytics.total);
  }

  const idx = ((rotateIndex % applicable.length) + applicable.length) % applicable.length;
  const insight = applicable[idx];

  return appendFilterClause(insight, filteredCount, analytics.total);
}

function appendFilterClause(base: string, filteredCount: number, total: number): string {
  if (total === 0) return base;
  if (filteredCount < total) {
    return `${base} · Showing ${filteredCount} of ${total}`;
  }
  return base;
}

export const SUBTITLE_ROTATE_MS = 4 * 60 * 1000;
