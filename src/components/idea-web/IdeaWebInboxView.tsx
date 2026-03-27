import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  Filter,
  LayoutGrid,
  Lightbulb,
  Link2,
  List,
  Network,
  Plus,
  Sparkles,
  Wheat,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { entryCategory, IDEA_WEB_CATEGORIES } from "@/components/idea-web/idea-web-categories";
import { IdeaMapView } from "@/components/idea-web/IdeaMapView";
import { IdeaWebEntryCard } from "@/components/idea-web/IdeaWebEntryCard";
import { IdeaWebHarvestDialog } from "@/components/idea-web/IdeaWebHarvestDialog";
import { IdeationTools } from "@/components/idea-web/IdeaWebPromptTools";
import { IdeaWebSmartSubtitle } from "@/components/idea-web/IdeaWebSmartSubtitle";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VirtualList } from "@/components/ui/virtual-list";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toast } from "@/hooks/use-toast";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { assertFileSizeWithin, FILE_SIZE_LIMITS } from "@/lib/file-upload-policy";
import { clearDraft, loadDraft, saveDraft } from "@/lib/form-drafts";
import { parseIdeaWebSettings } from "@/lib/idea-web/idea-web-user-settings";
import { openIdeaWebQuickCapture } from "@/lib/idea-web/open-quick-capture";
import { ideaWebStatusLabel } from "@/lib/idea-web/status-labels";
import { createIdeaWebLink } from "@/lib/idea-web/service";
import { downloadIdeaWebMarkdown } from "@/lib/idea-web-export";
import { cn } from "@/lib/utils";
import { previewWordFile } from "@/lib/word-import";
import type { IdeaWebEntry, IdeaWebStatus } from "@/types/idea-web";
import type { Idea } from "@/types/novel";

const STATUSES: IdeaWebStatus[] = ["seed", "sprouting", "growing", "dormant", "harvested", "archived"];

type AssignmentFilter = "all" | "unassigned" | string;
type TagFilter = "all" | "tagged" | "untagged";
type SortKey = "updated" | "created" | "title";
type DateRange = "all" | "7d" | "30d" | "90d";

