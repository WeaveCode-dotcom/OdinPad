import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { BookOpen, Library, Plus } from "lucide-react";
import { type ChangeEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BookCreationAdvancedFields } from "@/components/novel/BookCreationAdvancedFields";
import { BookCreationSeriesStep } from "@/components/novel/BookCreationSeriesStep";
import { BookCreationStepIndicator } from "@/components/novel/BookCreationStepIndicator";
import BookEditDialog from "@/components/novel/BookEditDialog";
import DeleteBookDialog from "@/components/novel/DeleteBookDialog";
import { LibraryBookCard } from "@/components/novel/LibraryBookCard";
import { SeriesCreateDialog } from "@/components/novel/SeriesCreateDialog";
import { SeriesManageDialog } from "@/components/novel/SeriesManageDialog";
import { SortableSeriesBookCard } from "@/components/novel/SortableSeriesBookCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
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
import { parseJsonStringAsync } from "@/lib/json-parse-async";
import { downloadManuscriptDocx, downloadManuscriptMarkdown } from "@/lib/manuscript-export";
import { getNovelWordCount, sortNovelsByRecent } from "@/lib/novel-metrics";
import { assertFileSizeWithin, FILE_SIZE_LIMITS } from "@/lib/file-upload-policy";
import { parseNovelImport } from "@/lib/novel-store";
import { importDocxAsManuscript } from "@/lib/word-import";
import { ROUTES } from "@/lib/routes";
import { type BookSeriesRow, fetchBookSeriesForUser } from "@/lib/series-service";
import { STORY_FRAMEWORKS } from "@/lib/story-frameworks";
import type { Novel } from "@/types/novel";

const SOURCE = "library" as const;

