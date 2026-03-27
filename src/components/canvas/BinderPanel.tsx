import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  FileText,
  Filter,
  GripVertical,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNovelContext } from "@/contexts/NovelContext";
import type { Act, Chapter, Scene } from "@/types/novel";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<Scene["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  "in-progress": "bg-primary/20 text-primary",
  complete: "bg-emerald-500/20 text-emerald-400",
  revision: "bg-amber-500/20 text-amber-400",
};

const STATUS_DOT: Record<Scene["status"], string> = {
  draft: "bg-muted-foreground/50",
  "in-progress": "bg-primary",
  complete: "bg-emerald-500",
  revision: "bg-amber-500",
};

const ACT_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#84cc16"];

// ── Scene metadata mini-panel ──────────────────────────────────────────────────

function SceneMetaPanel({
  scene,
  actTitle,
  chapterTitle,
  beats,
  onClose,
  onUpdate,
}: {
  scene: Scene;
  actTitle: string;
  chapterTitle: string;
  beats: { id: string; title: string; color?: string }[];
  onClose: () => void;
  onUpdate: (patch: Partial<Scene>) => void;
}) {
  const [notes, setNotes] = useState(scene.notes ?? "");
  const [target, setTarget] = useState(String(scene.targetWordCount ?? ""));
  const [pov, setPov] = useState(scene.pov ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="fixed right-0 top-0 z-50 h-full w-80 border-l-2 border-border bg-card p-4 shadow-xl overflow-y-auto"
      role="dialog"
      aria-label={`Scene details: ${scene.title}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-foreground truncate pr-2">{scene.title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Close scene details"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground mb-4">
        {actTitle} · {chapterTitle}
      </p>

      <div className="space-y-4 text-xs">
        {/* Status */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Status
          </label>
          <select
            className="w-full rounded-sm border border-border bg-background px-2 py-1 text-xs"
            value={scene.status}
            onChange={(e) => onUpdate({ status: e.target.value as Scene["status"] })}
          >
            <option value="draft">Draft</option>
            <option value="in-progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="revision">Revision</option>
          </select>
        </div>

        {/* POV */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            POV
          </label>
          <Input
            value={pov}
            onChange={(e) => setPov(e.target.value)}
            onBlur={() => onUpdate({ pov: pov || undefined })}
            placeholder="POV character…"
            className="h-7 text-xs"
          />
        </div>

        {/* Beat */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Beat
          </label>
          <select
            className="w-full rounded-sm border border-border bg-background px-2 py-1 text-xs"
            value={scene.beatId ?? ""}
            onChange={(e) => onUpdate({ beatId: e.target.value || undefined })}
          >
            <option value="">— unassigned —</option>
            {beats.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>

        {/* Word count target */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Word Count Target
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onBlur={() => onUpdate({ targetWordCount: target ? Number(target) : undefined })}
              placeholder="e.g. 2000"
              className="h-7 text-xs"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">actual: {scene.wordCount}w</span>
          </div>
          {scene.targetWordCount && scene.targetWordCount > 0 && (
            <Progress
              value={Math.min(100, Math.round((scene.wordCount / scene.targetWordCount) * 100))}
              className="h-1 mt-1"
            />
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Planning Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdate({ notes: notes || undefined })}
            placeholder="Private planning notes (not manuscript text)…"
            rows={4}
            className="w-full resize-none rounded-sm border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Summary */}
        {scene.summary && (
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Synopsis
            </label>
            <p className="text-muted-foreground leading-relaxed">{scene.summary}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Confirm-delete dialog ──────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  open,
  label,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  label: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Move-to dialog ─────────────────────────────────────────────────────────────

function MoveToDialog({
  open,
  sceneTitle,
  acts,
  currentChapterId,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  sceneTitle: string;
  acts: Act[];
  currentChapterId: string;
  onConfirm: (chapterId: string, index: number) => void;
  onCancel: () => void;
}) {
  const [selectedChapterId, setSelectedChapterId] = useState(currentChapterId);

  const chapters = useMemo(() => acts.flatMap((a) => a.chapters.map((c) => ({ ...c, actTitle: a.title }))), [acts]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move "{sceneTitle}"</DialogTitle>
          <DialogDescription>Select a chapter to move this scene to.</DialogDescription>
        </DialogHeader>
        <select
          className="w-full rounded-sm border border-border bg-background px-2 py-2 text-sm"
          value={selectedChapterId}
          onChange={(e) => setSelectedChapterId(e.target.value)}
        >
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.actTitle} — {c.title}
            </option>
          ))}
        </select>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(selectedChapterId, 0)}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BinderPanel() {
  const {
    activeNovel,
    addActToNovel,
    addChapterToAct,
    addSceneToChapter,
    setActiveScene,
    setMode,
    reorderScene,
    deleteScene,
    duplicateScene,
    updateScene,
    updateAct,
    deleteAct,
    reorderAct,
    updateChapter,
    deleteChapter,
    reorderChapter,
    getActiveBeats,
  } = useNovelContext();

  // ── State ────────────────────────────────────────────────────────────────────
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set(activeNovel?.acts.map((a) => a.id) || []));
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(activeNovel?.acts.flatMap((a) => a.chapters.map((c) => c.id)) || []),
  );
  const [dragInfo, setDragInfo] = useState<{ sceneId: string; chapterId: string } | null>(null);
  const [actDragFrom, setActDragFrom] = useState<number | null>(null);
  const [chapterDragInfo, setChapterDragInfo] = useState<{ actId: string; from: number } | null>(null);

  // Search & filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Scene["status"] | "">("");
  const [povFilter, setPovFilter] = useState("");

  // Inline editing
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editingActTitle, setEditingActTitle] = useState("");
  const [editingActSummary, setEditingActSummary] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");

  // Bulk selection
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
  const lastClickedSceneRef = useRef<string | null>(null);

  // Meta panel
  const [metaSceneId, setMetaSceneId] = useState<string | null>(null);

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "act"; id: string; label: string }
    | { type: "chapter"; id: string; label: string }
    | { type: "scene"; id: string; chapterId: string; label: string }
    | null
  >(null);

  // Move-to dialog
  const [moveSceneInfo, setMoveSceneInfo] = useState<{
    sceneId: string;
    sceneTitle: string;
    fromChapterId: string;
  } | null>(null);

  // Bulk status change
  const [bulkStatusTarget, setBulkStatusTarget] = useState<Scene["status"] | null>(null);

  const beats = getActiveBeats();
  const beatMap = useMemo(() => new Map(beats.map((b) => [b.id, b])), [beats]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const allScenes = useMemo(
    () =>
      activeNovel?.acts.flatMap((a) =>
        a.chapters.flatMap((c) => c.scenes.map((s) => ({ scene: s, chapterId: c.id, actId: a.id }))),
      ) ?? [],
    [activeNovel],
  );

  const allPovChars = useMemo(
    () => Array.from(new Set(allScenes.map((x) => x.scene.pov).filter(Boolean) as string[])).sort(),
    [allScenes],
  );

  const matchesFilter = useCallback(
    (scene: Scene) => {
      if (statusFilter && scene.status !== statusFilter) return false;
      if (povFilter && scene.pov !== povFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!scene.title.toLowerCase().includes(q) && !scene.summary.toLowerCase().includes(q)) return false;
      }
      return true;
    },
    [statusFilter, povFilter, search],
  );

  const hasFilters = Boolean(search || statusFilter || povFilter);

  // ── Meta panel scene info (must be before early return) ──────────────────────

  const metaScene = useMemo(() => {
    if (!metaSceneId || !activeNovel) return null;
    for (const act of activeNovel.acts) {
      for (const ch of act.chapters) {
        const sc = ch.scenes.find((s) => s.id === metaSceneId);
        if (sc) return { scene: sc, actTitle: act.title, chapterTitle: ch.title };
      }
    }
    return null;
  }, [metaSceneId, activeNovel]);

  if (!activeNovel) return null;

  const openScene = (sceneId: string) => {
    setActiveScene(sceneId);
    setMode("write");
  };

  // ── Toggle expand ─────────────────────────────────────────────────────────────

  const toggleAct = (id: string) =>
    setExpandedActs((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleChapter = (id: string) =>
    setExpandedChapters((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const collapseAll = () => {
    setExpandedActs(new Set());
    setExpandedChapters(new Set());
  };

  const expandAll = () => {
    setExpandedActs(new Set(activeNovel.acts.map((a) => a.id)));
    setExpandedChapters(new Set(activeNovel.acts.flatMap((a) => a.chapters.map((c) => c.id))));
  };

  const allExpanded =
    activeNovel.acts.every((a) => expandedActs.has(a.id)) &&
    activeNovel.acts.flatMap((a) => a.chapters).every((c) => expandedChapters.has(c.id));

  // ── Scene drag ─────────────────────────────────────────────────────────────────

  const handleSceneDragStart = (sceneId: string, chapterId: string) => setDragInfo({ sceneId, chapterId });
  const handleSceneDrop = (targetChapterId: string, targetIndex: number) => {
    if (!dragInfo) return;
    reorderScene(dragInfo.sceneId, dragInfo.chapterId, targetChapterId, targetIndex);
    setDragInfo(null);
  };

  // ── Act drag ───────────────────────────────────────────────────────────────────

  const handleActDragStart = (idx: number) => setActDragFrom(idx);
  const handleActDrop = (toIdx: number) => {
    if (actDragFrom === null || actDragFrom === toIdx) {
      setActDragFrom(null);
      return;
    }
    reorderAct(actDragFrom, toIdx);
    setActDragFrom(null);
  };

  // ── Chapter drag ───────────────────────────────────────────────────────────────

  const handleChapterDragStart = (actId: string, from: number) => setChapterDragInfo({ actId, from });
  const handleChapterDrop = (actId: string, to: number) => {
    if (!chapterDragInfo || chapterDragInfo.actId !== actId || chapterDragInfo.from === to) {
      setChapterDragInfo(null);
      return;
    }
    reorderChapter(actId, chapterDragInfo.from, to);
    setChapterDragInfo(null);
  };

  // ── Bulk select ────────────────────────────────────────────────────────────────

  const toggleSceneSelection = (sceneId: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedSceneRef.current) {
      // range select
      const flat = allScenes.map((x) => x.scene.id);
      const a = flat.indexOf(lastClickedSceneRef.current);
      const b = flat.indexOf(sceneId);
      const [lo, hi] = a < b ? [a, b] : [b, a];
      setSelectedScenes((prev) => {
        const n = new Set(prev);
        flat.slice(lo, hi + 1).forEach((id) => n.add(id));
        return n;
      });
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedScenes((prev) => {
        const n = new Set(prev);
        n.has(sceneId) ? n.delete(sceneId) : n.add(sceneId);
        return n;
      });
    } else {
      setSelectedScenes(new Set([sceneId]));
    }
    lastClickedSceneRef.current = sceneId;
  };

  const clearSelection = () => setSelectedScenes(new Set());

  const bulkChangeStatus = (status: Scene["status"]) => {
    for (const id of selectedScenes) updateScene(id, { status });
    clearSelection();
    setBulkStatusTarget(null);
  };

  // ── Act word count ─────────────────────────────────────────────────────────────

  const actWordCount = (act: Act) =>
    act.chapters.reduce((s, ch) => s + ch.scenes.reduce((ss, sc) => ss + sc.wordCount, 0), 0);

  const chapterWordCount = (ch: Chapter) => ch.scenes.reduce((s, sc) => s + sc.wordCount, 0);

  const chapterCompletionPct = (ch: Chapter) => {
    if (ch.scenes.length === 0) return 0;
    const done = ch.scenes.filter((s) => s.status === "complete").length;
    return Math.round((done / ch.scenes.length) * 100);
  };

  // ── Inline act editing ─────────────────────────────────────────────────────────

  const startEditAct = (act: Act) => {
    setEditingActId(act.id);
    setEditingActTitle(act.title);
    setEditingActSummary(act.summary ?? "");
  };

  const saveAct = () => {
    if (!editingActId) return;
    updateAct(editingActId, { title: editingActTitle, summary: editingActSummary || undefined });
    setEditingActId(null);
  };

  // ── Inline chapter editing ─────────────────────────────────────────────────────

  const startEditChapter = (ch: Chapter) => {
    setEditingChapterId(ch.id);
    setEditingChapterTitle(ch.title);
  };

  const saveChapter = () => {
    if (!editingChapterId) return;
    updateChapter(editingChapterId, { title: editingChapterTitle });
    setEditingChapterId(null);
  };

  // ── Delete confirm helpers ─────────────────────────────────────────────────────

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "act") deleteAct(deleteTarget.id);
    else if (deleteTarget.type === "chapter") deleteChapter(deleteTarget.id);
    else if (deleteTarget.type === "scene") deleteScene(deleteTarget.id);
    setDeleteTarget(null);
  };

  // ── Empty state ────────────────────────────────────────────────────────────────

  if (activeNovel.acts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed border-border/60 bg-muted/20 py-12 text-center">
        <p className="text-base font-semibold text-foreground">Your story has no structure yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Create your first Act to start organizing chapters and scenes.
        </p>
        <Button variant="outline" size="sm" onClick={addActToNovel} className="mt-2 gap-1.5 border-2 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add your first act
        </Button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-2">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search
              className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search scenes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-sm border border-border bg-background pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Status filter */}
          <select
            className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Scene["status"] | "")}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="in-progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="revision">Revision</option>
          </select>

          {/* POV filter */}
          {allPovChars.length > 0 && (
            <select
              className="h-8 rounded-sm border border-border bg-background px-2 text-xs"
              value={povFilter}
              onChange={(e) => setPovFilter(e.target.value)}
              aria-label="Filter by POV"
            >
              <option value="">All POVs</option>
              {allPovChars.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPovFilter("");
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Clear filters"
            >
              <Filter className="h-3.5 w-3.5" aria-hidden />
              Clear
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {/* Collapse / Expand all */}
            <button
              type="button"
              onClick={allExpanded ? collapseAll : expandAll}
              className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              aria-label={allExpanded ? "Collapse all" : "Expand all"}
            >
              {allExpanded ? (
                <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />
              )}
              {allExpanded ? "Collapse" : "Expand"}
            </button>

            <Button variant="outline" size="sm" onClick={addActToNovel} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add Act
            </Button>
          </div>
        </div>

        {/* Bulk selection toolbar */}
        <AnimatePresence>
          {selectedScenes.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 px-3 py-2 text-xs"
            >
              <span className="font-medium text-foreground">{selectedScenes.size} selected</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Change status:</span>
              {(["draft", "in-progress", "complete", "revision"] as Scene["status"][]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => bulkChangeStatus(s)}
                  className={`rounded px-1.5 py-0.5 transition-colors ${STATUS_COLORS[s]}`}
                >
                  {s}
                </button>
              ))}
              <button
                type="button"
                onClick={clearSelection}
                className="ml-auto text-muted-foreground hover:text-foreground"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Acts */}
        <div role="tree" aria-label="Story outline">
          {activeNovel.acts.map((act, actIdx) => {
            const actWc = actWordCount(act);
            const actColor = act.color ?? ACT_COLORS[actIdx % ACT_COLORS.length];

            return (
              <motion.div
                key={act.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-2 rounded-sm border-2 border-border/70 bg-card/50"
                draggable
                onDragStart={() => handleActDragStart(actIdx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleActDrop(actIdx);
                }}
                role="treeitem"
                aria-expanded={expandedActs.has(act.id)}
              >
                {/* Act header */}
                {editingActId === act.id ? (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editingActTitle}
                        onChange={(e) => setEditingActTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveAct();
                          if (e.key === "Escape") setEditingActId(null);
                        }}
                        className="flex-1 rounded-sm border-2 border-border bg-background px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={saveAct}
                        className="rounded p-1 text-primary hover:bg-primary/10"
                        aria-label="Save act title"
                      >
                        <Check className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingActId(null)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent/10"
                        aria-label="Cancel editing"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <textarea
                      value={editingActSummary}
                      onChange={(e) => setEditingActSummary(e.target.value)}
                      placeholder="Act summary (optional)…"
                      rows={2}
                      className="w-full resize-none rounded-sm border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <GripVertical
                      className="h-3.5 w-3.5 text-border shrink-0 cursor-grab active:cursor-grabbing"
                      aria-hidden
                    />
                    <button
                      type="button"
                      onClick={() => toggleAct(act.id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      {expandedActs.has(act.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                      )}
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: actColor }}
                        aria-hidden
                      />
                      <span className="font-semibold text-foreground">{act.title}</span>
                      {act.summary && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" aria-hidden />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs text-xs">
                            {act.summary}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground font-mono">
                        {act.chapters.length} ch · {act.chapters.reduce((s, c) => s + c.scenes.length, 0)} sc ·{" "}
                        {actWc.toLocaleString()}w
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent/10 transition-all focus-visible:opacity-100"
                          aria-label={`Act options for ${act.title}`}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={() => startEditAct(act)}>
                          <Pencil className="h-3 w-3 mr-2" aria-hidden />
                          Rename / Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addChapterToAct(act.id)}>
                          <Plus className="h-3 w-3 mr-2" aria-hidden />
                          Add Chapter
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget({ type: "act", id: act.id, label: act.title })}
                        >
                          <Trash2 className="h-3 w-3 mr-2" aria-hidden />
                          Delete Act
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Chapters */}
                {expandedActs.has(act.id) && (
                  <div className="border-t-2 border-border/40 px-2 pb-2" role="group">
                    {act.chapters.map((chapter, chIdx) => {
                      const chWc = chapterWordCount(chapter);
                      const chPct = chapterCompletionPct(chapter);
                      const filteredScenes = chapter.scenes.filter(matchesFilter);

                      return (
                        <div
                          key={chapter.id}
                          className="ml-4 mt-1"
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleChapterDragStart(act.id, chIdx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleChapterDrop(act.id, chIdx);
                          }}
                          role="treeitem"
                          aria-expanded={expandedChapters.has(chapter.id)}
                        >
                          {/* Chapter header */}
                          {editingChapterId === chapter.id ? (
                            <div className="flex items-center gap-2 px-3 py-2">
                              <input
                                autoFocus
                                value={editingChapterTitle}
                                onChange={(e) => setEditingChapterTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveChapter();
                                  if (e.key === "Escape") setEditingChapterId(null);
                                }}
                                className="flex-1 rounded-sm border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <button
                                type="button"
                                onClick={saveChapter}
                                className="rounded p-1 text-primary hover:bg-primary/10"
                                aria-label="Save"
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingChapterId(null)}
                                className="rounded p-1 text-muted-foreground"
                                aria-label="Cancel"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                          ) : (
                            <div className="group flex items-center gap-1 rounded-sm px-3 py-2 text-sm hover:bg-accent/5 transition-colors">
                              <GripVertical className="h-3 w-3 text-border shrink-0 cursor-grab" aria-hidden />
                              <button
                                type="button"
                                onClick={() => toggleChapter(chapter.id)}
                                className="flex flex-1 items-center gap-2 text-left"
                              >
                                {expandedChapters.has(chapter.id) ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                                )}
                                <span className="font-medium text-foreground">{chapter.title}</span>
                                {chapter.summary && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-muted-foreground" aria-hidden />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs text-xs">
                                      {chapter.summary}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <span className="ml-auto text-xs text-muted-foreground font-mono">
                                  {chapter.scenes.length} sc · {chWc.toLocaleString()}w
                                  {chapter.targetWordCount ? ` / ${chapter.targetWordCount.toLocaleString()}` : ""}
                                </span>
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent/10 transition-all focus-visible:opacity-100"
                                    aria-label={`Chapter options for ${chapter.title}`}
                                  >
                                    <MoreHorizontal className="h-3 w-3" aria-hidden />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                  <DropdownMenuItem onClick={() => startEditChapter(chapter)}>
                                    <Pencil className="h-3 w-3 mr-2" aria-hidden />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addSceneToChapter(chapter.id)}>
                                    <Plus className="h-3 w-3 mr-2" aria-hidden />
                                    Add Scene
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      setDeleteTarget({ type: "chapter", id: chapter.id, label: chapter.title })
                                    }
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" aria-hidden />
                                    Delete Chapter
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}

                          {/* Chapter progress bar */}
                          {expandedChapters.has(chapter.id) && chapter.scenes.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="ml-6 px-3 pb-1">
                                  <Progress value={chPct} className="h-1" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                {chapter.scenes.filter((s) => s.status === "complete").length} / {chapter.scenes.length}{" "}
                                scenes complete ({chPct}%)
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Scenes */}
                          {expandedChapters.has(chapter.id) && (
                            <div
                              className="ml-6 space-y-0.5 pb-2"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleSceneDrop(chapter.id, chapter.scenes.length);
                              }}
                              role="group"
                            >
                              {(hasFilters ? filteredScenes : chapter.scenes).map((scene, sceneIdx) => {
                                const beat = scene.beatId ? beatMap.get(scene.beatId) : undefined;
                                const isSelected = selectedScenes.has(scene.id);

                                return (
                                  <Tooltip key={scene.id}>
                                    <TooltipTrigger asChild>
                                      <div
                                        draggable
                                        onDragStart={() => handleSceneDragStart(scene.id, chapter.id)}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleSceneDrop(chapter.id, sceneIdx);
                                        }}
                                        onClick={(e) => {
                                          if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                            toggleSceneSelection(scene.id, e);
                                          } else {
                                            if (selectedScenes.size > 0) {
                                              clearSelection();
                                            } else {
                                              openScene(scene.id);
                                            }
                                          }
                                        }}
                                        role="treeitem"
                                        aria-label={`Scene: ${scene.title}, status: ${scene.status}${scene.pov ? `, POV: ${scene.pov}` : ""}`}
                                        className={`group flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors ${
                                          isSelected
                                            ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
                                            : "hover:bg-accent/5"
                                        }`}
                                      >
                                        <GripVertical
                                          className="h-3.5 w-3.5 text-border opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
                                          aria-hidden
                                        />
                                        <span
                                          className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[scene.status]}`}
                                          aria-hidden
                                        />
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-medium text-foreground truncate">{scene.title}</span>
                                            <Badge
                                              variant="secondary"
                                              className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_COLORS[scene.status]}`}
                                            >
                                              {scene.status}
                                            </Badge>
                                            {scene.pov && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground shrink-0"
                                              >
                                                {scene.pov.slice(0, 12)}
                                              </Badge>
                                            )}
                                            {beat && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px] px-1.5 py-0 shrink-0"
                                                style={
                                                  beat.color ? { background: beat.color + "33", color: beat.color } : {}
                                                }
                                              >
                                                {beat.title.slice(0, 14)}
                                              </Badge>
                                            )}
                                            {scene.notes && (
                                              <span
                                                className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"
                                                title="Has notes"
                                              />
                                            )}
                                            {scene.wordCount > 0 &&
                                              scene.targetWordCount &&
                                              scene.targetWordCount > 0 && (
                                                <AlertTriangle
                                                  className={`h-3 w-3 shrink-0 ${scene.wordCount < scene.targetWordCount * 0.8 ? "text-amber-400" : "text-muted-foreground/30"}`}
                                                  aria-hidden
                                                />
                                              )}
                                          </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap shrink-0">
                                          {scene.wordCount > 0 ? `${scene.wordCount}w` : "—"}
                                          {scene.targetWordCount ? `/${scene.targetWordCount}` : ""}
                                        </span>

                                        {/* Scene actions */}
                                        <div
                                          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => setMetaSceneId(metaSceneId === scene.id ? null : scene.id)}
                                            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent/10"
                                            aria-label="Scene details"
                                          >
                                            <Info className="h-3 w-3" aria-hidden />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => duplicateScene(scene.id)}
                                            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent/10"
                                            aria-label="Duplicate scene"
                                          >
                                            <Copy className="h-3 w-3" aria-hidden />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setMoveSceneInfo({
                                                sceneId: scene.id,
                                                sceneTitle: scene.title,
                                                fromChapterId: chapter.id,
                                              })
                                            }
                                            className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent/10"
                                            aria-label="Move scene to…"
                                          >
                                            <MoreHorizontal className="h-3 w-3" aria-hidden />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setDeleteTarget({
                                                type: "scene",
                                                id: scene.id,
                                                chapterId: chapter.id,
                                                label: scene.title,
                                              })
                                            }
                                            className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            aria-label="Delete scene"
                                          >
                                            <Trash2 className="h-3 w-3" aria-hidden />
                                          </button>
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    {scene.summary && (
                                      <TooltipContent side="right" className="max-w-xs text-xs">
                                        {scene.summary.slice(0, 200)}
                                        {scene.summary.length > 200 ? "…" : ""}
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                );
                              })}

                              {hasFilters && filteredScenes.length === 0 && chapter.scenes.length > 0 && (
                                <p className="px-3 py-2 text-xs text-muted-foreground italic">
                                  No scenes match the current filter.
                                </p>
                              )}

                              {/* Add Scene */}
                              <button
                                type="button"
                                onClick={() => addSceneToChapter(chapter.id)}
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
                              >
                                <Plus className="h-3 w-3" aria-hidden />
                                Add Scene
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Chapter */}
                    <button
                      type="button"
                      onClick={() => addChapterToAct(act.id)}
                      className="ml-4 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      Add Chapter
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Scene metadata mini-panel */}
        <AnimatePresence>
          {metaScene && (
            <SceneMetaPanel
              scene={metaScene.scene}
              actTitle={metaScene.actTitle}
              chapterTitle={metaScene.chapterTitle}
              beats={beats}
              onClose={() => setMetaSceneId(null)}
              onUpdate={(patch) => updateScene(metaScene.scene.id, patch)}
            />
          )}
        </AnimatePresence>

        {/* Confirm delete dialog */}
        <ConfirmDeleteDialog
          open={Boolean(deleteTarget)}
          label={deleteTarget?.label ?? ""}
          description={
            deleteTarget?.type === "act"
              ? "This will permanently delete the act and all its chapters and scenes. This cannot be undone."
              : deleteTarget?.type === "chapter"
                ? "This will permanently delete the chapter and all its scenes. This cannot be undone."
                : "This will permanently delete the scene. This cannot be undone."
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />

        {/* Move-to dialog */}
        {moveSceneInfo && (
          <MoveToDialog
            open={Boolean(moveSceneInfo)}
            sceneTitle={moveSceneInfo.sceneTitle}
            acts={activeNovel.acts}
            currentChapterId={moveSceneInfo.fromChapterId}
            onConfirm={(chapterId, idx) => {
              reorderScene(moveSceneInfo.sceneId, moveSceneInfo.fromChapterId, chapterId, idx);
              setMoveSceneInfo(null);
            }}
            onCancel={() => setMoveSceneInfo(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