function FiltersGrid({
  assignmentFilter,
  setAssignmentFilter,
  statusFilter,
  setStatusFilter,
  tagFilter,
  setTagFilter,
  sortKey,
  setSortKey,
  dateRange,
  setDateRange,
  novels,
}: {
  assignmentFilter: AssignmentFilter;
  setAssignmentFilter: (v: AssignmentFilter) => void;
  statusFilter: IdeaWebStatus | "all";
  setStatusFilter: (v: IdeaWebStatus | "all") => void;
  tagFilter: TagFilter;
  setTagFilter: (v: TagFilter) => void;
  sortKey: SortKey;
  setSortKey: (v: SortKey) => void;
  dateRange: DateRange;
  setDateRange: (v: DateRange) => void;
  novels: { id: string; title: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" id="idea-web-advanced-filters">
      <div className="grid gap-1">
        <Label htmlFor="iw-filter-project" className="text-[10px] uppercase text-muted-foreground">
          Project
        </Label>
        <Select value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v)}>
          <SelectTrigger id="iw-filter-project" className="h-9 text-xs">
            <SelectValue placeholder="Assignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="unassigned">Unassigned (inbox)</SelectItem>
            {novels.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="iw-filter-status" className="text-[10px] uppercase text-muted-foreground">
          Status
        </Label>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IdeaWebStatus | "all")}>
          <SelectTrigger id="iw-filter-status" className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {ideaWebStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="iw-filter-tags" className="text-[10px] uppercase text-muted-foreground">
          Tags
        </Label>
        <Select value={tagFilter} onValueChange={(v) => setTagFilter(v as TagFilter)}>
          <SelectTrigger id="iw-filter-tags" className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="tagged">Tagged</SelectItem>
            <SelectItem value="untagged">Untagged</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="iw-filter-date" className="text-[10px] uppercase text-muted-foreground">
          Created
        </Label>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger id="iw-filter-date" className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="iw-filter-sort" className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
          <ArrowUpDown className="h-3 w-3" aria-hidden /> Sort
        </Label>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger id="iw-filter-sort" className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="created">Recently created</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Global Idea Web hub: **all** ideas (every lifecycle state & project assignment).
 * Default capture flow lands entries in the inbox (`novel_id` null) until assigned or harvested.
 */
const IW_FILTER_STORAGE = "odinpad_iw_filters";
const IW_MORE_FILTERS_KEY = "odinpad_iw_more_filters_open";
const PAGE_SIZE = 50;
const WORD_IMPORT_DRAFT = "idea_web_word_import";

export function IdeaWebInboxView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { preferences, user } = useAuth();
  const { schedule } = useUndoableAction();
  const {
    updateIdea,
    deleteIdea,
    ideaWebEntries,
    ideaWebLinks,
    novels,
    addIdeaToInbox,
    patchIdeaWebEntry,
    goToDashboard,
    createGlobalIdeaWebEntry,
    refetchIdeaWeb,
  } = useNovelContext();
  const isLg = useMediaQuery("(min-width: 1024px)");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(IW_MORE_FILTERS_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(IW_MORE_FILTERS_KEY, moreFiltersOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [moreFiltersOpen]);
  const reduceMotion = useReducedMotion();
  const dormantBatchDone = useRef(false);
  const wordImportRef = useRef<HTMLInputElement>(null);
  const [wordDialogOpen, setWordDialogOpen] = useState(false);
  const [wordPreview, setWordPreview] = useState("");
  const [wordDraftNotice, setWordDraftNotice] = useState<{ savedAt: number } | null>(null);

  const confirmDeleteIdea = useCallback(
    (id: string) => {
      schedule(() => deleteIdea(id), { message: "Removing idea…" });
    },
    [deleteIdea, schedule],
  );

  useEffect(() => {
    const d = loadDraft(user?.id, WORD_IMPORT_DRAFT);
    if (d?.data?.preview?.trim()) {
      setWordDraftNotice({ savedAt: d.savedAt });
    }
  }, [user?.id]);

  useEffect(() => {
    if (!wordDialogOpen || !user?.id) return;
    const t = window.setTimeout(() => {
      if (wordPreview.trim()) {
        saveDraft(user.id, WORD_IMPORT_DRAFT, { preview: wordPreview });
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [wordDialogOpen, user?.id, wordPreview]);

  const [filter, setFilter] = useState<Idea["category"] | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid" | "map">("list");
  const [search, setSearch] = useState("");
  // Debounce search so expensive filtering doesn't run on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 200);
    return () => window.clearTimeout(t);
  }, [search]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<IdeaWebStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const [filtersHydrated, setFiltersHydrated] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = {
        assignmentFilter: params.get("af") || undefined,
        statusFilter: (params.get("st") as IdeaWebStatus | "all" | null) || undefined,
        tagFilter: (params.get("tg") as TagFilter | null) || undefined,
        sortKey: (params.get("sort") as SortKey | null) || undefined,
        filter: (params.get("cat") as Idea["category"] | "all" | null) || undefined,
        viewMode: (params.get("view") as "list" | "grid" | "map" | null) || undefined,
      };
      const raw = localStorage.getItem(IW_FILTER_STORAGE);
      const stored = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      if (fromUrl.assignmentFilter) setAssignmentFilter(fromUrl.assignmentFilter);
      else if (typeof stored.assignmentFilter === "string") setAssignmentFilter(stored.assignmentFilter);
      if (fromUrl.statusFilter) setStatusFilter(fromUrl.statusFilter);
      else if (typeof stored.statusFilter === "string") setStatusFilter(stored.statusFilter as IdeaWebStatus | "all");
      if (fromUrl.tagFilter) setTagFilter(fromUrl.tagFilter);
      else if (typeof stored.tagFilter === "string") setTagFilter(stored.tagFilter as TagFilter);
      if (fromUrl.sortKey) setSortKey(fromUrl.sortKey);
      else if (typeof stored.sortKey === "string") setSortKey(stored.sortKey as SortKey);
      if (fromUrl.filter) setFilter(fromUrl.filter);
      else if (typeof stored.filter === "string") setFilter(stored.filter as Idea["category"] | "all");
      if (fromUrl.viewMode) setViewMode(fromUrl.viewMode);
      else if (typeof stored.viewMode === "string") setViewMode(stored.viewMode as "list" | "grid" | "map");
    } catch {
      /* ignore */
    }
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    const payload = {
      assignmentFilter,
      statusFilter,
      tagFilter,
      sortKey,
      filter,
      viewMode,
    };
    try {
      localStorage.setItem(IW_FILTER_STORAGE, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("af", assignmentFilter);
        p.set("st", statusFilter);
        p.set("tg", tagFilter);
        p.set("sort", sortKey);
        p.set("cat", filter);
        p.set("view", viewMode);
        return p;
      },
      { replace: true },
    );
  }, [filtersHydrated, assignmentFilter, statusFilter, tagFilter, sortKey, filter, viewMode, setSearchParams]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filter !== "all") n++;
    if (debouncedSearch.trim()) n++;
    if (assignmentFilter !== "all") n++;
    if (statusFilter !== "all") n++;
    if (tagFilter !== "all") n++;
    if (sortKey !== "updated") n++;
    if (dateRange !== "all") n++;
    return n;
  }, [filter, debouncedSearch, assignmentFilter, statusFilter, tagFilter, sortKey, dateRange]);

  const resetAllFilters = useCallback(() => {
    setFilter("all");
    setSearch("");
    setAssignmentFilter("all");
    setStatusFilter("all");
    setTagFilter("all");
    setSortKey("updated");
    setDateRange("all");
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const [bulkLinking, setBulkLinking] = useState(false);
  const handleBulkLink = useCallback(async () => {
    if (!user?.id || selected.size < 2) return;
    const chain = ideaWebEntries.filter((e) => selected.has(e.id));
    const existingPairs = new Set(ideaWebLinks.map((l) => `${l.fromEntryId}::${l.toEntryId}`));
    const pairs: { from: string; to: string }[] = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const from = chain[i].id;
      const to = chain[i + 1].id;
      if (!existingPairs.has(`${from}::${to}`) && !existingPairs.has(`${to}::${from}`)) {
        pairs.push({ from, to });
      }
    }
    if (pairs.length === 0) {
      toast({ title: "Already linked", description: "All selected entries are already connected." });
      return;
    }
    setBulkLinking(true);
    try {
      for (const p of pairs) {
        await createIdeaWebLink({ userId: user.id, fromEntryId: p.from, toEntryId: p.to, kind: "manual" });
      }
      await refetchIdeaWeb();
      toast({ title: `${pairs.length} link${pairs.length === 1 ? "" : "s"} created` });
      clearSelection();
    } catch (err) {
      toast({
        title: "Link failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBulkLinking(false);
    }
  }, [user?.id, selected, ideaWebEntries, ideaWebLinks, refetchIdeaWeb, clearSelection]);

  const ideas = useMemo(() => {
    let list = [...ideaWebEntries];
    if (assignmentFilter === "unassigned") list = list.filter((e) => e.novelId === null);
    else if (assignmentFilter !== "all") list = list.filter((e) => e.novelId === assignmentFilter);
    if (statusFilter !== "all") list = list.filter((e) => e.status === statusFilter);
    if (tagFilter === "tagged") list = list.filter((e) => e.tags.length > 0);
    if (tagFilter === "untagged") list = list.filter((e) => e.tags.length === 0);
    if (dateRange !== "all") {
      const days = Number(dateRange.replace("d", ""));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffIso = cutoff.toISOString();
      list = list.filter((e) => e.createdAt >= cutoffIso);
    }
    return list;
  }, [ideaWebEntries, assignmentFilter, statusFilter, tagFilter, dateRange]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? ideas : ideas.filter((i) => entryCategory(i) === filter);
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.body.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === "title") return (a.title || "").localeCompare(b.title || "");
      if (sortKey === "created") return (b.createdAt || "").localeCompare(a.createdAt || "");
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    return sorted;
  }, [ideas, filter, debouncedSearch, sortKey]);

  const entryFocusId = searchParams.get("entry");

  const handleEntryExpandChange = useCallback(
    (id: string, expanded: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (expanded) {
            next.set("entry", id);
          } else if (next.get("entry") === id) {
            next.delete("entry");
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  useEffect(() => {
    if (!filtersHydrated || !entryFocusId) return;
    let cancelled = false;
    let attempts = 0;
    const iv = window.setInterval(() => {
      if (cancelled) return;
      attempts += 1;
      const el = document.getElementById(`idea-web-entry-${entryFocusId}`);
      if (el) {
        el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        el.classList.add("ring-2", "ring-teal-600", "ring-offset-2", "rounded-md");
        window.setTimeout(() => {
          el.classList.remove("ring-2", "ring-teal-600", "ring-offset-2", "rounded-md");
        }, 2600);
        setSearchParams(
          (prev) => {
            const p = new URLSearchParams(prev);
            p.delete("entry");
            return p;
          },
          { replace: true },
        );
        window.clearInterval(iv);
        return;
      }
      if (attempts >= 28) {
        toast({
          title: "Idea not visible",
          description: "Try clearing filters or search so this entry appears in the list.",
        });
        setSearchParams(
          (prev) => {
            const p = new URLSearchParams(prev);
            p.delete("entry");
            return p;
          },
          { replace: true },
        );
        window.clearInterval(iv);
      }
    }, 130);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [filtersHydrated, entryFocusId, filtered, setSearchParams, reduceMotion]);

  const selectAllVisible = useCallback(() => {
    setSelected(new Set(filtered.map((i) => i.id)));
  }, [filtered]);

  const pinned = filtered.filter((i) => i.pinned);
  const unpinned = filtered.filter((i) => !i.pinned);
  const unpinnedActive = useMemo(() => unpinned.filter((i) => i.status !== "dormant"), [unpinned]);
  const unpinnedDormant = useMemo(() => unpinned.filter((i) => i.status === "dormant"), [unpinned]);

  // Cursor-based pagination for the non-virtualised grid / list view
  const [activeVisible, setActiveVisible] = useState(PAGE_SIZE);
  const [dormantVisible, setDormantVisible] = useState(PAGE_SIZE);
  // Reset page when filter changes
  useEffect(() => {
    setActiveVisible(PAGE_SIZE);
    setDormantVisible(PAGE_SIZE);
  }, [filtered]);

  const activePageSlice = useMemo(() => unpinnedActive.slice(0, activeVisible), [unpinnedActive, activeVisible]);
  const dormantPageSlice = useMemo(() => unpinnedDormant.slice(0, dormantVisible), [unpinnedDormant, dormantVisible]);
  const hasMoreActive = unpinnedActive.length > activeVisible;
  const hasMoreDormant = unpinnedDormant.length > dormantVisible;

  const selectedIdeas = useMemo(() => filtered.filter((i) => selected.has(i.id)), [filtered, selected]);

  useEffect(() => {
    if (dormantBatchDone.current || !preferences || ideaWebEntries.length === 0) return;
    const s = parseIdeaWebSettings(preferences.idea_web_settings);
    if (!s.autoDormantEnabled) return;
    const cutoff = Date.now() - s.inactivityDays * 86_400_000;
    const stale = ideaWebEntries.filter(
      (e) => !["dormant", "harvested", "archived"].includes(e.status) && new Date(e.updatedAt).getTime() < cutoff,
    );
    if (stale.length === 0) return;
    dormantBatchDone.current = true;
    void (async () => {
      for (const e of stale) {
        await patchIdeaWebEntry(e.id, { status: "dormant" });
      }
    })();
  }, [preferences, ideaWebEntries, patchIdeaWebEntry]);

  const mapEntryIdsFilter = viewMode === "map" ? filtered.map((e) => e.id) : undefined;

  const isTrulyEmpty = ideaWebEntries.length === 0;
  const isFilteredEmpty = !isTrulyEmpty && filtered.length === 0;

  const filtersBlock = (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Filters</p>
      <FiltersGrid
        assignmentFilter={assignmentFilter}
        setAssignmentFilter={setAssignmentFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        sortKey={sortKey}
        setSortKey={setSortKey}
        dateRange={dateRange}
        setDateRange={setDateRange}
        novels={novels}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn("w-full max-w-none p-3 sm:p-4", selected.size > 0 && "pb-24")}
    >
      {wordDraftNotice && (
        <div className="-mx-3 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-50/50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 sm:-mx-4 sm:px-4">
          <span>Pending Word import draft ({new Date(wordDraftNotice.savedAt).toLocaleString()})</span>
          <span className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const d = loadDraft(user?.id, WORD_IMPORT_DRAFT);
                if (d?.data?.preview) {
                  setWordPreview(d.data.preview);
                  setWordDialogOpen(true);
                }
                setWordDraftNotice(null);
              }}
            >
              Resume
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                clearDraft(user?.id, WORD_IMPORT_DRAFT);
                setWordDraftNotice(null);
              }}
            >
              Discard
            </Button>
          </span>
        </div>
      )}
      {/* Sticky toolbar */}
      <div
        role="region"
        aria-label="Idea Web toolbar"
        className="sticky top-0 z-20 -mx-3 mb-4 border-b border-border bg-background/80 px-3 py-3 backdrop-blur-sm sm:-mx-4 sm:px-4"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 className="text-2xl font-bold font-serif text-foreground">Idea Web</h2>
                <IdeaWebSmartSubtitle
                  entries={ideaWebEntries}
                  links={ideaWebLinks}
                  novels={novels.map((n) => ({ id: n.id, title: n.title }))}
                  filteredCount={filtered.length}
                />
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Input
                type="search"
                placeholder="Search title, body, tags…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 min-w-0 flex-1 text-xs sm:max-w-xs"
                aria-label="Search ideas"
              />
              <div className="flex shrink-0 rounded-md border border-border p-0.5" role="group" aria-label="View mode">
                <button
                  type="button"
                  title="List"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  className={`rounded-sm p-1.5 ${viewMode === "list" ? "bg-accent/10" : "text-muted-foreground"}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Grid"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={`rounded-sm p-1.5 ${viewMode === "grid" ? "bg-accent/10" : "text-muted-foreground"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Map"
                  aria-pressed={viewMode === "map"}
                  onClick={() => setViewMode("map")}
                  className={`rounded-sm p-1.5 ${viewMode === "map" ? "bg-accent/10" : "text-muted-foreground"}`}
                >
                  <Network className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => downloadIdeaWebMarkdown(ideaWebEntries)}
              >
                Export Markdown
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => wordImportRef.current?.click()}
              >
                Import Word…
              </Button>
              <input
                ref={wordImportRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    assertFileSizeWithin(file, FILE_SIZE_LIMITS.wordDocxBytes, "Word document");
                    const prev = await previewWordFile(file);
                    setWordPreview(prev.plainText.slice(0, 12000));
                    setWordDialogOpen(true);
                  } catch (err) {
                    toast({
                      title: "Could not read Word file",
                      description: err instanceof Error ? err.message : undefined,
                      variant: "destructive",
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters + bulk actions: collapsed by default on all breakpoints */}
      <div className="mb-4">
        <Collapsible open={moreFiltersOpen} onOpenChange={setMoreFiltersOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/50">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
              More filters & bulk actions
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {activeFilterCount} active
                </span>
              ) : null}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 overflow-hidden">
            {filtersBlock}
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
              {activeFilterCount > 0 && (
                <>
                  <span>
                    {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} · {filtered.length} shown
                  </span>
                  <Button type="button" variant="secondary" size="sm" className="h-7 text-xs" onClick={resetAllFilters}>
                    Reset all
                  </Button>
                </>
              )}
              {viewMode !== "map" && filtered.length > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllVisible}>
                  Select all in view
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Quick add by type */}
          <div className="flex flex-wrap items-center gap-2">
            {IDEA_WEB_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => addIdeaToInbox(cat.value)}
                title={`Add ${cat.label} idea`}
                className="flex items-center gap-1 rounded-md border border-border/70 bg-card/80 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Type segment */}
          <div className="mb-2">
            <p className="text-[10px] text-muted-foreground">Filter by idea type</p>
          </div>
          <div className="mb-6 flex w-fit max-w-full flex-wrap items-center gap-1 rounded-md border border-border bg-secondary/50 p-0.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === "all" ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All types ({ideas.length})
            </button>
            {IDEA_WEB_CATEGORIES.map((cat) => {
              const count = ideas.filter((i) => entryCategory(i) === cat.value).length;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFilter(cat.value)}
                  className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === cat.value
                      ? "bg-accent/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          <IdeaWebHarvestDialog
            open={harvestOpen}
            onOpenChange={setHarvestOpen}
            entryIds={[...selected]}
            onDone={() => setSelected(new Set())}
          />

          {viewMode === "map" && <IdeaMapView novelId="all" entryIdsFilter={mapEntryIdsFilter} />}

          {/* Empty states (list / grid) */}
          {viewMode !== "map" && filtered.length === 0 && (
            <div
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/10 px-4 py-16 text-center"
              role="status"
            >
              <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/30" aria-hidden />
              {isFilteredEmpty && (
                <>
                  <p className="mb-1 max-w-md text-sm font-medium text-foreground">No ideas match these filters</p>
                  <p className="mb-6 max-w-md text-xs text-muted-foreground">
                    Try widening your search or clearing filters to see more of your web.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button type="button" onClick={resetAllFilters}>
                      Reset filters
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        goToDashboard();
                        navigate("/");
                      }}
                    >
                      Open dashboard
                    </Button>
                  </div>
                </>
              )}
              {isTrulyEmpty && (
                <>
                  <p className="mb-1 max-w-md text-sm font-medium text-foreground">Start your Idea Web</p>
                  <p className="mb-6 max-w-md text-xs text-muted-foreground">
                    One place for sparks before they become scenes—capture now, assign or harvest into a book later.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => openIdeaWebQuickCapture()}
                    >
                      <Plus className="h-4 w-4" />
                      Capture an idea
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        goToDashboard();
                        navigate("/");
                      }}
                    >
                      Go to dashboard
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {viewMode !== "map" && filtered.length > 0 && (
            <>
              {pinned.length > 0 && (
                <div className="mb-6 [content-visibility:auto]">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Pinned
                  </p>
                  <div className={viewMode === "grid" ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                    <AnimatePresence>
                      {pinned.map((idea) => (
                        <IdeaWebEntryCard
                          key={idea.id}
                          entry={idea}
                          novels={novels}
                          onUpdate={updateIdea}
                          onDelete={deleteIdea}
                          onPatchEntry={patchIdeaWebEntry}
                          selectable
                          selected={selected.has(idea.id)}
                          onToggleSelect={() => toggleSelect(idea.id)}
                          defaultExpanded={entryFocusId === idea.id}
                          onExpandChange={handleEntryExpandChange}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {unpinnedActive.length > 0 && (
                <div className="mb-2">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Active
                  </p>
                  {viewMode === "list" && unpinnedActive.length > 15 ? (
                    <VirtualList items={unpinnedActive} estimateRowHeight={140} maxHeight="min(65vh, 720px)">
                      {(idea) => (
                        <IdeaWebEntryCard
                          key={idea.id}
                          entry={idea}
                          novels={novels}
                          onUpdate={updateIdea}
                          onDelete={deleteIdea}
                          onPatchEntry={patchIdeaWebEntry}
                          selectable
                          selected={selected.has(idea.id)}
                          onToggleSelect={() => toggleSelect(idea.id)}
                          defaultExpanded={entryFocusId === idea.id}
                          onExpandChange={handleEntryExpandChange}
                        />
                      )}
                    </VirtualList>
                  ) : (
                    <>
                      <div
                        className={cn(
                          viewMode === "grid" ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2",
                          "[content-visibility:auto]",
                        )}
                      >
                        <AnimatePresence>
                          {activePageSlice.map((idea) => (
                            <IdeaWebEntryCard
                              key={idea.id}
                              entry={idea}
                              novels={novels}
                              onUpdate={updateIdea}
                              onDelete={deleteIdea}
                              onPatchEntry={patchIdeaWebEntry}
                              selectable
                              selected={selected.has(idea.id)}
                              onToggleSelect={() => toggleSelect(idea.id)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                      {hasMoreActive && (
                        <button
                          type="button"
                          className="mt-3 w-full rounded-sm border border-border py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                          onClick={() => setActiveVisible((v) => v + PAGE_SIZE)}
                        >
                          Load more ({unpinnedActive.length - activeVisible} remaining)
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {unpinnedDormant.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Dormant
                  </p>
                  {viewMode === "list" && unpinnedDormant.length > 15 ? (
                    <VirtualList items={unpinnedDormant} estimateRowHeight={120} maxHeight="min(55vh, 560px)">
                      {(idea) => (
                        <IdeaWebEntryCard
                          key={idea.id}
                          entry={idea}
                          novels={novels}
                          onUpdate={updateIdea}
                          onDelete={deleteIdea}
                          onPatchEntry={patchIdeaWebEntry}
                          selectable
                          selected={selected.has(idea.id)}
                          onToggleSelect={() => toggleSelect(idea.id)}
                          defaultExpanded={entryFocusId === idea.id}
                          onExpandChange={handleEntryExpandChange}
                        />
                      )}
                    </VirtualList>
                  ) : (
                    <>
                      <div
                        className={cn(
                          viewMode === "grid" ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2",
                          "[content-visibility:auto]",
                        )}
                      >
                        <AnimatePresence>
                          {dormantPageSlice.map((idea) => (
                            <IdeaWebEntryCard
                              key={idea.id}
                              entry={idea}
                              novels={novels}
                              onUpdate={updateIdea}
                              onDelete={deleteIdea}
                              onPatchEntry={patchIdeaWebEntry}
                              selectable
                              selected={selected.has(idea.id)}
                              onToggleSelect={() => toggleSelect(idea.id)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                      {hasMoreDormant && (
                        <button
                          type="button"
                          className="mt-3 w-full rounded-sm border border-border py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                          onClick={() => setDormantVisible((v) => v + PAGE_SIZE)}
                        >
                          Load more ({unpinnedDormant.length - dormantVisible} remaining)
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <aside className="order-last w-full shrink-0 lg:sticky lg:top-16 lg:w-[min(100%,380px)] lg:self-start">
          {isLg ? (
            <IdeationTools selectedIdeas={selectedIdeas} novels={novels} />
          ) : (
            <Collapsible defaultOpen={false} className="rounded-lg border border-border/70 bg-card/40">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold">
                <span>Ideation tools</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border/50 px-3 pb-3 pt-1">
                <IdeationTools selectedIdeas={selectedIdeas} novels={novels} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </aside>
      </div>

      {/* Selection bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? false : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 z-30 flex min-h-[44px] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-md sm:min-h-0 sm:py-2.5"
            role="toolbar"
            aria-label="Selection actions"
          >
            <span className="text-xs font-medium text-foreground">{selected.size} selected</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 text-xs sm:min-h-8"
              onClick={clearSelection}
            >
              Clear
            </Button>
            {selected.size >= 2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 gap-1 text-xs sm:min-h-8"
                onClick={() => void handleBulkLink()}
                disabled={bulkLinking}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                {bulkLinking ? "Linking…" : "Link chain"}
              </Button>
            )}
            {novels.length > 0 && (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="min-h-11 gap-1 text-xs sm:min-h-8"
                onClick={() => setHarvestOpen(true)}
              >
                <Wheat className="h-3.5 w-3.5" aria-hidden />
                Harvest
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={wordDialogOpen}
        onOpenChange={(o) => {
          if (!o && wordPreview.trim() && user?.id) {
            saveDraft(user.id, WORD_IMPORT_DRAFT, { preview: wordPreview });
          }
          setWordDialogOpen(o);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from Word</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Plain-text preview. This adds one Idea Web entry to your inbox.
          </p>
          <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
            {wordPreview}
          </pre>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setWordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    await createGlobalIdeaWebEntry({
                      title: "Imported from Word",
                      body: wordPreview,
                    });
                    clearDraft(user?.id, WORD_IMPORT_DRAFT);
                    setWordDraftNotice(null);
                    toast({ title: "Added to Idea Web inbox" });
                    setWordDialogOpen(false);
                  } catch {
                    toast({ title: "Could not save", variant: "destructive" });
                  }
                })();
              }}
            >
              Add to inbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
