import { BookSeriesPlacementForm } from "@/components/novel/BookSeriesPlacementForm";
import { CoverImageImport } from "@/components/novel/CoverImageImport";
import { SecondaryGenreMultiSelect } from "@/components/novel/SecondaryGenreMultiSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BookAudience, BookPov, BookTense } from "@/lib/book-metadata";
import {
  BOOK_AUDIENCES,
  BOOK_POVS,
  BOOK_TENSES,
  CONTENT_WARNING_PRESETS,
  WORD_COUNT_PRESETS,
  type WordCountPresetId,
} from "@/lib/book-metadata";
import { cn } from "@/lib/utils";

export interface BookCreationAdvancedFieldsProps {
  /** Primary genre from step 1 — drives secondary genre options. */
  primaryGenre: string;
  /** When true, omits series placement (wizard step 3 already covered series in step 2). */
  hideSeriesSection?: boolean;
  userId: string | undefined;
  subtitle: string;
  setSubtitle: (v: string) => void;
  penName: string;
  setPenName: (v: string) => void;
  logline: string;
  setLogline: (v: string) => void;
  comparables: string;
  setComparables: (v: string) => void;
  secondaryGenres: string[];
  setSecondaryGenres: (v: string[]) => void;
  wordCountPreset: WordCountPresetId | "";
  setWordCountPreset: (v: WordCountPresetId | "") => void;
  seriesScope: "standalone" | "series";
  setSeriesScope: (v: "standalone" | "series") => void;
  seriesId: string;
  setSeriesId: (id: string, title?: string) => void;
  seriesPosition: string;
  setSeriesPosition: (v: string) => void;
  audience: BookAudience | "";
  setAudience: (v: BookAudience | "") => void;
  contentWarnings: string[];
  setContentWarnings: (v: string[]) => void;
  defaultPov: BookPov | "";
  setDefaultPov: (v: BookPov | "") => void;
  defaultTense: BookTense | "";
  setDefaultTense: (v: BookTense | "") => void;
  premise: string;
  setPremise: (v: string) => void;
  targetWordCount: string;
  setTargetWordCount: (v: string) => void;
  coverImageDataUrl: string;
  setCoverImageDataUrl: (v: string) => void;
  /** Optional existing Storage URL (edit dialog). */
  coverImageStorageUrl?: string;
}

