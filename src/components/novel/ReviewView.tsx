import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  ShieldAlert,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { invokeIdeaWebGroq } from "@/lib/idea-web/groq-editorial";
import { ReviewAnnotation, Scene } from "@/types/novel";

const ANNOTATION_ICONS = {
  note: { icon: FileText, color: "text-muted-foreground", bg: "bg-muted/50" },
  issue: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10" },
  praise: { icon: ThumbsUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  continuity: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10" },
};

const statusColors: Record<Scene["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  "in-progress": "bg-primary/20 text-primary",
  complete: "bg-emerald-500/20 text-emerald-400",
  revision: "bg-amber-500/20 text-amber-400",
};

type AnnotationTypeFilter = "all" | ReviewAnnotation["type"];
type ResolvedFilter = "all" | "open" | "resolved";

export default function ReviewView() {
  const { activeNovel, addReviewAnnotation, updateReviewAnnotation, deleteReviewAnnotation } = useNovelContext();
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  // ── Item 7: filter state ─────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<AnnotationTypeFilter>("all");
  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilter>("open");
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [scanRunning, setScanRunning] = useState(false);

  if (!activeNovel) return null;
  const allAnnotations = activeNovel.reviewAnnotations || [];

  const allScenes = activeNovel.acts.flatMap((act) =>
    act.chapters.flatMap((ch) => ch.scenes.map((s) => ({ ...s, actTitle: act.title, chTitle: ch.title }))),
  );

  const totalWords = allScenes.reduce((s, sc) => s + sc.wordCount, 0);
  const complete = allScenes.filter((s) => s.status === "complete").length;
  const openIssues = allAnnotations.filter((a) => a.type === "issue" && !a.resolved).length;

  /** Filter annotations shown in the panel (does NOT filter what scenes show) */
  const filterAnnotations = (list: ReviewAnnotation[]) =>
    list.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (resolvedFilter === "open" && a.resolved) return false;
      if (resolvedFilter === "resolved" && !a.resolved) return false;
      return true;
    });

  const toggleScene = (id: string) => {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const runContinuityScan = async () => {
    if (!activeNovel || scanRunning) return;
    setScanRunning(true);
    try {
      const codex = activeNovel.codexEntries.map((e) => ({
        name: e.name,
        type: e.type,
        description: e.description.slice(0, 300),
      }));
      const scenes = allScenes.map((s) => ({
        id: s.id,
        title: s.title,
        summary: (s.summary || "").slice(0, 400),
        characters: s.characters ?? [],
      }));
      const { text } = await invokeIdeaWebGroq("continuity_scan", [], { continuity: { codex, scenes } });
      // Parse JSON array from response
      let issues: { sceneId: string; issue: string }[] = [];
      try {
        const match = text.match(/\[[\s\S]*\]/);
        issues = match ? (JSON.parse(match[0]) as { sceneId: string; issue: string }[]) : [];
      } catch {
        issues = [];
      }
      if (issues.length === 0) {
        toast({ title: "No continuity issues found", description: "Looks consistent across all scenes." });
        return;
      }
      // Add as continuity annotations
      for (const issue of issues) {
        if (!issue.sceneId || !issue.issue) continue;
        const sceneExists = allScenes.some((s) => s.id === issue.sceneId);
        if (!sceneExists) continue;
        addReviewAnnotation(issue.sceneId, "continuity", issue.issue);
      }
      toast({
        title: `${issues.length} continuity issue${issues.length === 1 ? "" : "s"} flagged`,
        description: "Check the Continuity filter in the review panel.",
      });
    } catch (e) {
      toast({
        title: "Continuity scan failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setScanRunning(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full max-w-none p-3 sm:p-4"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <h2 className="text-2xl font-bold font-serif text-foreground">Review</h2>
            <p className="text-xs text-muted-foreground">Read, annotate, and track revision status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={scanRunning}
            onClick={() => void runContinuityScan()}
            className="flex items-center gap-1.5 rounded-sm border-2 border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
            title="AI continuity scan — flags character/location inconsistencies across scenes"
          >
            {scanRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Zap className="h-3.5 w-3.5" aria-hidden />
            )}
            {scanRunning ? "Scanning…" : "Scan"}
          </button>
          <button
            type="button"
            onClick={() => setReadingMode((v) => !v)}
            aria-pressed={readingMode}
            className={`flex items-center gap-1.5 rounded-sm border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
              readingMode
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {readingMode ? "Annotate" : "Read"}
          </button>
          {/* ── Item 7: filter toggle button ───────────────────────────────── */}
          {!readingMode && (
            <button
              type="button"
              onClick={() => setShowFilterBar((v) => !v)}
              aria-expanded={showFilterBar}
              aria-label="Toggle annotation filters"
              className={`flex items-center gap-1.5 rounded-sm border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                showFilterBar || typeFilter !== "all" || resolvedFilter !== "open"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Filter className="h-3.5 w-3.5" aria-hidden />
              Filter
              {(typeFilter !== "all" || resolvedFilter !== "open") && (
                <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                  {[typeFilter !== "all" ? 1 : 0, resolvedFilter !== "open" ? 1 : 0].reduce((a, b) => a + b)}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Item 7: filter bar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilterBar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden rounded-sm border-2 border-border/70 bg-card/60 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-4">
              {/* Type filter */}
              <fieldset className="flex items-center gap-2">
                <legend className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-2">
                  Type
                </legend>
                {(["all", "note", "issue", "praise", "continuity"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors ${
                      typeFilter === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </fieldset>
              {/* Resolved filter */}
              <fieldset className="flex items-center gap-2">
                <legend className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-2">
                  Status
                </legend>
                {(["all", "open", "resolved"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResolvedFilter(r)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors ${
                      resolvedFilter === r
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </fieldset>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading mode: clean prose view */}
      {readingMode && (
        <div className="mx-auto max-w-2xl pb-16">
          <h1 className="mb-2 font-serif text-3xl font-bold text-foreground">{activeNovel.title}</h1>
          <p className="mb-8 text-sm italic text-muted-foreground">By {activeNovel.author}</p>
          {activeNovel.acts.map((act) => (
            <div key={act.id} className="mb-12">
              <h2 className="mb-6 border-b-2 border-border pb-2 font-serif text-xl font-semibold text-foreground">
                {act.title}
              </h2>
              {act.chapters.map((ch) => (
                <div key={ch.id} className="mb-8">
                  <h3 className="mb-4 font-serif text-base font-semibold text-muted-foreground">{ch.title}</h3>
                  {ch.scenes.map((sc) => (
                    <div key={sc.id} className="mb-6">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                        {sc.title}
                      </p>
                      {sc.content ? (
                        <div className="prose-editor whitespace-pre-wrap font-serif text-base leading-relaxed text-foreground">
                          {sc.content}
                        </div>
                      ) : (
                        <p className="font-serif text-sm italic text-muted-foreground/50">[Empty scene]</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Annotation review (hidden in reading mode) */}
      {!readingMode && (
        <>
          {/* Stats strip */}
          <div className="mb-6 grid grid-cols-4 gap-3">
            {[
              { label: "Total Words", value: totalWords.toLocaleString() },
              { label: "Scenes", value: allScenes.length.toString() },
              { label: "Complete", value: `${complete}/${allScenes.length}` },
              { label: "Open Issues", value: openIssues.toString() },
            ].map((stat) => (
              <div key={stat.label} className="rounded-sm border-2 border-border/70 bg-card/80 px-4 py-3 shadow-none">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-0.5 text-xl font-bold font-mono text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Act-level progress rollup */}
          {activeNovel.acts.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Structure overview
              </p>
              {activeNovel.acts.map((act) => {
                const actScenes = act.chapters.flatMap((ch) => ch.scenes);
                const actComplete = actScenes.filter((s) => s.status === "complete").length;
                const actTotal = actScenes.length;
                const actPct = actTotal > 0 ? Math.round((actComplete / actTotal) * 100) : 0;
                const actOpenIssues = allAnnotations.filter(
                  (a) => a.type === "issue" && !a.resolved && actScenes.some((s) => s.id === a.sceneId),
                ).length;
                return (
                  <div
                    key={act.id}
                    className="flex items-center gap-3 rounded-sm border-2 border-border/60 bg-card/60 px-4 py-2.5"
                  >
                    <div className="min-w-[7rem] shrink-0">
                      <p className="truncate text-xs font-semibold text-foreground">{act.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {actComplete}/{actTotal} scene{actTotal === 1 ? "" : "s"} complete
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full border border-border/50 bg-muted/40">
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ${
                            actPct === 100 ? "bg-emerald-500" : actPct >= 50 ? "bg-amber-400" : "bg-muted-foreground/40"
                          }`}
                          style={{ width: `${actPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-9 shrink-0 text-right text-[10px] font-mono font-semibold text-muted-foreground">
                      {actPct}%
                    </span>
                    {actOpenIssues > 0 && (
                      <span className="shrink-0 rounded-sm border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
                        {actOpenIssues} issue{actOpenIssues === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Scene list */}
          <div className="space-y-2">
            {allScenes.map((scene, i) => {
              const sceneAnnotations = allAnnotations.filter((a) => a.sceneId === scene.id);
              const filteredForScene = filterAnnotations(sceneAnnotations);
              const isExpanded = expandedScenes.has(scene.id);
              // Still show scene row even if its annotations are filtered out
              const openIssueCount = sceneAnnotations.filter((a) => a.type === "issue" && !a.resolved).length;

              return (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-sm border-2 border-border/70 bg-card/80 shadow-none"
                >
                  {/* Scene header */}
                  <button
                    onClick={() => toggleScene(scene.id)}
                    className="flex w-full items-center gap-3 rounded-sm px-4 py-3 text-left transition-colors hover:bg-accent/5"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{scene.title}</span>
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[scene.status]}`}>
                          {scene.status}
                        </Badge>
                        {openIssueCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-400">
                            {openIssueCount} issue{openIssueCount > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {scene.actTitle} · {scene.chTitle}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {scene.wordCount > 0 ? `${scene.wordCount}w` : "—"}
                    </span>
                  </button>

                  {/* Expanded scene content + annotations */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t-2 border-border/40"
                      >
                        <div className="grid grid-cols-2 gap-0">
                          {/* Scene content */}
                          <div className="border-r-2 border-border/40 p-4">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                              Content Preview
                            </p>
                            {scene.content ? (
                              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-12 font-serif">
                                {scene.content}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No content written yet.</p>
                            )}
                            {scene.summary && (
                              <div className="mt-3 rounded-sm border-2 border-border/50 bg-muted/40 px-3 py-2 shadow-none">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
                                  Summary
                                </p>
                                <p className="text-xs text-muted-foreground">{scene.summary}</p>
                              </div>
                            )}
                          </div>

                          {/* Annotations panel */}
                          <div className="p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                Annotations
                                {(typeFilter !== "all" || resolvedFilter !== "open") && (
                                  <span className="ml-1.5 text-primary">(filtered)</span>
                                )}
                              </p>
                              <div className="flex gap-1">
                                {(["note", "issue", "praise"] as const).map((t) => {
                                  const { icon: Icon, color } = ANNOTATION_ICONS[t];
                                  return (
                                    <button
                                      key={t}
                                      onClick={() => addReviewAnnotation(scene.id, t)}
                                      title={`Add ${t}`}
                                      aria-label={`Add ${t} annotation`}
                                      className={`rounded p-1 hover:bg-accent/10 transition-colors ${color}`}
                                    >
                                      <Icon className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {filteredForScene.length === 0 ? (
                              <p className="text-xs text-muted-foreground/60 italic">
                                {sceneAnnotations.length > 0
                                  ? "No annotations match the current filter."
                                  : "No annotations. Add notes, issues, or praise."}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {filteredForScene.map((ann) => {
                                  const { icon: Icon, color, bg } = ANNOTATION_ICONS[ann.type];
                                  return (
                                    <div
                                      key={ann.id}
                                      className={`group relative rounded-sm border-2 border-border/40 p-2.5 shadow-none ${bg} ${ann.resolved ? "opacity-50" : ""}`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} aria-hidden />
                                        <textarea
                                          value={ann.content}
                                          onChange={(e) => updateReviewAnnotation(ann.id, { content: e.target.value })}
                                          placeholder={`Add ${ann.type}…`}
                                          rows={2}
                                          aria-label={`${ann.type} annotation`}
                                          className="flex-1 resize-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                                        />
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() => updateReviewAnnotation(ann.id, { resolved: !ann.resolved })}
                                            title={ann.resolved ? "Unresolve" : "Resolve"}
                                            aria-label={ann.resolved ? "Mark unresolved" : "Mark resolved"}
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                          >
                                            <CheckCircle2
                                              className={`h-3.5 w-3.5 ${ann.resolved ? "text-primary" : ""}`}
                                              aria-hidden
                                            />
                                          </button>
                                          <button
                                            onClick={() => deleteReviewAnnotation(ann.id)}
                                            aria-label="Delete annotation"
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                          >
                                            <Plus className="h-3.5 w-3.5 rotate-45" aria-hidden />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
