import type { ReactNode } from "react";

import { BookSeriesPicker } from "@/components/novel/BookSeriesPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface BookSeriesPlacementFormProps {
  userId: string | undefined;
  seriesScope: "standalone" | "series";
  setSeriesScope: (v: "standalone" | "series") => void;
  seriesId: string;
  setSeriesId: (id: string, title?: string) => void;
  seriesPosition: string;
  setSeriesPosition: (v: string) => void;
  subtitle: string;
  setSubtitle: (v: string) => void;
  /** Shown above the radio group (e.g. wizard copy). */
  intro?: ReactNode;
}

export function BookSeriesPlacementForm({
  userId,
  seriesScope,
  setSeriesScope,
  seriesId,
  setSeriesId,
  seriesPosition,
  setSeriesPosition,
  subtitle,
  setSubtitle,
  intro,
}: BookSeriesPlacementFormProps) {
  return (
    <div className="space-y-4">
      {intro}
      <div>
        <Label className="text-sm text-muted-foreground">Book placement</Label>
        <RadioGroup
          className="mt-2 gap-3"
          value={seriesScope}
          onValueChange={(v) => {
            const next = v as "standalone" | "series";
            setSeriesScope(next);
            if (next === "standalone") setSeriesId("");
          }}
        >
          <div className="flex items-start gap-2 rounded-md border border-border/80 bg-background/80 p-3">
            <RadioGroupItem value="standalone" id="sw-standalone" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <Label htmlFor="sw-standalone" className="cursor-pointer font-medium leading-tight">
                Standalone
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">One-off title — not grouped with other books.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-border/80 bg-background/80 p-3">
            <RadioGroupItem value="series" id="sw-series" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <Label htmlFor="sw-series" className="cursor-pointer font-medium leading-tight">
                Part of a series
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Links this project to a series for shelf grouping and ordering.
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {seriesScope === "series" && (
        <>
          <BookSeriesPicker userId={userId} value={seriesId} onChange={setSeriesId} />
          <div>
            <Label className="mb-1.5 block text-sm text-muted-foreground">Volume / book number</Label>
            <Input
              value={seriesPosition}
              onChange={(e) => setSeriesPosition(e.target.value)}
              placeholder="e.g. 2 for the second book"
              inputMode="numeric"
            />
          </div>
        </>
      )}

      <div>
        <Label className="mb-1.5 block text-sm text-muted-foreground">Subtitle (optional)</Label>
        <Input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Appears under the title on your shelf"
        />
      </div>
    </div>
  );
}