export function BookCreationAdvancedFields({
  primaryGenre,
  hideSeriesSection = false,
  userId,
  subtitle,
  setSubtitle,
  penName,
  setPenName,
  logline,
  setLogline,
  comparables,
  setComparables,
  secondaryGenres,
  setSecondaryGenres,
  wordCountPreset,
  setWordCountPreset,
  seriesScope,
  setSeriesScope,
  seriesId,
  setSeriesId,
  seriesPosition,
  setSeriesPosition,
  audience,
  setAudience,
  contentWarnings,
  setContentWarnings,
  defaultPov,
  setDefaultPov,
  defaultTense,
  setDefaultTense,
  premise,
  setPremise,
  targetWordCount,
  setTargetWordCount,
  coverImageDataUrl,
  setCoverImageDataUrl,
  coverImageStorageUrl,
}: BookCreationAdvancedFieldsProps) {
  const toggleWarning = (label: string) => {
    setContentWarnings(
      contentWarnings.includes(label) ? contentWarnings.filter((w) => w !== label) : [...contentWarnings, label],
    );
  };

  const applyPreset = (id: WordCountPresetId) => {
    setWordCountPreset(id);
    const row = WORD_COUNT_PRESETS.find((p) => p.id === id);
    if (row) setTargetWordCount(String(row.words));
  };

  const activePreset =
    wordCountPreset && wordCountPreset !== "custom" ? wordCountPreset : ("" as WordCountPresetId | "");

  return (
    <div className="space-y-4 rounded-sm border border-border/80 bg-muted/30 p-3 shadow-none">
      {!hideSeriesSection && (
        <BookSeriesPlacementForm
          userId={userId}
          seriesScope={seriesScope}
          setSeriesScope={setSeriesScope}
          seriesId={seriesId}
          setSeriesId={setSeriesId}
          seriesPosition={seriesPosition}
          setSeriesPosition={setSeriesPosition}
          subtitle={subtitle}
          setSubtitle={setSubtitle}
        />
      )}

      <div>
        <label htmlFor="adv-pen-name" className="mb-1.5 block text-sm text-muted-foreground">
          Pen name (optional)
        </label>
        <Input
          id="adv-pen-name"
          value={penName}
          onChange={(e) => setPenName(e.target.value)}
          placeholder="If different from author credit"
        />
      </div>

      <div>
        <label htmlFor="adv-logline" className="mb-1.5 block text-sm text-muted-foreground">
          Logline
        </label>
        <Textarea
          id="adv-logline"
          value={logline}
          onChange={(e) => setLogline(e.target.value)}
          placeholder="One or two lines"
          rows={2}
          className="resize-y"
        />
      </div>

      <div>
        <label htmlFor="adv-comparables" className="mb-1.5 block text-sm text-muted-foreground">
          Comparables
        </label>
        <Input
          id="adv-comparables"
          value={comparables}
          onChange={(e) => setComparables(e.target.value)}
          placeholder="e.g. X meets Y"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-muted-foreground">Secondary genres</label>
        <SecondaryGenreMultiSelect
          primaryGenre={primaryGenre || "General"}
          value={secondaryGenres}
          onChange={setSecondaryGenres}
        />
      </div>

      <div>
        <label htmlFor="adv-audience" className="mb-1.5 block text-sm text-muted-foreground">
          Audience
        </label>
        <Select
          value={audience || "__none__"}
          onValueChange={(v) => setAudience(v === "__none__" ? "" : (v as BookAudience))}
        >
          <SelectTrigger id="adv-audience">
            <SelectValue placeholder="Optional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Not set</SelectItem>
            {BOOK_AUDIENCES.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="adv-default-pov" className="mb-1.5 block text-sm text-muted-foreground">
            Default POV
          </label>
          <Select
            value={defaultPov || "__none__"}
            onValueChange={(v) => setDefaultPov(v === "__none__" ? "" : (v as BookPov))}
          >
            <SelectTrigger id="adv-default-pov">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not set</SelectItem>
              {BOOK_POVS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="adv-default-tense" className="mb-1.5 block text-sm text-muted-foreground">
            Default tense
          </label>
          <Select
            value={defaultTense || "__none__"}
            onValueChange={(v) => setDefaultTense(v === "__none__" ? "" : (v as BookTense))}
          >
            <SelectTrigger id="adv-default-tense">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not set</SelectItem>
              {BOOK_TENSES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">Content warnings</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONTENT_WARNING_PRESETS.map((w) => (
            <label key={w} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={contentWarnings.includes(w)} onCheckedChange={() => toggleWarning(w)} />
              {w}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-background/50 p-3">
        <p className="text-sm font-medium text-foreground">Target length</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick a typical shape, then fine-tune the exact word goal. Industry often estimates ~250 words per page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {WORD_COUNT_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={activePreset === p.id ? "default" : "outline"}
              className={cn("h-auto flex-col gap-0.5 py-2", activePreset === p.id && "ring-2 ring-primary/30")}
              onClick={() => applyPreset(p.id)}
              title={p.comparables}
              aria-description={p.comparables}
            >
              <span>{p.label}</span>
              <span className="text-[11px] font-normal opacity-80">
                ~{p.words.toLocaleString()} words · {p.hint}
              </span>
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={!activePreset ? "secondary" : "outline"}
            className="h-auto flex-col gap-0.5 py-2"
            onClick={() => {
              setWordCountPreset("");
            }}
          >
            <span>Custom only</span>
            <span className="text-[11px] font-normal opacity-80">Type your own goal</span>
          </Button>
        </div>
        <div className="mt-3">
          <label htmlFor="adv-target-words" className="mb-1.5 block text-sm text-muted-foreground">
            Exact target (words)
          </label>
          <Input
            id="adv-target-words"
            value={targetWordCount}
            onChange={(e) => setTargetWordCount(e.target.value)}
            placeholder="e.g. 85000"
            inputMode="numeric"
            aria-describedby="adv-target-words-hint"
          />
          {activePreset ? (
            <p id="adv-target-words-hint" className="mt-1 text-xs text-muted-foreground">
              {WORD_COUNT_PRESETS.find((p) => p.id === activePreset)?.comparables} Change the number above to fine-tune
              your target.
            </p>
          ) : (
            <p id="adv-target-words-hint" className="mt-1 text-xs text-muted-foreground">
              Typical adult novel: 70k–100k words; romance often 50k–90k; epic fantasy often 100k+.
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="adv-premise" className="mb-1.5 block text-sm text-muted-foreground">
          Premise
        </label>
        <Textarea
          id="adv-premise"
          value={premise}
          onChange={(e) => setPremise(e.target.value)}
          placeholder="What happens in this story?"
          rows={2}
          className="resize-y"
        />
      </div>

      <div className="rounded-md border border-dashed border-border/80 bg-muted/20 p-3">
        <CoverImageImport value={coverImageDataUrl} onChange={setCoverImageDataUrl} storageUrl={coverImageStorageUrl} />
      </div>
    </div>
  );
}
