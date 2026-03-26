import { useEffect, useState } from "react";

import { BookCreationAdvancedFields } from "@/components/novel/BookCreationAdvancedFields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNovelContext } from "@/contexts/NovelContext";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { validateAndNormalizeBookCreation } from "@/lib/book-creation";
import {
  BOOK_GENRE_OPTIONS,
  type BookAudience,
  type BookPov,
  type BookTense,
  type WordCountPresetId,
} from "@/lib/book-metadata";
import { uploadNovelCoverFromDataUrl } from "@/lib/cover-storage";
import { isValidCoverDataUrl } from "@/lib/novel-cover";
import { type BookSeriesRow, fetchBookSeriesForUser } from "@/lib/series-service";
import { STORY_FRAMEWORKS } from "@/lib/story-frameworks";
import type { Novel } from "@/types/novel";

const STATUS_OPTIONS: NonNullable<Novel["status"]>[] = [
  "brainstorming",
  "outlining",
  "drafting",
  "editing",
  "complete",
];

interface BookEditDialogProps {
  novelId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** analytics source tag */
  source?: string;
}

export default function BookEditDialog({ novelId, open, onOpenChange, source = "dashboard" }: BookEditDialogProps) {
  const { novels, patchNovel } = useNovelContext();
  const { user } = useAuth();
  const novel = novels.find((n) => n.id === novelId) ?? null;

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [frameworkId, setFrameworkId] = useState("three-act");
  const [status, setStatus] = useState<NonNullable<Novel["status"]>>("drafting");
  const [premise, setPremise] = useState("");
  const [targetWordCount, setTargetWordCount] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [penName, setPenName] = useState("");
  const [logline, setLogline] = useState("");
  const [comparables, setComparables] = useState("");
  const [secondaryGenres, setSecondaryGenres] = useState<string[]>([]);
  const [wordCountPreset, setWordCountPreset] = useState<WordCountPresetId | "">("");
  const [seriesScope, setSeriesScope] = useState<"standalone" | "series">("standalone");
  const [seriesId, setSeriesId] = useState("");
  const [seriesPosition, setSeriesPosition] = useState("");
  const [audience, setAudience] = useState<BookAudience | "">("");
  const [contentWarnings, setContentWarnings] = useState<string[]>([]);
  const [defaultPov, setDefaultPov] = useState<BookPov | "">("");
  const [defaultTense, setDefaultTense] = useState<BookTense | "">("");
  const [coverImageDataUrl, setCoverImageDataUrl] = useState("");
  const [coverImageStorageUrl, setCoverImageStorageUrl] = useState("");
  const [seriesRows, setSeriesRows] = useState<BookSeriesRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    void fetchBookSeriesForUser(user.id)
      .then(setSeriesRows)
      .catch(() => setSeriesRows([]));
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || !novel) return;
    setTitle(novel.title);
    setAuthor(novel.author);
    setGenre(novel.genre ?? "General");
    setFrameworkId(novel.frameworkId ?? "three-act");
    setPremise(novel.premise ?? "");
    setTargetWordCount(novel.targetWordCount != null ? String(novel.targetWordCount) : "");
    setStatus(novel.status ?? "drafting");
    setSubtitle(novel.subtitle ?? "");
    setPenName(novel.penName ?? "");
    setLogline(novel.logline ?? "");
    setComparables(novel.comparables ?? "");
    setSecondaryGenres(novel.secondaryGenres ?? []);
    setWordCountPreset(novel.wordCountPreset ?? "");
    setSeriesScope(novel.seriesId ? "series" : "standalone");
    setSeriesId(novel.seriesId ?? "");
    setSeriesPosition(novel.seriesPosition != null ? String(novel.seriesPosition) : "");
    setAudience(novel.audience ?? "");
    setContentWarnings(novel.contentWarnings ?? []);
    setDefaultPov(novel.defaultPov ?? "");
    setDefaultTense(novel.defaultTense ?? "");
    setCoverImageDataUrl(novel.coverImageDataUrl ?? "");
    setCoverImageStorageUrl(novel.coverImageStorageUrl ?? "");
    setFormError(null);
  }, [open, novel]);

  const handleSave = async () => {
    if (!novelId) return;
    const seriesTitleById = new Map(seriesRows.map((s) => [s.id, s.title]));
    const validation = validateAndNormalizeBookCreation(
      {
        title,
        author,
        genre,
        frameworkId,
        premise,
        targetWordCount,
        status,
        subtitle,
        penName,
        logline,
        comparables,
        secondaryGenres,
        wordCountPreset: wordCountPreset || undefined,
        seriesMode: seriesScope,
        seriesId: seriesScope === "standalone" ? undefined : seriesId || undefined,
        seriesPosition,
        audience,
        contentWarnings,
        defaultPov,
        defaultTense,
        coverImageDataUrl,
      },
      novels.filter((n) => n.id !== novelId).map((n) => ({ title: n.title, seriesId: n.seriesId })),
      seriesTitleById,
    );
    setFormError(validation.errors[0] ?? null);
    if (validation.errors.length > 0) return;
    const n = validation.normalized;

    let coverImageStorageUrlOut: string | undefined = coverImageStorageUrl.trim() || undefined;
    let coverImageDataUrlOut: string | undefined = n.coverImageDataUrl;

    if (coverImageDataUrlOut && user?.id && isValidCoverDataUrl(coverImageDataUrlOut)) {
      try {
        coverImageStorageUrlOut = await uploadNovelCoverFromDataUrl(user.id, novelId, coverImageDataUrlOut);
        coverImageDataUrlOut = undefined;
      } catch (e) {
        toast({
          title: "Could not upload cover to cloud",
          description: e instanceof Error ? e.message : "Keeping the image on this device for now.",
          variant: "destructive",
        });
      }
    }

    if (!coverImageDataUrlOut && !coverImageStorageUrl.trim()) {
      coverImageDataUrlOut = undefined;
      coverImageStorageUrlOut = undefined;
    } else if (!coverImageDataUrlOut && coverImageStorageUrl.trim()) {
      coverImageDataUrlOut = undefined;
      coverImageStorageUrlOut = coverImageStorageUrl.trim();
    }

    patchNovel(novelId, {
      title: n.title,
      author: n.author,
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
      seriesPosition: n.seriesPosition,
      series: n.seriesId ? n.seriesTitle : undefined,
      audience: n.audience,
      contentWarnings: n.contentWarnings,
      defaultPov: n.defaultPov,
      defaultTense: n.defaultTense,
      coverImageDataUrl: coverImageDataUrlOut,
      coverImageStorageUrl: coverImageStorageUrlOut,
    });
    trackEvent("book_updated", { source, hasSeries: Boolean(n.seriesId) });
    toast({
      title: "Book updated",
      ...(validation.warnings[0] ? { description: validation.warnings[0] } : {}),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit book</DialogTitle>
          <DialogDescription>Update metadata, series placement, and cover art for this project.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Author</label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Genre *</label>
            <Select value={genre || "General"} onValueChange={setGenre}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOK_GENRE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Template *</label>
            <Select value={frameworkId} onValueChange={setFrameworkId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STORY_FRAMEWORKS.map((fw) => (
                  <SelectItem key={fw.id} value={fw.id}>
                    {fw.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as NonNullable<Novel["status"]>)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <BookCreationAdvancedFields
            primaryGenre={genre || "General"}
            userId={user?.id}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            penName={penName}
            setPenName={setPenName}
            logline={logline}
            setLogline={setLogline}
            comparables={comparables}
            setComparables={setComparables}
            secondaryGenres={secondaryGenres}
            setSecondaryGenres={setSecondaryGenres}
            wordCountPreset={wordCountPreset}
            setWordCountPreset={setWordCountPreset}
            seriesScope={seriesScope}
            setSeriesScope={setSeriesScope}
            seriesId={seriesId}
            setSeriesId={(id, _t) => setSeriesId(id)}
            seriesPosition={seriesPosition}
            setSeriesPosition={setSeriesPosition}
            audience={audience}
            setAudience={setAudience}
            contentWarnings={contentWarnings}
            setContentWarnings={setContentWarnings}
            defaultPov={defaultPov}
            setDefaultPov={setDefaultPov}
            defaultTense={defaultTense}
            setDefaultTense={setDefaultTense}
            premise={premise}
            setPremise={setPremise}
            targetWordCount={targetWordCount}
            setTargetWordCount={setTargetWordCount}
            coverImageDataUrl={coverImageDataUrl}
            setCoverImageDataUrl={(v) => {
              setCoverImageDataUrl(v);
              setCoverImageStorageUrl("");
            }}
            coverImageStorageUrl={coverImageStorageUrl}
          />

          {formError && (
            <p className="rounded-sm border-2 border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()}>
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