export default function LibraryShelf() {
  const navigate = useNavigate();
  const { novels, addNovelWithOptions, importNovel, setActiveNovel, patchNovel } = useNovelContext();
  const { user, profile, preferences } = useAuth();

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
  const importInputRef = useRef<HTMLInputElement>(null);
  const docxImportRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editBookId, setEditBookId] = useState<string | null>(null);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [seriesManageOpen, setSeriesManageOpen] = useState(false);
  const [seriesManageRow, setSeriesManageRow] = useState<BookSeriesRow | null>(null);
  const [shelfFilter, setShelfFilter] = useState<"all" | "standalone" | "series">("all");
  const [exportMdOpen, setExportMdOpen] = useState(false);
  const [exportDocxOpen, setExportDocxOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortedNovels = useMemo(() => sortNovelsByRecent(novels), [novels]);

  useEffect(() => {
    if (!user?.id) {
      setSeriesRows([]);
      return;
    }
    void fetchBookSeriesForUser(user.id)
      .then(setSeriesRows)
      .catch(() => setSeriesRows([]));
  }, [user?.id]);

  const filteredNovels = useMemo(() => {
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

  const novelsForShelf = useMemo(() => {
    if (shelfFilter === "standalone") return filteredNovels.filter((n) => !n.seriesId);
    if (shelfFilter === "series") return filteredNovels.filter((n) => Boolean(n.seriesId));
    return filteredNovels;
  }, [filteredNovels, shelfFilter]);

  /** Group by series for shelf; standalone first; order by seriesPosition then recency. Includes empty series from Supabase when filter shows series. */
  const libraryGroups = useMemo(() => {
    const m = new Map<string | null, { label: string; items: Novel[] }>();
    for (const n of novelsForShelf) {
      const k = n.seriesId ?? null;
      if (!m.has(k)) {
        const label = k ? (n.series ?? "Series") : "Standalone";
        m.set(k, { label, items: [] });
      }
      const bucket = m.get(k);
      if (bucket) bucket.items.push(n);
    }
    if (shelfFilter !== "standalone" && user?.id) {
      for (const sr of seriesRows) {
        if (!m.has(sr.id)) {
          m.set(sr.id, { label: sr.title, items: [] });
        }
      }
    }
    for (const g of m.values()) {
      g.items.sort((a, b) => {
        const pa = a.seriesPosition ?? 99999;
        const pb = b.seriesPosition ?? 99999;
        if (pa !== pb) return pa - pb;
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      });
    }
    const entries = [...m.entries()];
    entries.sort((a, b) => {
      if (a[0] === null) return -1;
      if (b[0] === null) return 1;
      return a[1].label.localeCompare(b[1].label);
    });
    return entries;
  }, [novelsForShelf, seriesRows, shelfFilter, user?.id]);

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
    trackEvent("book_create_started", { source: SOURCE });
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
        return;
      }
    }
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

  const prefetchNovelWorkspace = useCallback(() => {
    void import("@/components/novel/NovelWorkspace");
  }, []);

  const handleImportFile: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      assertFileSizeWithin(file, FILE_SIZE_LIMITS.novelJsonBytes, "JSON backup");
      const raw = await file.text();
      const parsed = await parseJsonStringAsync(raw);
      const novel = parseNovelImport(parsed);
      if (!novel) {
        toast({
          title: "Invalid backup file",
          description: "Expected a novel JSON with id, title, and acts.",
          variant: "destructive",
        });
        return;
      }
      importNovel(novel);
      trackEvent("book_imported", {
        source: SOURCE,
        hasSeriesId: Boolean(novel.seriesId),
        hasSeriesPosition: novel.seriesPosition != null,
      });
      toast({ title: "Book imported", description: `"${novel.title}" was added to your library.` });
    } catch (e) {
      toast({
        title: "Could not read file",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      event.currentTarget.value = "";
    }
  };

  const handleDocxImport: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      assertFileSizeWithin(file, FILE_SIZE_LIMITS.wordDocxBytes, "Word document");
      const authorName = profile?.display_name?.trim() || user?.name || "Unknown Author";
      const novel = await importDocxAsManuscript(file, authorName);
      importNovel(novel);
      const sceneCount = novel.acts.flatMap((a) => a.chapters.flatMap((c) => c.scenes)).length;
      toast({
        title: "Manuscript imported",
        description: `"${novel.title}" — ${novel.acts.length} act${novel.acts.length === 1 ? "" : "s"}, ${sceneCount} scene${sceneCount === 1 ? "" : "s"}.`,
      });
    } catch (e) {
      toast({
        title: "Could not import Word file",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      event.currentTarget.value = "";
    }
  };

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
      trackEvent("book_create_failed", { source: SOURCE, reason: validation.errors[0] });
      return;
    }

    trackEvent("book_create_submitted", {
      source: SOURCE,
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
      source: SOURCE,
      frameworkId: validation.normalized.frameworkId,
      destination: postCreateDestination,
      ...bookCreateMetadataAnalytics(validation.normalized),
    });
    if (creationStartedAt) {
      trackEvent("book_create_time_ms", {
        source: SOURCE,
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

  const openBook = useCallback(
    (novel: Novel) => {
      setActiveNovel(novel.id);
      navigate("/", { replace: true });
    },
    [setActiveNovel, navigate],
  );

  const handleSeriesDragEnd = useCallback(
    (orderedItems: Novel[], event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = orderedItems.findIndex((n) => n.id === active.id);
      const newIndex = orderedItems.findIndex((n) => n.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const newOrder = arrayMove(orderedItems, oldIndex, newIndex);
      newOrder.forEach((novel, i) => {
        const pos = i + 1;
        if (novel.seriesPosition !== pos) {
          patchNovel(novel.id, { seriesPosition: pos });
        }
      });
    },
    [patchNovel],
  );

  return (
    <>
      <div
        id="library"
        className="relative space-y-4 rounded-xl border-2 border-dashed border-neutral-400 bg-card/60 p-4 pt-10 md:p-6 md:pt-12"
      >
        <span className="absolute -left-0.5 -top-3 inline-block -rotate-2 border border-border bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          Library
        </span>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-black uppercase leading-none tracking-tight text-foreground md:text-4xl">
              Shelf
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {novels.length} {novels.length === 1 ? "project" : "projects"}
              {searchQuery.trim() ? ` · ${filteredNovels.length} match` : ""}
              {shelfFilter !== "all" && !searchQuery.trim() ? ` · ${novelsForShelf.length} shown` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter…"
              className="min-w-[180px] max-w-xs border border-border bg-card shadow-sm"
            />
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <input
              ref={docxImportRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleDocxImport}
            />
            <Button
              type="button"
              variant="outline"
              className="border border-border bg-card"
              onClick={() => importInputRef.current?.click()}
            >
              Import JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border border-border bg-card"
              onClick={() => docxImportRef.current?.click()}
            >
              Import .docx
            </Button>
            {sortedNovels[0] && (
              <Button
                type="button"
                variant="outline"
                className="border border-border bg-card"
                onClick={() => setExportMdOpen(true)}
              >
                Export Markdown
              </Button>
            )}
            {sortedNovels[0] && (
              <Button
                type="button"
                variant="outline"
                className="border border-border bg-card"
                onClick={() => setExportDocxOpen(true)}
              >
                Export .docx
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="gap-2 border border-border bg-card"
              onClick={() => setSeriesDialogOpen(true)}
            >
              <Library className="h-4 w-4" />
              New series
            </Button>
            <Dialog
              open={open}
              onOpenChange={(o) => {
                setOpen(o);
                if (!o) setCreateStep(1);
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 border border-border bg-primary text-white shadow-md hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  New Book
                </Button>
              </DialogTrigger>
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
                <div className="mt-2 space-y-4">
                  {createStep === 1 && (
                    <>
                      <div>
                        <label className="mb-1.5 block text-sm text-muted-foreground">Title *</label>
                        <Input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="The Great American Novel"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm text-muted-foreground">Author / pen name</label>
                        <Input
                          value={newAuthor}
                          onChange={(e) => setNewAuthor(e.target.value)}
                          placeholder="Anonymous"
                        />
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
                            trackEvent("book_create_template_selected", { source: SOURCE, frameworkId: value });
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
                    <p className="rounded-sm border-2 border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                      {formError}
                    </p>
                  )}
                  {formWarning && !formError && (
                    <p className="rounded-sm border-2 border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-800 dark:text-amber-300">
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
                          className="w-full border border-border bg-primary text-white hover:bg-primary/90 sm:min-w-[120px]"
                          onClick={createStep === 1 ? goNextFromStep1 : goNextFromStep2}
                        >
                          Next
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="w-full border border-border bg-primary text-white hover:bg-primary/90 sm:min-w-[160px]"
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
          </div>
        </div>

        {novels.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center md:p-12">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-primary" aria-hidden />
            <h3 className="text-xl font-semibold text-foreground">Start your first project</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-muted-foreground">
              Projects hold your manuscript, scenes, and word counts in one place—so stats and exports stay accurate.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                className="gap-2 border border-border bg-primary text-white shadow-sm hover:bg-primary/90"
                onClick={() => setOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Create your first book
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border border-border bg-card"
                onClick={() => setSeriesDialogOpen(true)}
              >
                <Library className="h-4 w-4" />
                New series
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border border-border bg-card"
                onClick={() => importInputRef.current?.click()}
              >
                Import JSON
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-10">
          <AnimatePresence>
            {libraryGroups.map(([seriesKey, group]) => {
              const isStandalone = seriesKey === null;
              return (
                <section key={String(seriesKey)} className="space-y-4">
                  <header
                    className={
                      isStandalone
                        ? "border-b-2 border-neutral-900 pb-3"
                        : "rounded-lg border border-border bg-gradient-to-br from-teal-50/90 via-white to-amber-50/40 px-4 py-3 shadow-sm"
                    }
                  >
                    {isStandalone ? (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-neutral-600">
                          Standalone
                        </p>
                        <h3 className="mt-1 text-xl font-black tracking-tight text-foreground">One-off projects</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">Books that are not part of a series.</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Series</p>
                          <h3 className="mt-0.5 text-xl font-black tracking-tight text-foreground">{group.label}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {group.items.length} book{group.items.length === 1 ? "" : "s"} · ordered by volume number
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {user?.id && seriesKey && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border border-border bg-card text-xs font-bold uppercase tracking-wide"
                                onClick={() => navigate(ROUTES.series(seriesKey))}
                              >
                                Workspace
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border border-border bg-card text-xs font-bold uppercase tracking-wide"
                                onClick={() => {
                                  const row =
                                    seriesRows.find((s) => s.id === seriesKey) ??
                                    ({
                                      id: seriesKey,
                                      user_id: user.id,
                                      title: group.label,
                                      description: null,
                                      created_at: "",
                                      updated_at: "",
                                    } satisfies BookSeriesRow);
                                  setSeriesManageRow(row);
                                  setSeriesManageOpen(true);
                                }}
                              >
                                Manage
                              </Button>
                            </>
                          )}
                          <span className="rounded-md border border-border bg-card px-3 py-1 text-xs font-bold uppercase tracking-wide text-foreground/80">
                            Series shelf
                          </span>
                        </div>
                      </div>
                    )}
                  </header>
                  {group.items.length === 0 ? (
                    <div
                      className={
                        isStandalone
                          ? "grid grid-cols-1 gap-3 lg:grid-cols-2"
                          : "grid grid-cols-1 gap-3 rounded-xl border-2 border-dashed border-teal-700/25 bg-secondary/20 p-3 sm:p-4 lg:grid-cols-2"
                      }
                    >
                      <div className="col-span-full rounded-lg border-2 border-dashed border-teal-700/30 bg-card/70 px-4 py-10 text-center text-sm text-muted-foreground">
                        {isStandalone ? (
                          <>No standalone projects match this filter.</>
                        ) : (
                          <>
                            No books in this series yet.{" "}
                            <button
                              type="button"
                              className="font-semibold text-primary underline decoration-2 underline-offset-2 hover:text-teal-950"
                              onClick={() => setOpen(true)}
                            >
                              New book
                            </button>{" "}
                            → step 2 → choose this series.
                          </>
                        )}
                      </div>
                    </div>
                  ) : !isStandalone && user?.id ? (
                    <DndContext
                      id={`series-shelf-${String(seriesKey)}`}
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleSeriesDragEnd(group.items, e)}
                    >
                      <div
                        className={
                          "grid grid-cols-1 gap-3 rounded-xl border-2 border-dashed border-teal-700/25 bg-secondary/20 p-3 sm:p-4 lg:grid-cols-2"
                        }
                      >
                        <SortableContext items={group.items.map((n) => n.id)} strategy={rectSortingStrategy}>
                          {group.items.map((novel, i) => (
                            <SortableSeriesBookCard
                              key={novel.id}
                              novel={novel}
                              index={i}
                              prefetchWorkspace={prefetchNovelWorkspace}
                              onOpen={() => openBook(novel)}
                              onEdit={(e) => {
                                e.stopPropagation();
                                setEditBookId(novel.id);
                                setEditOpen(true);
                              }}
                              onDelete={(e) => {
                                e.stopPropagation();
                                setDeleteBookId(novel.id);
                              }}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    </DndContext>
                  ) : (
                    <div
                      className={
                        isStandalone
                          ? "grid grid-cols-1 gap-3 lg:grid-cols-2"
                          : "grid grid-cols-1 gap-3 rounded-xl border-2 border-dashed border-teal-700/25 bg-secondary/20 p-3 sm:p-4 lg:grid-cols-2"
                      }
                    >
                      {group.items.map((novel, i) => (
                        <LibraryBookCard
                          key={novel.id}
                          novel={novel}
                          index={i}
                          prefetchWorkspace={prefetchNovelWorkspace}
                          onOpen={() => openBook(novel)}
                          onEdit={(e) => {
                            e.stopPropagation();
                            setEditBookId(novel.id);
                            setEditOpen(true);
                          }}
                          onDelete={(e) => {
                            e.stopPropagation();
                            setDeleteBookId(novel.id);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <SeriesCreateDialog
        open={seriesDialogOpen}
        onOpenChange={setSeriesDialogOpen}
        userId={user?.id}
        analyticsSource={SOURCE}
        onSeriesCreated={setSeriesRows}
      />

      <SeriesManageDialog
        open={seriesManageOpen}
        onOpenChange={(o) => {
          setSeriesManageOpen(o);
          if (!o) setSeriesManageRow(null);
        }}
        userId={user?.id}
        series={seriesManageRow}
        novels={novels}
        analyticsSource={SOURCE}
        onSeriesUpdated={setSeriesRows}
        onSeriesDeleted={(deletedId) => {
          for (const n of novels) {
            if (n.seriesId === deletedId) {
              patchNovel(n.id, { seriesId: undefined, series: undefined, seriesPosition: undefined });
            }
          }
        }}
        onRefreshNovelSeriesTitles={(seriesId, newTitle) => {
          for (const n of novels) {
            if (n.seriesId === seriesId) {
              patchNovel(n.id, { series: newTitle });
            }
          }
        }}
      />

      <BookEditDialog
        novelId={editBookId}
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditBookId(null);
        }}
        source={SOURCE}
      />

      <DeleteBookDialog
        novelId={deleteBookId}
        open={Boolean(deleteBookId)}
        onOpenChange={(o) => {
          if (!o) setDeleteBookId(null);
        }}
        source={SOURCE}
      />

      <AlertDialog open={exportMdOpen} onOpenChange={setExportMdOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export manuscript</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {sortedNovels[0] ? (
                  <>
                    <p className="font-medium text-foreground">{sortedNovels[0].title}</p>
                    <p className="mt-2">
                      {sortedNovels[0].acts.reduce((a, act) => a + act.chapters.length, 0)} chapters ·{" "}
                      {getNovelWordCount(sortedNovels[0]).toLocaleString()} words · Markdown
                    </p>
                  </>
                ) : (
                  <p>No project selected.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const n = sortedNovels[0];
                if (n) downloadManuscriptMarkdown(n);
                setExportMdOpen(false);
              }}
            >
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={exportDocxOpen} onOpenChange={setExportDocxOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export as Word document</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                {sortedNovels[0] ? (
                  <>
                    <p>
                      Download <strong className="font-semibold text-foreground">{sortedNovels[0].title}</strong> as a
                      formatted .docx file with acts as H1, chapters as H2, and scenes as H3.
                    </p>
                  </>
                ) : (
                  <p>No project selected.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const n = sortedNovels[0];
                if (n) void downloadManuscriptDocx(n);
                setExportDocxOpen(false);
              }}
            >
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
